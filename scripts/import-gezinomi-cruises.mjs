/**
 * Gezinomi cruise (kruvaziyer) ilan import
 *
 *   node scripts/import-gezinomi-cruises.mjs --dry-run --limit 5
 *   node scripts/import-gezinomi-cruises.mjs --category msc --with-images
 *   node scripts/import-gezinomi-cruises.mjs --published
 *
 * Ortam: PG*, GEIZINOMI_DELAY_MS=400, GEIZINOMI_CRUISE_STATUS=draft|published
 */

import { existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { fetchGezinomiTourDetail, summarizeGezinomiPeriods } from './lib/gezinomi-api.mjs'
import { fetchGezinomiGalleryViaApi } from './lib/gezinomi-api.mjs'
import { fetchAllGezinomiCruises } from './lib/gezinomi-cruise-catalog.mjs'
import {
  coverImageCandidates,
  findWtatilListingByProductId,
  listingStorageKey,
  listingUploadDir,
  resolveGezinomiImportContext,
  upsertGezinomiCruiseListing,
} from './lib/gezinomi-listing-db.mjs'
import { gezinomiRefererHeaders } from './lib/gezinomi-api.mjs'
import { gezinomiPictureBaseName, gezinomiPictureDownloadUrls } from './lib/gezinomi-gallery.mjs'
import { avifFileName, downloadAndSaveAvif } from './lib/wtatil-image-download.mjs'
import { createPgClient } from './lib/pg-client.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const UPLOADS_ROOT = path.join(__dirname, '..', 'frontend', 'public', 'uploads', 'listings')

const args = new Set(process.argv.slice(2))
const DRY_RUN = args.has('--dry-run')
const WITH_IMAGES = args.has('--with-images') || (!args.has('--no-images') && !DRY_RUN)
const PUBLISHED = args.has('--published')
const SKIP_WTATIL = !args.has('--allow-wtatil-overlap')
const limitIdx = process.argv.indexOf('--limit')
const LIMIT = limitIdx >= 0 ? Number(process.argv[limitIdx + 1]) : 0
const catIdx = process.argv.indexOf('--category')
const CATEGORY_FILTER = catIdx >= 0 ? process.argv[catIdx + 1] : ''
const DELAY_MS = Number(process.env.GEIZINOMI_DELAY_MS || 400)
const STATUS =
  PUBLISHED || String(process.env.GEIZINOMI_CRUISE_STATUS || 'draft').toLowerCase() === 'published'
    ? 'published'
    : 'draft'

const stats = {
  catalog: 0,
  created: 0,
  updated: 0,
  skippedWtatil: 0,
  skipped: 0,
  imagesOk: 0,
  imagesFail: 0,
  errors: 0,
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms))
}

async function downloadGezinomiAvif(sourceUrl, destAbs) {
  const headers = gezinomiRefererHeaders()
  const assetMatch = String(sourceUrl).match(/\/assets\/([^/?]+)/i)
  const baseName = assetMatch ? gezinomiPictureBaseName(assetMatch[1]) : ''
  const candidates = baseName ? gezinomiPictureDownloadUrls(baseName) : [sourceUrl]
  if (sourceUrl && !candidates.includes(sourceUrl)) candidates.unshift(sourceUrl)
  let lastErr = null
  for (const url of candidates) {
    try {
      return await downloadAndSaveAvif(url, destAbs, { dryRun: false, headers })
    } catch (e) {
      lastErr = e
    }
  }
  throw lastErr || new Error('indirme başarısız')
}

async function saveGallery(pgClient, listingId, slug, urls) {
  const saved = []
  for (let i = 0; i < urls.length; i++) {
    const sourceUrl = urls[i]
    const fileName = avifFileName(i, sourceUrl)
    const destAbs = path.join(listingUploadDir(UPLOADS_ROOT, 'cruise', slug), fileName)
    const storageKey = listingStorageKey('cruise', slug, fileName)
    if (existsSync(destAbs)) {
      saved.push({ sort: i, storageKey })
      continue
    }
    try {
      const res = await downloadGezinomiAvif(sourceUrl, destAbs)
      if (res.ok) {
        saved.push({ sort: i, storageKey })
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
  console.log(`Gezinomi cruise import — status=${STATUS}, images=${WITH_IMAGES}, dry-run=${DRY_RUN}`)

  console.log('→ Katalog çekiliyor…')
  let rows = await fetchAllGezinomiCruises({ categoryFilter: CATEGORY_FILTER })
  stats.catalog = rows.length
  console.log(`→ ${rows.length} benzersiz cruise (productId)`)
  if (LIMIT > 0) rows = rows.slice(0, LIMIT)

  const pgClient = createPgClient()
  if (!DRY_RUN) await pgClient.connect()
  const ctx = DRY_RUN ? { orgId: process.env.GEIZINOMI_ORG_ID || 'a0000000-0000-4000-8000-000000000001' } : await resolveGezinomiImportContext(pgClient, process.env.GEIZINOMI_ORG_ID || 'a0000000-0000-4000-8000-000000000001')

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    const label = `${row.productId} — ${String(row.productName || '').slice(0, 55)}`
    process.stdout.write(`[${i + 1}/${rows.length}] ${label} … `)

    if (!DRY_RUN && SKIP_WTATIL) {
      const wtatil = await findWtatilListingByProductId(pgClient, ctx.orgId, row.productId)
      if (wtatil) {
        stats.skippedWtatil++
        console.log(`skip (wtatil: ${wtatil.slug})`)
        continue
      }
    }

    let detail = null
    let galleryUrls = []
    if (WITH_IMAGES || !DRY_RUN) {
      try {
        const match = {
          link: row.link,
          productId: row.productId,
          typeId: row.tourTypeId ?? 2,
          name: row.productName,
        }
        const gal = await fetchGezinomiGalleryViaApi(match)
        galleryUrls = gal.urls || []
        detail = await fetchGezinomiTourDetail(match)
        if (detail.model) {
          detail.periods = summarizeGezinomiPeriods(detail.model)
        }
      } catch (e) {
        console.warn(`\n    [detail] ${e.message}`)
        galleryUrls = coverImageCandidates(row)
      }
      await sleep(DELAY_MS)
    }

    try {
      const result = await upsertGezinomiCruiseListing(pgClient, ctx, row, {
        status: STATUS,
        detail,
        galleryUrls,
        dryRun: DRY_RUN,
      })

      if (result.action === 'created') stats.created++
      else if (result.action === 'updated') stats.updated++
      else if (result.action === 'dry-run') {
        console.log(`dry-run ${result.slug}`)
        continue
      }

      let imgN = 0
      if (WITH_IMAGES && !DRY_RUN && galleryUrls.length) {
        imgN = await saveGallery(pgClient, result.listingId, result.slug, galleryUrls)
      } else if (WITH_IMAGES && !DRY_RUN) {
        const fallback = coverImageCandidates(row)
        if (fallback.length) imgN = await saveGallery(pgClient, result.listingId, result.slug, fallback.slice(0, 1))
      }

      console.log(`${result.action} ${result.slug}${imgN ? ` (${imgN} img)` : ''}`)
    } catch (e) {
      stats.errors++
      console.log(`hata: ${e.message}`)
    }
  }

  if (!DRY_RUN) await pgClient.end()

  console.log(
    `\nBitti: katalog=${stats.catalog}, yeni=${stats.created}, güncel=${stats.updated}, ` +
      `wtatil-skip=${stats.skippedWtatil}, hata=${stats.errors}, avif=${stats.imagesOk}/${stats.imagesFail}`,
  )
}

main().catch((e) => {
  console.error(e.message || e)
  process.exit(1)
})
