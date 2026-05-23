/**
 * listing_images + listings kapak URL'lerini .avif uzantısına günceller.
 * Önce: node frontend/scripts/convert-uploads-to-avif.mjs (listings klasörü)
 *
 *   node scripts/update-listing-paths-avif.mjs
 *   node scripts/update-listing-paths-avif.mjs --dry-run
 */

import { createRequire } from 'node:module'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const pg = createRequire(path.join(root, 'frontend/package.json'))('pg')
const dryRun = process.argv.includes('--dry-run')

const c = new pg.Client({
  host: '127.0.0.1',
  port: 5432,
  user: 'postgres',
  password: '',
  database: 'travel',
})
await c.connect()

if (!dryRun) {
  const img = await c.query(`
    UPDATE listing_images li
    SET storage_key = regexp_replace(li.storage_key, '\\.(webp|jpe?g|png|jfif)$', '.avif', 'i'),
        original_mime = 'image/avif'
    WHERE li.storage_key ~* '\\.(webp|jpe?g|png|jfif)$'
    RETURNING li.id
  `)
  const lst = await c.query(`
    UPDATE listings l
    SET featured_image_url = regexp_replace(
          coalesce(l.featured_image_url, ''),
          '\\.(webp|jpe?g|png|jfif)(\\?.*)?$',
          '.avif\\2',
          'i'
        ),
        thumbnail_url = regexp_replace(
          coalesce(l.thumbnail_url, ''),
          '\\.(webp|jpe?g|png|jfif)(\\?.*)?$',
          '.avif\\2',
          'i'
        ),
        updated_at = now()
    WHERE l.external_listing_ref IS NOT NULL
      AND (
        coalesce(l.featured_image_url, '') ~* '\\.(webp|jpe?g|png|jfif)(\\?.*)?$'
        OR coalesce(l.thumbnail_url, '') ~* '\\.(webp|jpe?g|png|jfif)(\\?.*)?$'
      )
    RETURNING l.id
  `)
  console.log('listing_images updated:', img.rowCount)
  console.log('listings urls updated:', lst.rowCount)
} else {
  const preview = await c.query(`
    SELECT
      (SELECT count(*)::int FROM listing_images WHERE storage_key ~* '\\.(webp|jpe?g|png|jfif)$') AS img_to_fix,
      (SELECT count(*)::int FROM listing_images WHERE storage_key ~* '\\.avif$') AS img_avif,
      (SELECT count(*)::int FROM listings WHERE external_listing_ref IS NOT NULL
         AND (featured_image_url ~* '\\.(webp|jpe?g|png|jfif)' OR thumbnail_url ~* '\\.(webp|jpe?g|png|jfif)')) AS listings_to_fix
  `)
  console.log('dry-run:', preview.rows[0])
}

await c.end()
