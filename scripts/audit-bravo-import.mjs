/**
 * Bravo aktarım eksikleri özeti
 *   node scripts/audit-bravo-import.mjs
 */

import { createRequire } from 'node:module'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const pg = createRequire(path.join(root, 'frontend/package.json'))('pg')
const c = new pg.Client({
  host: '127.0.0.1',
  port: 5432,
  user: 'postgres',
  password: '',
  database: 'travel',
})
await c.connect()

const r = await c.query(`
  SELECT
    (SELECT count(*)::int FROM listings WHERE external_listing_ref IS NOT NULL) AS imported,
    (SELECT count(*)::int FROM listings l
       WHERE l.external_listing_ref IS NOT NULL
         AND NOT EXISTS (SELECT 1 FROM listing_images li WHERE li.listing_id = l.id)) AS no_images,
    (SELECT count(*)::int FROM listings l
       WHERE l.external_listing_ref IS NOT NULL
         AND trim(coalesce(l.featured_image_url,'')) = '') AS no_featured,
    (SELECT count(*)::int FROM listings l
       WHERE l.external_listing_ref IS NOT NULL
         AND NOT EXISTS (SELECT 1 FROM listing_availability_calendar cal WHERE cal.listing_id = l.id)) AS no_calendar,
    (SELECT count(*)::int FROM listings l
       WHERE l.external_listing_ref IS NOT NULL
         AND NOT EXISTS (SELECT 1 FROM listing_price_rules pr WHERE pr.listing_id = l.id)) AS no_price_rules,
    (SELECT count(*)::int FROM listings l
       WHERE l.external_listing_ref IS NOT NULL
         AND NOT EXISTS (SELECT 1 FROM listing_translations lt WHERE lt.listing_id = l.id)) AS no_translation
`)

const missingFiles = await c.query(`
  SELECT l.slug, li.storage_key
  FROM listing_images li
  JOIN listings l ON l.id = li.listing_id
  WHERE l.external_listing_ref IS NOT NULL
  LIMIT 50000
`)

await c.end()

import { existsSync } from 'node:fs'
const pub = path.join(root, 'frontend', 'public')
let missingOnDisk = 0
const bySlug = new Map()
for (const row of missingFiles.rows) {
  const rel = String(row.storage_key || '').replace(/^\/+/, '')
  if (!rel) continue
  const fp = path.join(pub, rel)
  if (!existsSync(fp)) {
    missingOnDisk++
    bySlug.set(row.slug, (bySlug.get(row.slug) || 0) + 1)
  }
}

console.log('=== DB eksikleri ===')
console.log(r.rows[0])
console.log('=== Disk: DB kaydı var dosya yok ===')
console.log('missing files:', missingOnDisk)
if (bySlug.size) {
  const top = [...bySlug.entries()].sort((a, b) => b[1] - a[1]).slice(0, 15)
  console.log('top slugs:', top.map(([s, n]) => `${s}(${n})`).join(', '))
}
