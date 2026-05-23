import { createRequire } from 'node:module'
import { existsSync, readdirSync, statSync } from 'node:fs'
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
const q = await c.query(`
  SELECT
    (SELECT count(*)::int FROM listings l WHERE l.external_listing_ref IS NOT NULL) AS imported,
    (SELECT count(*)::int FROM listing_images li
       JOIN listings l ON l.id = li.listing_id WHERE l.external_listing_ref IS NOT NULL) AS img_rows,
    (SELECT count(*)::int FROM listings l
       WHERE l.external_listing_ref IS NOT NULL AND trim(coalesce(l.featured_image_url,'')) <> '') AS with_featured,
    (SELECT count(*)::int FROM listings l
       WHERE l.external_listing_ref IS NOT NULL
         AND NOT EXISTS (SELECT 1 FROM listing_images li WHERE li.listing_id = l.id)) AS no_img_rows
`)
console.log('DB:', q.rows[0])

const up = path.join(root, 'frontend', 'public', 'uploads', 'listings')
let dirs = 0
let files = 0
let bytes = 0
if (existsSync(up)) {
  for (const slug of readdirSync(up)) {
    const p = path.join(up, slug)
    try {
      if (!statSync(p).isDirectory()) continue
      dirs++
      for (const f of readdirSync(p)) {
        const fp = path.join(p, f)
        if (statSync(fp).isFile()) {
          files++
          bytes += statSync(fp).size
        }
      }
    } catch {
      /* skip */
    }
  }
}
console.log('Disk:', {
  path: up,
  slugFolders: dirs,
  imageFiles: files,
  sizeGB: (bytes / 1e9).toFixed(2),
})
await c.end()
