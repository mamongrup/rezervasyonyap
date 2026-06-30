/**
 * Gezinomi galeri → yerel AVIF (Wtatil turları)
 *
 * Tur kodu (productId) ile eşleştirme → Gezinomi TourDetail API galeri → AVIF → DB
 *
 *   node scripts/import-gezinomi-tour-images.mjs --dry-run --limit 3
 *   node scripts/import-gezinomi-tour-images.mjs --few-only --skip-existing
 *   node scripts/import-gezinomi-tour-images.mjs --playwright
 *   node scripts/import-gezinomi-tour-images.mjs --min-images 4 --limit 50
 *   node scripts/import-gezinomi-tour-images.mjs --compare-periods
 *
 * Ortam: AVIF_QUALITY=90, MAX_WIDTH=1600, PG*, GEIZINOMI_DELAY_MS=800
 */

import { existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { avifFileName, downloadAndSaveAvif } from './lib/wtatil-image-download.mjs'
import { gezinomiPictureBaseName, gezinomiPictureDownloadUrls } from './lib/gezinomi-gallery.mjs'
import { gezinomiRefererHeaders, fetchGezinomiGalleryViaApi } from './lib/gezinomi-api.mjs'
import { matchListingToGezinomi } from './lib/gezinomi-match.mjs'
import {
  compareTourPeriods,
  formatPeriodCompareSummary,
  summarizeWtatilPeriods,
} from './lib/gezinomi-period-compare.mjs'
import { listingStorageKey, listingUploadDir } from './lib/listing-upload-path.mjs'
import { createPgClient } from './lib/pg-client.mjs'

const IMPORT_VERSION = 'api-v6'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const TRAVEL_ROOT = path.resolve(__dirname, '..')
const UPLOADS_ROOT = path.join(TRAVEL_ROOT, 'frontend', 'public', 'uploads', 'listings')

const args = new Set(process.argv.slice(2))
const DRY_RUN = args.has('--dry-run')
const SKIP_EXISTING = args.has('--skip-existing')
const FEW_ONLY = args.has('--few-only')
const USE_PLAYWRIGHT = args.has('--playwright')
const COMPARE_PERIODS = args.has('--compare-periods')
const limitIdx = process.argv.indexOf('--limit')
const LIMIT = limitIdx >= 0 ? Number(process.argv[limitIdx + 1]) : 0
const slugIdx = process.argv.indexOf('--slug')
const SLUG_FILTER = slugIdx >= 0 ? process.argv[slugIdx + 1] : ''
const minImagesIdx = process.argv.indexOf('--min-images')
const MIN_IMAGES =
  minImagesIdx >= 0
    ? Number(process.argv[minImagesIdx + 1])
    : FEW_ONLY
      ? 4
      : 0
const DELAY_MS = Number(process.env.GEIZINOMI_DELAY_MS || 800)

const stats = {
  listings: 0,
  matched: 0,
  scraped: 0,
  imported: 0,
  skipped: 0,
  noMatch: 0,
  noGallery: 0,
  periodMismatch: 0,
  periodOk: 0,
  imagesOk: 0,
  imagesFail: 0,
  bytesAvif: 0,
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms))
}

async function downloadGezinomiAvif(sourceUrl, destAbs, { dryRun }) {
  const headers = gezinomiRefererHeaders()
  const assetMatch = String(sourceUrl).match(/\/assets\/([^/?]+)/i)
  const baseName = assetMatch ? gezinomiPictureBaseName(assetMatch[1]) : ''
  const candidates = baseName ? gezinomiPictureDownloadUrls(baseName) : [sourceUrl]
  if (sourceUrl && !candidates.includes(sourceUrl)) candidates.unshift(sourceUrl)
  let lastErr = null
  for (const url of candidates) {
    try {
      return await downloadAndSaveAvif(url, destAbs, { dryRun, headers })
    } catch (e) {
      lastErr = e
    }
  }
  throw lastErr || new Error('gezinomi indirme başarısız')
}

async function alreadyImported(pgClient, listingId) {
  const { rows } = await pgClient.query(
    `SELECT 1 FROM listing_attributes
     WHERE listing_id = $1::uuid AND group_code = 'gezinomi' AND key = 'gallery_imported_at'
     LIMIT 1`,
    [listingId],
  )
  return rows.length > 0
}

