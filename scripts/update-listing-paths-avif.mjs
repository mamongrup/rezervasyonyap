/**
 * listing_images + listings kapak URL'lerini .avif yapar — YALNIZCA yerel uploads
 * ve diskte `.avif` dosyası varken. http(s) CDN URL'lerine DOKUNMAZ (379 hatası).
 *
 * Önce: node frontend/scripts/convert-uploads-to-avif.mjs frontend/public/uploads/listings
 *
 *   node scripts/update-listing-paths-avif.mjs
 *   node scripts/update-listing-paths-avif.mjs --dry-run
 */

import { existsSync } from 'node:fs'
import { createRequire } from 'node:module'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const publicRoot = path.join(root, 'frontend', 'public')
const pg = createRequire(path.join(root, 'frontend/package.json'))('pg')
const dryRun = process.argv.includes('--dry-run')

function toAvifKey(key) {
  return String(key).replace(/\.(webp|jpe?g|png|jfif)(\?.*)?$/i, '.avif$2')
}

function avifExistsForKey(key) {
  const raw = String(key || '').trim()
  if (!raw || /^https?:\/\//i.test(raw)) return false
  if (!/uploads\/listings\//i.test(raw)) return false
  const pathOnly = toAvifKey(raw).split('?')[0].replace(/^\/+/, '')
  return existsSync(path.join(publicRoot, pathOnly))
}

function preferSlashStyle(original, next) {
  const n = String(next).replace(/^\/+/, '')
  return String(original).startsWith('/') ? `/${n}` : n
}

const c = new pg.Client({
  host: process.env.PGHOST || '127.0.0.1',
  port: Number(process.env.PGPORT || 5432),
  user: process.env.PGUSER || 'postgres',
  password: process.env.PGPASSWORD || '',
  database: process.env.PGDATABASE || 'travel',
})
await c.connect()

const imgRows = await c.query(`
  SELECT id, storage_key
  FROM listing_images
  WHERE storage_key ~* '(^|/)uploads/listings/.*\\.(webp|jpe?g|png|jfif)$'
    AND storage_key !~* '^https?://'
`)

let imgUpdated = 0
let imgSkipNoFile = 0
for (const row of imgRows.rows) {
  const key = String(row.storage_key || '').trim()
  if (!avifExistsForKey(key)) {
    imgSkipNoFile += 1
    continue
  }
  const storeAs = preferSlashStyle(key, toAvifKey(key).split('?')[0])
  if (storeAs === key) continue
  imgUpdated += 1
  if (dryRun) continue
  await c.query(
    `UPDATE listing_images SET storage_key = $2, original_mime = 'image/avif' WHERE id = $1`,
    [row.id, storeAs],
  )
}

const listRows = await c.query(`
  SELECT id, featured_image_url, thumbnail_url
  FROM listings
  WHERE (
      coalesce(featured_image_url, '') ~* '/uploads/listings/.*\\.(webp|jpe?g|png|jfif)(\\?|$)'
      OR coalesce(thumbnail_url, '') ~* '/uploads/listings/.*\\.(webp|jpe?g|png|jfif)(\\?|$)'
    )
    AND coalesce(featured_image_url, '') !~* '^https?://'
`)

let listUpdated = 0
let listSkip = 0
for (const row of listRows.rows) {
  let featured = String(row.featured_image_url || '').trim()
  let thumb = String(row.thumbnail_url || '').trim()
  let changed = false

  if (featured && /\/uploads\/listings\//i.test(featured) && !/^https?:\/\//i.test(featured)) {
    if (avifExistsForKey(featured)) {
      const next = preferSlashStyle(featured, toAvifKey(featured))
      if (next !== featured) {
        featured = next
        changed = true
      }
    } else if (/\.(webp|jpe?g|png|jfif)(\?|$)/i.test(featured)) {
      listSkip += 1
    }
  }

  if (thumb && /\/uploads\/listings\//i.test(thumb) && !/^https?:\/\//i.test(thumb)) {
    if (avifExistsForKey(thumb)) {
      const next = preferSlashStyle(thumb, toAvifKey(thumb))
      if (next !== thumb) {
        thumb = next
        changed = true
      }
    }
  }

  if (!changed) continue
  listUpdated += 1
  if (dryRun) continue
  await c.query(
    `UPDATE listings SET featured_image_url = NULLIF($2, ''), thumbnail_url = NULLIF($3, ''), updated_at = now() WHERE id = $1::uuid`,
    [row.id, featured, thumb],
  )
}

console.log(
  JSON.stringify(
    {
      dryRun,
      listing_images_updated: imgUpdated,
      listing_images_skip_missing_avif: imgSkipNoFile,
      listings_updated: listUpdated,
      listings_skip_missing_avif: listSkip,
    },
    null,
    2,
  ),
)

await c.end()
