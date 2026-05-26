/**
 * Wtatil tur görselleri → yerel AVIF (public/uploads/listings/wtatil/{slug}/)
 *
 *   node scripts/import-wtatil-images.mjs --dry-run --limit 5
 *   node scripts/import-wtatil-images.mjs
 *   node scripts/import-wtatil-images.mjs --skip-existing
 *
 * Ortam: AVIF_QUALITY=90 (varsayılan), MAX_WIDTH=1600, PG*
 */

import { existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'
import {
  avifFileName,
  downloadAndSaveAvif,
  filterUrlsForDownload,
  isExternalImageKey,
  isLocalAvifKey,
} from './lib/wtatil-image-download.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const TRAVEL_ROOT = path.resolve(__dirname, '..')
const UPLOADS_ROOT = path.join(TRAVEL_ROOT, 'frontend', 'public', 'uploads', 'listings', 'wtatil')
const require = createRequire(path.join(TRAVEL_ROOT, 'frontend', 'package.json'))
const pg = require('pg')

const args = new Set(process.argv.slice(2))
const DRY_RUN = args.has('--dry-run')
const SKIP_EXISTING = args.has('--skip-existing')
const limitIdx = process.argv.indexOf('--limit')
const LIMIT = limitIdx >= 0 ? Number(process.argv[limitIdx + 1]) : 0

const stats = {
  listings: 0,
  imagesOk: 0,
  imagesSkip: 0,
  imagesFail: 0,
  bytesAvif: 0,
}

async function main() {
  const pgClient = new pg.Client({
    host: process.env.PGHOST || '127.0.0.1',
    port: Number(process.env.PGPORT || 5432),
    user: process.env.PGUSER || 'postgres',
    password: process.env.PGPASSWORD || '',
    database: process.env.PGDATABASE || 'travel',
  })
  await pgClient.connect()

  const { rows } = await pgClient.query(
    `SELECT l.id::text AS listing_id, l.slug,
            li.id::text AS image_id, li.sort_order, li.storage_key
     FROM listings l
     JOIN listing_images li ON li.listing_id = l.id
     WHERE l.external_provider_code = 'wtatil'
     ORDER BY l.slug, li.sort_order, li.created_at`,
  )

  const byListing = new Map()
  for (const row of rows) {
    if (!byListing.has(row.listing_id)) {
      byListing.set(row.listing_id, { slug: row.slug, images: [] })
    }
    byListing.get(row.listing_id).images.push(row)
  }

  let listingKeys = [...byListing.keys()]
  if (LIMIT > 0) listingKeys = listingKeys.slice(0, LIMIT)

  console.log(`Wtatil AVIF import — ${listingKeys.length} ilan, dry-run=${DRY_RUN}`)

  for (let li = 0; li < listingKeys.length; li++) {
    const listingId = listingKeys[li]
    const { slug, images } = byListing.get(listingId)
    const toFetch = filterUrlsForDownload(images)
    const alreadyLocal = images.filter((r) => isLocalAvifKey(r.storage_key))

    if (!toFetch.length && alreadyLocal.length === images.length) {
      stats.imagesSkip += images.length
      continue
    }

    process.stdout.write(`[${li + 1}/${listingKeys.length}] ${slug} … `)
    const newKeys = []
    let ok = 0
    let fail = 0

    for (const row of images) {
      if (isLocalAvifKey(row.storage_key)) {
        newKeys.push({ imageId: row.image_id, sort: row.sort_order, storageKey: row.storage_key })
        stats.imagesSkip++
        continue
      }
      if (!isExternalImageKey(row.storage_key)) {
        newKeys.push({ imageId: row.image_id, sort: row.sort_order, storageKey: row.storage_key })
        continue
      }
      if (!toFetch.some((t) => t.image_id === row.image_id)) {
        continue
      }

      const fileName = avifFileName(row.sort_order, row.storage_key)
      const destAbs = path.join(UPLOADS_ROOT, slug, fileName)
      const storageKey = `uploads/listings/wtatil/${slug}/${fileName}`

      if (SKIP_EXISTING && !DRY_RUN && existsSync(destAbs)) {
        newKeys.push({ imageId: row.image_id, sort: row.sort_order, storageKey })
        stats.imagesSkip++
        continue
      }

      try {
        const res = await downloadAndSaveAvif(row.storage_key, destAbs, { dryRun: DRY_RUN })
        if (res.ok) {
          newKeys.push({ imageId: row.image_id, sort: row.sort_order, storageKey })
          ok++
          stats.imagesOk++
          stats.bytesAvif += res.bytes || 0
        }
      } catch (e) {
        fail++
        stats.imagesFail++
        console.warn(`\n  [fail] ${slug} sort=${row.sort_order}: ${e.message}`)
      }
    }

    newKeys.sort((a, b) => a.sort - b.sort)

    if (!DRY_RUN && newKeys.length) {
      for (const nk of newKeys) {
        await pgClient.query(
          `UPDATE listing_images SET storage_key = $2, original_mime = 'image/avif' WHERE id = $1::uuid`,
          [nk.imageId, nk.storageKey],
        )
      }
      const hero = newKeys[0]?.storageKey
      if (hero) {
        const heroUrl = `/${hero}`
        await pgClient.query(
          `UPDATE listings SET featured_image_url = $2, thumbnail_url = $2, updated_at = now() WHERE id = $1::uuid`,
          [listingId, heroUrl],
        )
      }
      await pgClient.query(
        `DELETE FROM listing_images li
         USING listings l
         WHERE li.listing_id = l.id AND l.id = $1::uuid
           AND li.storage_key LIKE 'http%'`,
        [listingId],
      )
    }

    stats.listings++
    console.log(`${ok} avif, ${fail} fail, ${newKeys.length} total`)
  }

  await pgClient.end()
  console.log(
    `\nBitti: ${stats.listings} ilan, ${stats.imagesOk} yeni avif, ${stats.imagesSkip} atlandı, ${stats.imagesFail} hata, ${(stats.bytesAvif / 1024 / 1024).toFixed(1)} MB`,
  )
}

main().catch((e) => {
  console.error(e.message || e)
  process.exit(1)
})
