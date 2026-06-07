/**
 * Görseli olmayan Bravo ilanları için yalnızca galeri indirme.
 *   node scripts/import-bravo-images-only.mjs
 */

import { existsSync } from 'node:fs'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import https from 'node:https'
import http from 'node:http'
import { createRequire } from 'node:module'
import { mediaUrlCandidates } from './lib/bravo-media.mjs'
import { listingStorageKey, listingUploadDir } from './lib/listing-upload-path.mjs'

const TRAVEL_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const require = createRequire(path.join(TRAVEL_ROOT, 'frontend', 'package.json'))
const mysql = require('mysql2/promise')
const pg = require('pg')

const UPLOADS_ROOT = path.join(TRAVEL_ROOT, 'frontend', 'public', 'uploads', 'listings')

function fileNameFromMedia(row) {
  const fp = String(row.file_path || row.file_name || 'img').trim().replace(/\\/g, '/')
  const base = path.posix.basename(fp)
  if (base) return base.replace(/[^a-zA-Z0-9._-]+/g, '-')
  const ext = (row.file_extension || 'webp').replace(/^\./, '') || 'webp'
  return `${(row.file_name || 'img').replace(/[^a-zA-Z0-9._-]+/g, '-')}.${ext}`
}

function fetchBuffer(url) {
  return new Promise((resolve, reject) => {
    const lib = url.startsWith('https') ? https : http
    lib
      .get(url, { timeout: 60000, headers: { 'User-Agent': 'TravelImport/1.0' } }, (res) => {
        if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          res.resume()
          fetchBuffer(res.headers.location).then(resolve, reject)
          return
        }
        if (res.statusCode !== 200) {
          res.resume()
          reject(new Error(`HTTP ${res.statusCode}`))
          return
        }
        const chunks = []
        res.on('data', (c) => chunks.push(c))
        res.on('end', () => resolve(Buffer.concat(chunks)))
      })
      .on('error', reject)
  })
}

async function loadMediaMap(mysql, ids) {
  const map = new Map()
  const uniq = [...new Set(ids.filter(Boolean))]
  for (let i = 0; i < uniq.length; i += 500) {
    const chunk = uniq.slice(i, i + 500)
    const [rows] = await mysql.query(
      `SELECT id, file_name, file_path, file_extension FROM media_files WHERE id IN (${chunk.map(() => '?').join(',')})`,
      chunk,
    )
    for (const r of rows) map.set(Number(r.id), r)
  }
  return map
}

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

  const { rows: targets } = await pgClient.query(
    `SELECT l.id::text, l.slug, l.external_listing_ref
     FROM listings l
     WHERE l.category_id = 1
       AND l.external_listing_ref IS NOT NULL
       AND NOT EXISTS (SELECT 1 FROM listing_images li WHERE li.listing_id = l.id)
     ORDER BY l.external_listing_ref::int`,
  )

  console.log('listings without images:', targets.length)

  for (const row of targets) {
    const legacyId = Number(row.external_listing_ref)
    const [spaces] = await mysqlConn.query(
      `SELECT gallery, image_id, banner_image_id FROM bravo_spaces WHERE id = ?`,
      [legacyId],
    )
    const space = spaces[0]
    if (!space) continue

    const galleryIds = String(space.gallery || '')
      .split(',')
      .map((x) => Number(x.trim()))
      .filter(Boolean)
    const mediaMap = await loadMediaMap(mysqlConn, [
      space.image_id,
      space.banner_image_id,
      ...galleryIds,
    ])

    const orderedIds = []
    const seen = new Set()
    const push = (id) => {
      const n = Number(id)
      if (!n || seen.has(n)) return
      seen.add(n)
      orderedIds.push(n)
    }
    push(space.image_id)
    push(space.banner_image_id)
    for (const id of galleryIds) push(id)

    const storageRows = []
    let sort = 0
    for (const mid of orderedIds) {
      const m = mediaMap.get(mid)
      const urls = mediaUrlCandidates(m)
      if (!urls.length) continue
      const fileName = fileNameFromMedia(m)
      const destPath = path.join(listingUploadDir(UPLOADS_ROOT, 'holiday_home', row.slug), fileName)
      const storageKey = listingStorageKey('holiday_home', row.slug, fileName)
      try {
        if (!existsSync(destPath)) {
          await mkdir(path.dirname(destPath), { recursive: true })
          let buf = null
          for (const url of urls) {
            try {
              buf = await fetchBuffer(url)
              break
            } catch {
              /* try next */
            }
          }
          if (!buf) continue
          await writeFile(destPath, buf)
        }
        storageRows.push({ storageKey, sort })
        sort++
      } catch {
        /* skip */
      }
    }

    if (!storageRows.length) {
      console.log('skip no files', row.slug)
      continue
    }

    await pgClient.query(`DELETE FROM listing_images WHERE listing_id = $1::uuid`, [row.id])
    for (const sr of storageRows) {
      await pgClient.query(
        `INSERT INTO listing_images (listing_id, sort_order, storage_key, original_mime)
         VALUES ($1::uuid, $2, $3, 'image/jpeg')`,
        [row.id, sr.sort, sr.storageKey],
      )
    }
    const hero = `/${storageRows[0].storageKey}`
    await pgClient.query(
      `UPDATE listings SET featured_image_url = $2, thumbnail_url = $2, updated_at = now() WHERE id = $1::uuid`,
      [row.id, hero],
    )
    console.log('OK', row.slug, storageRows.length, 'images')
  }

  await mysqlConn.end()
  await pgClient.end()
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
