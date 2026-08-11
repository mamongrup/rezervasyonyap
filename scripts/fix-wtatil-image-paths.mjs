import { createPgClient } from './lib/pg-client.mjs'
import { remapStorageKey, remapPublicUploadUrl } from './lib/listing-upload-path.mjs'

async function main() {
  const pg = createPgClient()
  await pg.connect()

  const imgRes = await pg.query(
    `SELECT li.id::text, li.storage_key, l.slug
     FROM listing_images li
     JOIN listings l ON l.id = li.listing_id
     WHERE l.external_provider_code = 'wtatil'
       AND li.storage_key LIKE 'uploads/listings/turlar/%'`,
  )
  console.log('Images needing path remap to include /ilanlar/:', imgRes.rows.length)

  if (imgRes.rows.length > 0) {
    for (const row of imgRes.rows) {
      const newKey = remapStorageKey(row.storage_key, 'tour', row.slug)
      await pg.query('UPDATE listing_images SET storage_key = $2 WHERE id = $1::uuid', [row.id, newKey])
    }
    console.log('Remapped', imgRes.rows.length, 'listing image paths.')
  }

  const listRes = await pg.query(
    `SELECT id::text, slug, featured_image_url, thumbnail_url
     FROM listings
     WHERE external_provider_code = 'wtatil'
       AND (featured_image_url LIKE '%/uploads/listings/turlar/%' OR thumbnail_url LIKE '%/uploads/listings/turlar/%')`,
  )
  console.log('Listings needing cover URL remap:', listRes.rows.length)
  if (listRes.rows.length > 0) {
    for (const row of listRes.rows) {
      const newFeat = remapPublicUploadUrl(row.featured_image_url, 'tour', row.slug)
      const newThumb = remapPublicUploadUrl(row.thumbnail_url, 'tour', row.slug)
      await pg.query('UPDATE listings SET featured_image_url = $2, thumbnail_url = $3 WHERE id = $1::uuid', [
        row.id,
        newFeat,
        newThumb,
      ])
    }
    console.log('Remapped', listRes.rows.length, 'listing cover paths.')
  }

  await pg.end()
}

main().catch(console.error)
