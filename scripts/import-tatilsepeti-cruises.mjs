/**
 * Tatilsepeti gemi/cruise ilan import (scrape)
 *
 *   node scripts/import-tatilsepeti-cruises.mjs --dry-run --limit 3
 *   node scripts/import-tatilsepeti-cruises.mjs --published --only-missing --limit 10
 *   node scripts/import-tatilsepeti-cruises.mjs --published --only-missing
 *
 * Ortam: PG*, TATILSEPETI_DELAY_MS=500, TATILSEPETI_CRUISE_STATUS=published|draft
 */

import { existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { fetchAllTatilsepetiCatalog, fetchTourDetail } from './lib/tatilsepeti-cruise-api.mjs'
import {
  findListingByTatilsepetiRef,
  resolveTatilsepetiImportContext,
  upsertTatilsepetiCruiseListing,
} from './lib/tatilsepeti-listing-db.mjs'
import { avifFileName, downloadAndSaveAvif } from './lib/wtatil-image-download.mjs'
import { listingUploadDir as uploadDir, listingStorageKey as storageKey } from './lib/listing-upload-path.mjs'
import { createPgClient } from './lib/pg-client.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const UPLOADS_ROOT = path.join(__dirname, '..', 'frontend', 'public', 'uploads', 'listings')

const args = new Set(process.argv.slice(2))
const DRY_RUN = args.has('--dry-run')
const WITH_IMAGES = args.has('--with-images') || (!args.has('--no-images') && !DRY_RUN)
const PUBLISHED = args.has('--published')
const ONLY_MISSING = args.has('--only-missing') || !args.has('--all')
const limitIdx = process.argv.indexOf('--limit')
const LIMIT = limitIdx >= 0 ? Number(process.argv[limitIdx + 1]) : 0
const DELAY_MS = Number(process.env.TATILSEPETI_DELAY_MS || 500)
const STATUS =
  PUBLISHED || String(process.env.TATILSEPETI_CRUISE_STATUS || 'draft').toLowerCase() === 'published'
    ? 'published'
    : 'draft'

const stats = { catalog: 0, work: 0, created: 0, updated: 0, skipped: 0, errors: 0, imagesOk: 0, imagesFail: 0 }

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms))
}

async function saveGallery(pgClient, listingId, slug, urls) {
  const saved = []
  const dir = uploadDir(UPLOADS_ROOT, 'cruise', slug)
  for (let i = 0; i < Math.min(urls.length, 12); i++) {
    const sourceUrl = urls[i]
    const fileName = avifFileName(i, sourceUrl)
    const destAbs = path.join(dir, fileName)
    const key = storageKey('cruise', slug, fileName)
    if (existsSync(destAbs)) {
      saved.push({ sort: i, storageKey: key })
      continue
    }
    try {
      const res = await downloadAndSaveAvif(sourceUrl, destAbs, {
        dryRun: false,
        headers: { Referer: 'https://www.tatilsepeti.com/', 'User-Agent': 'TravelTatilsepetiImport/1.0' },
      })
      if (res.ok) {
        saved.push({ sort: i, storageKey: key })
        stats.imagesOk++
      }
    } catch (e) {
      stats.imagesFail++
      console.warn(`    [img] ${i + 1}: ${e.message}`)
    }
  }
  if (!saved.length) return 0

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

async function main() {
  console.log(`Tatilsepeti cruise import — status=${STATUS}, only-missing=${ONLY_MISSING}, dry-run=${DRY_RUN}`)

  console.log('→ Katalog çekiliyor…')
  const catalog = await fetchAllTatilsepetiCatalog({
    delayMs: DELAY_MS,
    onPage: (p, total, n) => process.stderr.write(`[tatilsepeti] sayfa ${p}/${total} (${n} satır)\n`),
  })
  stats.catalog = catalog.products.length
  console.log(`→ ${catalog.departureRows} kalkış / ${catalog.products.length} benzersiz tur`)

  const pgClient = createPgClient()
  if (!DRY_RUN) await pgClient.connect()
  const ctx = DRY_RUN
    ? { orgId: process.env.TATILSEPETI_ORG_ID || 'a0000000-0000-4000-8000-000000000001' }
    : await resolveTatilsepetiImportContext(pgClient, process.env.TATILSEPETI_ORG_ID || 'a0000000-0000-4000-8000-000000000001')

  let work = catalog.products
  if (ONLY_MISSING && !DRY_RUN) {
    const missing = []
    for (const row of work) {
      const hit = await findListingByTatilsepetiRef(pgClient, ctx.orgId, row.tourId)
      if (!hit) missing.push(row)
      else stats.skipped++
    }
    work = missing
    console.log(`→ DB'de yok: ${work.length}, atlandı: ${stats.skipped}`)
  }
  if (LIMIT > 0) work = work.slice(0, LIMIT)
  stats.work = work.length

  for (let i = 0; i < work.length; i++) {
    const row = work[i]
    process.stdout.write(`[${i + 1}/${work.length}] ${row.tourId} — ${String(row.title).slice(0, 55)} … `)
    try {
      await sleep(DELAY_MS)
      const detail = await fetchTourDetail(row)
      const result = await upsertTatilsepetiCruiseListing(pgClient, ctx, detail, { status: STATUS, dryRun: DRY_RUN })

      if (result.action === 'dry-run') {
        console.log(`dry-run ${result.slug}`)
        continue
      }
      if (result.action === 'created') stats.created++
      else stats.updated++

      let imgN = 0
      if (WITH_IMAGES && detail.galleryUrls?.length) {
        imgN = await saveGallery(pgClient, result.listingId, result.slug, detail.galleryUrls)
      }
      console.log(`${result.action} ${result.slug}${imgN ? ` (${imgN} img)` : ''}`)
    } catch (e) {
      stats.errors++
      console.log(`hata: ${e.message}`)
    }
  }

  if (!DRY_RUN) await pgClient.end()

  console.log(
    `\nBitti: katalog=${stats.catalog}, işlenen=${stats.work}, yeni=${stats.created}, güncel=${stats.updated}, ` +
      `atlandı=${stats.skipped}, hata=${stats.errors}, avif=${stats.imagesOk}/${stats.imagesFail}`,
  )
}

main().catch((e) => {
  console.error(e.message || e)
  process.exit(1)
})
