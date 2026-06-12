/**
 * Vitrin meta alanları: bedrooms → room_count, bed_count, bath_count, square_meters
 *   node scripts/fix-bravo-meta-vitrin.mjs
 *
 * Havuz + ev sahibi + depozito için: scripts/backfill-bravo-holiday-home-fields.mjs
 */

import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'

const TRAVEL_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const require = createRequire(path.join(TRAVEL_ROOT, 'frontend', 'package.json'))
const mysql = require('mysql2/promise')
const pg = require('pg')

async function main() {
  const mysqlConn = await mysql.createConnection({
    host: '127.0.0.1',
    user: 'root',
    password: '',
    database: 'rezervasyonyap',
  })
  const pgClient = new pg.Client({
    host: '127.0.0.1',
    port: 5432,
    user: 'postgres',
    password: '',
    database: 'travel',
  })
  await pgClient.connect()

  const { rows } = await pgClient.query(
    `SELECT id::text, external_listing_ref FROM listings
     WHERE category_id = 1 AND external_listing_ref IS NOT NULL`,
  )

  let n = 0
  for (const row of rows) {
    const legacyId = Number(row.external_listing_ref)
    const [spaces] = await mysqlConn.query(
      `SELECT bed, bathroom, max_guests FROM bravo_spaces WHERE id = ?`,
      [legacyId],
    )
    const s = spaces[0]
    if (!s) continue
    const patch = {}
    if (s.bed != null) {
      patch.room_count = String(s.bed)
      patch.bed_count = String(s.bed)
    }
    if (s.bathroom != null) patch.bath_count = String(s.bathroom)
    if (s.max_guests != null) patch.max_guests = String(s.max_guests)
    if (s.square != null) {
      patch.square_meters = String(s.square)
      patch.square_m2 = String(s.square)
    }
    if (!Object.keys(patch).length) continue

    await pgClient.query(
      `INSERT INTO listing_attributes (listing_id, group_code, key, value_json)
       VALUES ($1::uuid, 'listing_meta', 'v1', $2::jsonb)
       ON CONFLICT (listing_id, group_code, key) DO UPDATE SET
         value_json = COALESCE(listing_attributes.value_json, '{}'::jsonb) || EXCLUDED.value_json`,
      [row.id, JSON.stringify(patch)],
    )
    n++
  }

  await mysqlConn.end()
  await pgClient.end()
  console.log(`updated meta vitrin fields for ${n} listings`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