async function markImported(pgClient, listingId, meta) {
  await pgClient.query(
    `INSERT INTO listing_attributes (listing_id, group_code, key, value_json)
     VALUES ($1::uuid, 'gezinomi', 'gallery_imported_at', $2::jsonb)
     ON CONFLICT (listing_id, group_code, key) DO UPDATE SET value_json = EXCLUDED.value_json`,
    [listingId, JSON.stringify(meta)],
  )
}

async function savePeriodAudit(pgClient, listingId, meta) {
  await pgClient.query(
    `INSERT INTO listing_attributes (listing_id, group_code, key, value_json)
     VALUES ($1::uuid, 'gezinomi', 'period_compare_at', $2::jsonb)
     ON CONFLICT (listing_id, group_code, key) DO UPDATE SET value_json = EXCLUDED.value_json`,
    [listingId, JSON.stringify(meta)],
  )
}

async function replaceListingImages(pgClient, listingId, slug, imageUrls, { dryRun }) {
  const saved = []
  for (let i = 0; i < imageUrls.length; i++) {
    const sourceUrl = imageUrls[i]
    const fileName = avifFileName(i, sourceUrl)
    const destAbs = path.join(listingUploadDir(UPLOADS_ROOT, 'tour', slug), fileName)
    const storageKey = listingStorageKey('tour', slug, fileName)

    if (SKIP_EXISTING && !dryRun && existsSync(destAbs)) {
      saved.push({ sort: i, storageKey })
      stats.imagesOk++
      continue
    }

    try {
      const res = await downloadGezinomiAvif(sourceUrl, destAbs, { dryRun })
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

async function loadListings(pgClient) {
  let sql = `
    SELECT l.id::text AS listing_id, l.slug, lt.title,
           ltd.program_days_json,
           (SELECT count(*)::int FROM listing_images li WHERE li.listing_id = l.id) AS image_count
    FROM listings l
    JOIN listing_translations lt ON lt.listing_id = l.id
    JOIN locales loc ON loc.id = lt.locale_id AND loc.code = 'tr'
    LEFT JOIN listing_tour_details ltd ON ltd.listing_id = l.id
    WHERE l.external_provider_code = 'wtatil'
  `
  const params = []
  if (SLUG_FILTER) {
    params.push(SLUG_FILTER)
    sql += ` AND l.slug = $${params.length}`
  }
  if (MIN_IMAGES > 0) {
    sql += ` AND (SELECT count(*) FROM listing_images li WHERE li.listing_id = l.id) < $${params.length + 1}`
    params.push(MIN_IMAGES)
  }
  sql += ` ORDER BY image_count ASC, l.slug`
  if (LIMIT > 0) sql += ` LIMIT ${LIMIT}`
  const { rows } = await pgClient.query(sql, params)
  return rows
}

async function scrapeGallery(ctx, match, title) {
  const api = await fetchGezinomiGalleryViaApi({ ...match, title })
  if (api.urls?.length || !USE_PLAYWRIGHT) return api
  if (!ctx?.page) return api
  const { scrapeGezinomiTourGallery } = await import('./lib/gezinomi-scrape.mjs')
  const pw = await scrapeGezinomiTourGallery(ctx.page, { link: match.link, title })
  return pw.urls?.length > (api.urls?.length || 0) ? pw : api
}

async function main() {
  console.log(`[gezinomi-import ${IMPORT_VERSION}] kaynak=TourDetail API, Playwright=${USE_PLAYWRIGHT ? 'evet' : 'hayır'}`)

  const pgClient = createPgClient()
  await pgClient.connect()

  const listings = await loadListings(pgClient)
  const minLabel = MIN_IMAGES > 0 ? `, min-images<${MIN_IMAGES}` : ''
  const modeLabel = USE_PLAYWRIGHT ? ', playwright-fallback' : ', api'
  const periodLabel = COMPARE_PERIODS ? ', compare-periods' : ''
  console.log(
    `Gezinomi → AVIF import — ${listings.length} ilan, dry-run=${DRY_RUN}${minLabel}${modeLabel}${periodLabel}`,
  )

  let browser = null
  let page = null
  const ctx = { page: null }
  if (USE_PLAYWRIGHT) {
    const { launchGezinomiBrowser, newGezinomiPage } = await import('./lib/gezinomi-scrape.mjs')
    browser = await launchGezinomiBrowser()
    page = await newGezinomiPage(browser)
    ctx.page = page
  }

  for (let i = 0; i < listings.length; i++) {
    const row = listings[i]
    stats.listings++
    process.stdout.write(`[${i + 1}/${listings.length}] ${row.slug} (${row.image_count} img) … `)

    if (SKIP_EXISTING && (await alreadyImported(pgClient, row.listing_id))) {
      stats.skipped++
      console.log('skip (already imported)')
      continue
    }

    let match
    try {
      match = await matchListingToGezinomi({ slug: row.slug, title: row.title })
    } catch (e) {
      console.log(`match err: ${e.message}`)
      continue
    }

    if (!match) {
      stats.noMatch++
      console.log('no gezinomi match')
      await sleep(DELAY_MS)
      continue
    }
    stats.matched++

    const scraped = await scrapeGallery(ctx, match, row.title)

    let periodSummary = ''
    if (COMPARE_PERIODS && scraped.periods) {
      const wtatilPeriods = summarizeWtatilPeriods(row.program_days_json)
      const compare = compareTourPeriods(wtatilPeriods, scraped.periods)
      periodSummary = formatPeriodCompareSummary(compare)
      if (compare.inSync) stats.periodOk++
      else stats.periodMismatch++

      if (!DRY_RUN) {
        await savePeriodAudit(pgClient, row.listing_id, {
          at: new Date().toISOString(),
          tour_code: scraped.tourCode,
          gezinomi_link: match.link,
          product_id: match.productId,
          ...compare,
        })
      }
    }

    if (!scraped.tourCode || !scraped.urls.length) {
      stats.noGallery++
      const periodPart = periodSummary ? ` periods=${periodSummary}` : ''
      console.log(
        `scrape fail (${scraped.error || 'no urls'}) link=${match.link}${match.productId ? ` pid=${match.productId}` : ''}${periodPart}`,
      )
      await sleep(DELAY_MS)
      continue
    }
    stats.scraped++

    if (DRY_RUN) {
      const periodPart = periodSummary ? ` periods=${periodSummary}` : ''
      console.log(
        `dry-run tur=${scraped.tourCode} imgs=${scraped.urls.length} score=${match.score}${periodPart} link=${match.link}`,
      )
      await sleep(DELAY_MS)
      continue
    }

    const n = await replaceListingImages(pgClient, row.listing_id, row.slug, scraped.urls, {
      dryRun: false,
    })

    if (n > 0) {
      await markImported(pgClient, row.listing_id, {
        at: new Date().toISOString(),
        tour_code: scraped.tourCode,
        gezinomi_link: match.link,
        page_url: scraped.pageUrl,
        image_count: n,
        match_score: match.score,
        period_summary: periodSummary || null,
      })
      stats.imported++
    }

    const periodPart = periodSummary ? ` periods=${periodSummary}` : ''
    console.log(`ok tur=${scraped.tourCode} imgs=${n}${periodPart}`)
    await sleep(DELAY_MS)
  }

  if (browser) await browser.close()
  await pgClient.end()

  const summary = [
    `Bitti: ${stats.listings} ilan`,
    `${stats.matched} eşleşme`,
    `${stats.scraped} galeri`,
    `${stats.imported} import`,
    `${stats.skipped} atlandı`,
    `${stats.noMatch} eşleşme yok`,
    `${stats.noGallery} galeri yok`,
    COMPARE_PERIODS ? `${stats.periodOk} dönem uyumlu` : null,
    COMPARE_PERIODS ? `${stats.periodMismatch} dönem farkı` : null,
    `${stats.imagesOk} avif`,
    `${stats.imagesFail} hata`,
    `${(stats.bytesAvif / 1024 / 1024).toFixed(1)} MB`,
  ]
    .filter(Boolean)
    .join(', ')
  console.log(`\n${summary}`)
}

main().catch((e) => {
  console.error(e.message || e)
  process.exit(1)
})
