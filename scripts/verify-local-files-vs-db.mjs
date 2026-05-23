/**
 * listing_images.storage_key dosyalarının diskte varlığını doğrular.
 */
import { createRequire } from 'node:module'
import { existsSync } from 'node:fs'
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
const { rows } = await c.query(`
  SELECT l.slug, li.storage_key
  FROM listing_images li
  JOIN listings l ON l.id = li.listing_id
  WHERE l.external_listing_ref IS NOT NULL
`)
await c.end()

const pub = path.join(root, 'frontend', 'public')
let ok = 0
let miss = 0
const missSlugs = new Set()
for (const r of rows) {
  const rel = String(r.storage_key || '').replace(/^\/+/, '')
  if (existsSync(path.join(pub, rel))) ok++
  else {
    miss++
    missSlugs.add(r.slug)
  }
}
console.log(`checked=${rows.length} ok=${ok} missing=${miss}`)
if (missSlugs.size) console.log('slugs:', [...missSlugs].slice(0, 20).join(', '))
process.exit(miss > 0 ? 1 : 0)
