/**
 * Wtatil snapshot (reserwation.com / tour API galeri URL) → yerel AVIF.
 * Gezinomi import sonrası kalan turlar için — DB'deki `listing_attributes` wtatil/snapshot.
 *
 *   node scripts/import-wtatil-snapshot-images.mjs --dry-run --limit 5
 *   node scripts/import-wtatil-snapshot-images.mjs --missing-local-files
 *   node scripts/import-wtatil-snapshot-images.mjs --skip-gezinomi-imported
 *
 * Ortam: PG*, AVIF_QUALITY, MAX_WIDTH
 */

import { existsSync } from 'node:fs'
import path from 'node:path'
import { avifFileName, downloadAndSaveAvif, isWtatilThumbnailUrl } from './lib/wtatil-image-download.mjs'
import { imageUrlsFromWtatilTour } from './lib/wtatil-listing-db.mjs'
import { listingNeedsLocalImages, WTATIL_UPLOADS_ROOT } from './lib/tour-upload-path.mjs'
import { createPgClient } from './lib/pg-client.mjs'

const args = new Set(process.argv.slice(2))
const DRY_RUN = args.has('--dry-run')
const SKIP_EXISTING = args.has('--skip-existing')
const MISSING_LOCAL = args.has('--missing-local-files')
const SKIP_GEIZINOMI = args.has('--skip-gezinomi-imported')
const limitIdx = process.argv.indexOf('--limit')
const LIMIT = limitIdx >= 0 ? Number(process.argv[limitIdx + 1]) : 0
const slugIdx = process.argv.indexOf('--slug')
const SLUG_FILTER = slugIdx >= 0 ? process.argv[slugIdx + 1] : ''

const stats = {
  listings: 0,
  imported: 0,
  noSnapshot: 0,
  noUrls: 0,
  imagesOk: 0,
  imagesFail: 0,
  bytesAvif: 0,
}

async function hasGezinomiImport(pgClient, listingId) {
  const { rows } = await pgClient.query(
    `SELECT 1 FROM listing_attributes
     WHERE listing_id = $1::uuid AND group_code = 'gezinomi' AND key = 'gallery_imported_at'
     LIMIT 1`,
    [listingId],
  )
  return rows.length > 0
}

async function loadSnapshot(pgClient, listingId) {
  const { rows } = await pgClient.query(
    `SELECT value_json::text AS raw FROM listing_attributes
     WHERE listing_id = $1::uuid AND group_code = 'wtatil' AND key = 'snapshot'
     LIMIT 1`,
    [listingId],
  )
  if (!rows[0]?.raw) return null
  try {
    const parsed = JSON.parse(rows[0].raw)
    return parsed.catalog || parsed
  } catch {
    return null
  }
}

async function replaceListingImages(pgClient, listingId, slug, sourceUrls, { dryRun }) {
  const urls = sourceUrls.filter((u) => u && !isWtatilThumbnailUrl(u))
  const thumbs = sourceUrls.filter((u) => u && isWtatilThumbnailUrl(u))
  const ordered = [...urls, ...thumbs]
  if (!ordered.length) return 0

  const saved = []
  for (let i = 0; i < ordered.length; i++) {
    const sourceUrl = ordered[i]
    const fileName = avifFileName(i, sourceUrl)
    const destAbs = path.join(WTATIL_UPLOADS_ROOT, slug, fileName)
    const storageKey = `uploads/listings/wtatil/${slug}/${fileName}`

    if (SKIP_EXISTING && !dryRun && existsSync(destAbs)) {
      saved.push({ sort: i, storageKey })
      continue
    }

    try {
      const res = await downloadAndSaveAvif(sourceUrl, destAbs, { dryRun })
      if (res.ok) {
        saved.push({ sort: i, storageKey })
        stats.imagesOk++
        stats.bytesAvif += res.bytes || 0
      }
    } catch (e) {
      stats.imagesFail++
      console.warn(`    [fail] img ${i + 1}: ${e.message}`)
    }
  }

  if (dryRun || !saved.length) return saved.length

  await pgClient.query(`DELETE FROM listing_images WHERE listing_id = $1::uuid`, [listingId])
  for (const row of saved) {
    await pgClient.query(
      `INSERT INTO listing_images (listing_id, sort_order, storage_key, original_mime)
       VALUES ($1::uuid, $2, $3, 'image/avif')`,
      [listingId, row.sort, row.storageKey],
    )
  }

  const hero = saved[0]?.storageKey
  if (hero) {
    const heroUrl = `/${hero}`
    await pgClient.query(
      `UPDATE listings SET featured_image_url = $2, thumbnail_url = $2, updated_at = now() WHERE id = $1::uuid`,
      [listingId, heroUrl],
    )
  }

  return saved.length
}

async function loadListingRows(pgClient) {
  let sql = `
    SELECT l.id::text AS listing_id, l.slug,
           (SELECT count(*)::int FROM listing_images li WHERE li.listing_id = l.id) AS image_count
    FROM listings l
    WHERE l.external_provider_code = 'wtatil'
  `
  const params = []
  if (SLUG_FILTER) {
    params.push(SLUG_FILTER)
    sql += ` AND l.slug = $${params.length}`
  }
  sql += ` ORDER BY l.slug`
  const { rows } = await pgClient.query(sql, params)
  return rows
}

async function main() {
  const pgClient = createPgClient()
  await pgClient.connect()

  let listings = await loadListingRows(pgClient)

  if (MISSING_LOCAL) {
    const filtered = []
    for (const row of listings) {
      if (await listingNeedsLocalImages(pgClient, row.listing_id)) filtered.push(row)
    }
    listings = filtered
  }

  if (SKIP_GEIZINOMI) {
    const filtered = []
    for (const row of listings) {
      if (!(await hasGezinomiImport(pgClient, row.listing_id))) filtered.push(row)
    }
    listings = filtered
  }

  if (LIMIT > 0) listings = listings.slice(0, LIMIT)

  console.log(
    `Wtatil snapshot (reserwation.com) → AVIF — ${listings.length} ilan, dry-run=${DRY_RUN}`,
  )

  for (let i = 0; i < listings.length; i++) {
    const row = listings[i]
    stats.listings++
    process.stdout.write(`[${i + 1}/${listings.length}] ${row.slug} … `)

    const catalog = await loadSnapshot(pgClient, row.listing_id)
    if (!catalog) {
      stats.noSnapshot++
      console.log('snapshot yok')
      continue
    }

    const urls = imageUrlsFromWtatilTour(catalog)
    if (!urls.length) {
      stats.noUrls++
      console.log('url yok')
      continue
    }

    if (DRY_RUN) {
      console.log(`dry-run ${urls.length} url`)
      continue
    }

    const n = await replaceListingImages(pgClient, row.listing_id, row.slug, urls, { dryRun: false })
    if (n > 0) stats.imported++
    console.log(`${n} avif`)
  }

  await pgClient.end()
  console.log(
    `\nBitti: ${stats.listings} ilan, ${stats.imported} import, ` +
      `${stats.noSnapshot} snapshot yok, ${stats.noUrls} url yok, ` +
      `${stats.imagesOk} avif, ${stats.imagesFail} hata, ${(stats.bytesAvif / 1024 / 1024).toFixed(1)} MB`,
  )
}

main().catch((e) => {
  console.error(e.message || e)
  process.exit(1)
})
