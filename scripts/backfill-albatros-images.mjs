/**
 * Albatros ilanları — görselsiz kayıtlara galeri indir (AVIF).
 * Birleşmiş Baransen slug'ları (Albatros meta) dahil.
 *
 *   node scripts/backfill-albatros-images.mjs --dry-run
 *   node scripts/backfill-albatros-images.mjs --limit 5
 *   node scripts/backfill-albatros-images.mjs --download-only --limit 12
 */

import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createPgClient } from './lib/pg-client.mjs'
import { enrichYachtFromHtml, fetchYachtRecordById } from './lib/albatros-api.mjs'
import { downloadGalleryImages } from './lib/wtatil-image-download.mjs'
import { slugHasRawFiles } from './lib/yacht-gallery-phases.mjs'
import {
  attachGalleryImagesToListing,
  resolveAlbatrosImportContext,
  upsertAlbatrosYachtListing,
} from './lib/albatros-listing-db.mjs'

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
  const orgId = process.env.ALBATROS_ORG_ID || DEFAULT_ORG
  const pg = createPgClient()
  await pg.connect()

  const { rows } = await pg.query(
    `SELECT l.id::text AS listing_id, l.slug, l.external_provider_code AS provider,
            COALESCE(
              CASE WHEN l.external_provider_code = 'albatros' THEN NULLIF(l.external_listing_ref, '') END,
              NULLIF(la.value_json->>'albatros_id', ''),
              NULLIF(la.value_json->'enrichment_sources'->'albatros'->>'albatros_id', '')
            ) AS albatros_id,
            la.value_json->>'source_url' AS source_url,
            (SELECT COUNT(*)::int FROM listing_images li WHERE li.listing_id = l.id) AS img_count
     FROM listings l
     JOIN listing_attributes la ON la.listing_id = l.id
       AND la.group_code = 'listing_meta' AND la.key = 'v1'
     JOIN product_categories pc ON pc.id = l.category_id AND pc.code = 'yacht_charter'
     WHERE NOT EXISTS (SELECT 1 FROM listing_images li WHERE li.listing_id = l.id)
       AND (
         l.external_provider_code = 'albatros'
         OR la.value_json->'enrichment_sources'->'albatros' IS NOT NULL
       )
       AND COALESCE(
         CASE WHEN l.external_provider_code = 'albatros' THEN NULLIF(l.external_listing_ref, '') END,
         NULLIF(la.value_json->>'albatros_id', ''),
         NULLIF(la.value_json->'enrichment_sources'->'albatros'->>'albatros_id', '')
       ) IS NOT NULL
     ORDER BY l.slug`,
  )

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
    `Albatros görsel backfill — ${targets.length} ilan, dry-run=${DRY_RUN}, download-only=${DOWNLOAD_ONLY}`,
  )

  const ctx = await resolveAlbatrosImportContext(pg, orgId)
  let ok = 0
  let failed = 0

  for (const row of targets) {
    process.stdout.write(`  #${row.albatros_id} ${row.slug} … `)
    try {
      const base = await fetchYachtRecordById(row.albatros_id)
      if (!base) {
        console.log('API kaydı yok')
        failed += 1
        continue
      }
      const record = await enrichYachtFromHtml(base)
      if (!record.galleryUrls?.length) {
        console.log('galeri yok')
        failed += 1
        continue
      }
      if (DRY_RUN) {
        console.log(`[dry] ${record.galleryUrls.length} görsel`)
        ok += 1
        continue
      }

      if (DOWNLOAD_ONLY) {
        const rawRows = await downloadGalleryImages(record.galleryUrls, row.slug, UPLOADS_ROOT, {
          downloadOnly: true,
        })
        console.log(`${rawRows.length} ham`)
        if (rawRows.length > 0) ok += 1
        else failed += 1
        continue
      }

      let imageCount = 0
      if (row.provider === 'albatros') {
        const result = await upsertAlbatrosYachtListing(pg, ctx, record, {
          status: 'published',
          uploadsRoot: UPLOADS_ROOT,
          forceImages: true,
          updateExisting: true,
        })
        imageCount = result.images ?? 0
      } else {
        imageCount = await attachGalleryImagesToListing(
          pg,
          row.listing_id,
          row.slug,
          record.galleryUrls,
          UPLOADS_ROOT,
        )
      }
      console.log(`${imageCount} görsel`)
      if (imageCount > 0) ok += 1
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
