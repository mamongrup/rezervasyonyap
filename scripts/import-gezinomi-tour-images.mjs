/**
 * Gezinomi galeri → yerel AVIF (Wtatil tüm ilanlar)
 *
 * Akış: Gezinomi sayfasından tur kodu + galeri URL → reklam filtresi → AVIF → DB
 *
 *   cd frontend && npm install -D playwright && npx playwright install chromium
 *
 *   node scripts/import-gezinomi-tour-images.mjs --dry-run --limit 3
 *   node scripts/import-gezinomi-tour-images.mjs --limit 10
 *   node scripts/import-gezinomi-tour-images.mjs --skip-existing
 *   node scripts/import-gezinomi-tour-images.mjs --slug kosoval-buyuk-balkanlar-turu-ajet-ile-extra-turlar-ve-aksam-yemekleri-dahil-sjj-sjj-wt-7360
 *
 * Ortam: AVIF_QUALITY=90, MAX_WIDTH=1600, PG*, GEIZINOMI_DELAY_MS=800
 */

import { existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'
import { avifFileName, downloadAndSaveAvif } from './lib/wtatil-image-download.mjs'
import { matchListingToGezinomi } from './lib/gezinomi-match.mjs'
import { launchGezinomiBrowser, newGezinomiPage, scrapeGezinomiTourGallery } from './lib/gezinomi-scrape.mjs'

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
const slugIdx = process.argv.indexOf('--slug')
const SLUG_FILTER = slugIdx >= 0 ? process.argv[slugIdx + 1] : ''
const DELAY_MS = Number(process.env.GEIZINOMI_DELAY_MS || 800)

const stats = {
  listings: 0,
  matched: 0,
  scraped: 0,
  imported: 0,
  skipped: 0,
  noMatch: 0,
  noGallery: 0,
  imagesOk: 0,
  imagesFail: 0,
  bytesAvif: 0,
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms))
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

async function replaceListingImages(pgClient, listingId, slug, imageUrls, { dryRun }) {
  const saved = []
  for (let i = 0; i < imageUrls.length; i++) {
    const sourceUrl = imageUrls[i]
    const fileName = avifFileName(i, sourceUrl)
    const destAbs = path.join(UPLOADS_ROOT, slug, fileName)
    const storageKey = `uploads/listings/wtatil/${slug}/${fileName}`

    if (SKIP_EXISTING && !dryRun && existsSync(destAbs)) {
      saved.push({ sort: i, storageKey })
      stats.imagesOk++
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

async function loadListings(pgClient) {
  let sql = `
    SELECT l.id::text AS listing_id, l.slug, lt.title
    FROM listings l
    JOIN listing_translations lt ON lt.listing_id = l.id
    JOIN locales loc ON loc.id = lt.locale_id AND loc.code = 'tr'
    WHERE l.external_provider_code = 'wtatil'
  `
  const params = []
  if (SLUG_FILTER) {
    params.push(SLUG_FILTER)
    sql += ` AND l.slug = $${params.length}`
  }
  sql += ` ORDER BY l.slug`
  if (LIMIT > 0) sql += ` LIMIT ${LIMIT}`
  const { rows } = await pgClient.query(sql, params)
  return rows
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

  const listings = await loadListings(pgClient)
  console.log(`Gezinomi → AVIF import — ${listings.length} ilan, dry-run=${DRY_RUN}`)

  const browser = await launchGezinomiBrowser()
  const page = await newGezinomiPage(browser)

  for (let i = 0; i < listings.length; i++) {
    const row = listings[i]
    stats.listings++
    process.stdout.write(`[${i + 1}/${listings.length}] ${row.slug} … `)

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

    const scraped = await scrapeGezinomiTourGallery(page, { link: match.link, title: row.title })
    if (!scraped.tourCode || !scraped.urls.length) {
      stats.noGallery++
      console.log(`scrape fail (${scraped.error || 'no urls'}) link=${match.link}`)
      await sleep(DELAY_MS)
      continue
    }
    stats.scraped++

    if (DRY_RUN) {
      console.log(
        `dry-run tur=${scraped.tourCode} imgs=${scraped.urls.length} score=${match.score} link=${match.link}`,
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
      })
      stats.imported++
    }

    console.log(`ok tur=${scraped.tourCode} imgs=${n} (filtered ${scraped.urls.length})`)
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
    `${stats.imagesOk} avif`,
    `${stats.imagesFail} hata`,
    `${(stats.bytesAvif / 1024 / 1024).toFixed(1)} MB`,
  ].join(', ')
  console.log(`\n${summary}`)
}

main().catch((e) => {
  console.error(e.message || e)
  process.exit(1)
})
