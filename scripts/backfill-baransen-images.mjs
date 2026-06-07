/**
 * Baransen ilanları — görselsiz kayıtlara galeri indir (AVIF).
 *
 *   node scripts/backfill-baransen-images.mjs --dry-run
 *   node scripts/backfill-baransen-images.mjs --limit 5
 *   node scripts/backfill-baransen-images.mjs --download-only --limit 6
 */

import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createPgClient } from './lib/pg-client.mjs'
import { fetchBoatDetail } from './lib/baransen-api.mjs'
import { downloadGalleryImages } from './lib/wtatil-image-download.mjs'
import { slugHasRawFiles } from './lib/yacht-gallery-phases.mjs'
import { loadBaransenCardIndex, resolveBaransenDetailUrl } from './lib/yacht-detail-url.mjs'
import {
  resolveBaransenImportContext,
  upsertBaransenYachtListing,
} from './lib/baransen-listing-db.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const UPLOADS_ROOT = path.join(__dirname, '..', 'frontend', 'public', 'uploads', 'listings')
const DEFAULT_ORG = 'a0000000-0000-4000-8000-000000000001'

const args = new Set(process.argv.slice(2))
const DRY_RUN = args.has('--dry-run')
const DOWNLOAD_ONLY = args.has('--download-only')
const limitIdx = process.argv.indexOf('--limit')
const LIMIT = limitIdx >= 0 ? Number(process.argv[limitIdx + 1]) : 0
const slugIdx = process.argv.indexOf('--slug')
const SLUG_FILTER = slugIdx >= 0 ? process.argv[slugIdx + 1] : ''

async function main() {
  const orgId = process.env.BARANSEN_ORG_ID || DEFAULT_ORG
  const pg = createPgClient()
  await pg.connect()

  let sql = `
    SELECT l.id::text AS listing_id, l.slug, l.external_listing_ref AS baransen_id,
           la.value_json->>'source_url' AS source_url,
           la.value_json AS value_json,
           (SELECT COUNT(*)::int FROM listing_images li WHERE li.listing_id = l.id) AS img_count
    FROM listings l
    JOIN listing_attributes la ON la.listing_id = l.id
      AND la.group_code = 'listing_meta' AND la.key = 'v1'
    JOIN product_categories pc ON pc.id = l.category_id AND pc.code = 'yacht_charter'
    WHERE l.external_provider_code = 'baransen'
      AND NOT EXISTS (SELECT 1 FROM listing_images li WHERE li.listing_id = l.id)
    ORDER BY l.slug`

  const { rows } = await pg.query(sql)
  let targets = rows
  if (SLUG_FILTER) {
    const needle = SLUG_FILTER.replace(/\*/g, '')
    targets = targets.filter((r) => r.slug.includes(needle))
  }
  if (DOWNLOAD_ONLY) {
    const pending = []
    for (const row of targets) {
      if (!(await slugHasRawFiles(UPLOADS_ROOT, row.slug))) pending.push(row)
    }
    targets = pending
  }
  if (LIMIT > 0) targets = targets.slice(0, LIMIT)

  console.log(
    `Baransen görsel backfill — ${targets.length} ilan, dry-run=${DRY_RUN}, download-only=${DOWNLOAD_ONLY}`,
  )

  const ctx = await resolveBaransenImportContext(pg, orgId)
  const cardIndex = await loadBaransenCardIndex()
  let ok = 0
  let failed = 0

  for (const row of targets) {
    const url = await resolveBaransenDetailUrl(row, { cardIndex })
    if (!url) {
      console.log(`  ${row.slug} → Baransen detay URL yok`)
      failed += 1
      continue
    }
    process.stdout.write(`  #${row.baransen_id} ${row.slug} … `)
    try {
      const detail = await fetchBoatDetail(url)
      if (!detail.galleryUrls?.length) {
        console.log('galeri yok')
        failed += 1
        continue
      }
      if (DRY_RUN) {
        console.log(`[dry] ${detail.galleryUrls.length} görsel`)
        ok += 1
        continue
      }
      if (DOWNLOAD_ONLY) {
        const rawRows = await downloadGalleryImages(detail.galleryUrls, row.slug, UPLOADS_ROOT, {
          downloadOnly: true,
        })
        console.log(`${rawRows.length} ham`)
        if (rawRows.length > 0) ok += 1
        else failed += 1
        continue
      }
      const result = await upsertBaransenYachtListing(
        pg,
        ctx,
        {
          card: {
            baransenId: row.baransen_id,
            title: detail.title,
            detailUrl: url,
            propertyType: detail.propertyType,
            pax: detail.pax,
            marina: detail.marina,
          },
          detail,
        },
        {
          status: 'published',
          uploadsRoot: UPLOADS_ROOT,
          forceImages: true,
          updateExisting: true,
        },
      )
      console.log(`${result.images} görsel`)
      if (result.images > 0) ok += 1
      else failed += 1
    } catch (e) {
      console.log(`hata: ${e.message}`)
      failed += 1
    }
  }

  await pg.end()
  console.log(`Bitti: başarılı=${ok}, başarısız=${failed}`)
}

main().catch((e) => {
  console.error(e.message || e)
  process.exit(1)
})
