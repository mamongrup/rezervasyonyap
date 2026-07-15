#!/usr/bin/env node
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'
import { mysqlConfigFromArgv } from './lib/bravo-mysql-config.mjs'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const require = createRequire(path.join(root, 'frontend', 'package.json'))
const mysql = require('mysql2/promise')
const output = path.join(root, 'scripts', 'data', 'bravo-id-collision-repair.json')

function sanitizeSourceRow(row) {
  const copy = { ...row }
  delete copy.author_id
  delete copy.create_user
  delete copy.update_user
  copy.ical_import_url = copy.ical_import_url ? 'bundle-redacted' : ''
  return copy
}

const connection = await mysql.createConnection(mysqlConfigFromArgv())
try {
  const [events] = await connection.query(`SELECT e.* FROM bravo_events e
    WHERE e.deleted_at IS NULL AND EXISTS (
      SELECT 1 FROM bravo_spaces s
      WHERE s.id = e.id AND s.deleted_at IS NULL AND s.status = 'publish'
    ) ORDER BY e.id`)
  const [spaces] = await connection.query(`SELECT s.* FROM bravo_spaces s
    WHERE s.deleted_at IS NULL AND s.status = 'publish' AND EXISTS (
      SELECT 1 FROM bravo_events e WHERE e.id = s.id AND e.deleted_at IS NULL
    ) ORDER BY s.id`)

  const mediaIds = new Set()
  for (const row of [...events, ...spaces]) {
    if (row.image_id) mediaIds.add(Number(row.image_id))
    if (row.banner_image_id) mediaIds.add(Number(row.banner_image_id))
    for (const raw of String(row.gallery ?? '').split(',')) {
      if (Number(raw.trim())) mediaIds.add(Number(raw.trim()))
    }
  }
  const ids = [...mediaIds]
  const media = []
  for (let i = 0; i < ids.length; i += 500) {
    const chunk = ids.slice(i, i + 500)
    const [rows] = await connection.query(
      `SELECT id, file_name, file_path, file_extension FROM media_files WHERE id IN (${chunk.map(() => '?').join(',')})`,
      chunk,
    )
    media.push(...rows)
  }

  const locationIds = [...new Set([...events, ...spaces].map((row) => Number(row.location_id)).filter(Boolean))]
  const locations = []
  if (locationIds.length) {
    const [rows] = await connection.query(
      `SELECT id, name FROM bravo_locations WHERE id IN (${locationIds.map(() => '?').join(',')})`,
      locationIds,
    )
    locations.push(...rows)
  }

  const termsBySpace = {}
  const datesBySpace = {}
  for (const space of spaces) {
    const [terms] = await connection.query(
      `SELECT t.attr_id, t.slug, t.name FROM bravo_space_term st
       JOIN bravo_terms t ON t.id = st.term_id WHERE st.target_id = ?`,
      [space.id],
    )
    termsBySpace[String(space.id)] = terms
    const [dates] = await connection.query(
      `SELECT DATE(start_date) AS day, active, price FROM bravo_space_dates
       WHERE target_id = ? AND start_date >= DATE_FORMAT(CURRENT_DATE(), '%Y-%m-01')
       ORDER BY start_date`,
      [space.id],
    )
    datesBySpace[String(space.id)] = dates
  }

  const bundle = {
    version: 1,
    generatedAt: new Date().toISOString(),
    source: 'local Bravo MySQL; production repair uses PostgreSQL only',
    events: events.map(sanitizeSourceRow),
    spaces: spaces.map(sanitizeSourceRow),
    media,
    locations,
    termsBySpace,
    datesBySpace,
  }
  await mkdir(path.dirname(output), { recursive: true })
  await writeFile(output, `${JSON.stringify(bundle)}\n`, 'utf8')
  console.log(`Bundle yazildi: ${output}`)
  console.log({ events: events.length, spaces: spaces.length, media: media.length, dates: Object.values(datesBySpace).reduce((n, rows) => n + rows.length, 0) })
} finally {
  await connection.end()
}
