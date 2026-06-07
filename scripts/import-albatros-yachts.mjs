/**
 * Albatros Yachting → travel PostgreSQL yat kiralama aktarımı.
 * Kaynak: https://www.albatrosyachting.com/ozelyatlar/
 *
 *   node scripts/import-albatros-yachts.mjs --dry-run --limit 5
 *   node scripts/import-albatros-yachts.mjs --skip-images
 *   ALBATROS_STATUS=published node scripts/import-albatros-yachts.mjs
 */

import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createPgClient } from './lib/pg-client.mjs'
import {
  enrichYachtFromHtml,
  fetchAllYachtRecords,
} from './lib/albatros-api.mjs'
import {
  resolveAlbatrosImportContext,
  upsertAlbatrosYachtListing,
} from './lib/albatros-listing-db.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const UPLOADS_ROOT = path.join(__dirname, '..', 'frontend', 'public', 'uploads', 'listings')
const DEFAULT_ORG = 'a0000000-0000-4000-8000-000000000001'

const args = new Set(process.argv.slice(2))
const DRY_RUN = args.has('--dry-run')
const SKIP_IMAGES = args.has('--skip-images')
const SKIP_EXISTING = args.has('--skip-existing')
const SKIP_HTML = args.has('--skip-html')
const LIST_ONLY = args.has('--list-only')
const limitIdx = process.argv.indexOf('--limit')
const LIMIT = limitIdx >= 0 ? Number(process.argv[limitIdx + 1]) : 0
const pageIdx = process.argv.indexOf('--max-pages')
const MAX_PAGES = pageIdx >= 0 ? Number(process.argv[pageIdx + 1]) : 0

async function main() {
  const orgId = process.env.ALBATROS_ORG_ID || DEFAULT_ORG
  const status = process.env.ALBATROS_STATUS === 'published' ? 'published' : 'draft'

  console.log(
    `Albatros import (dry-run=${DRY_RUN}, skip-images=${SKIP_IMAGES}, skip-html=${SKIP_HTML}, status=${status}, limit=${LIMIT || '∞'})`,
  )

  let records = await fetchAllYachtRecords({
    maxPages: MAX_PAGES,
    limit: LIMIT,
  })
  console.log(`API: ${records.length} yat kaydı`)

  const pg = createPgClient()
  await pg.connect()

  if (SKIP_EXISTING && !LIST_ONLY) {
    const { rows: existing } = await pg.query(
      `SELECT external_listing_ref FROM listings WHERE external_provider_code = 'albatros'`,
    )
    const done = new Set(existing.map((r) => String(r.external_listing_ref)))
    records = records.filter((r) => !done.has(String(r.albatrosId)))
    console.log(`Atlanan (zaten albatros): ${done.size}, kalan: ${records.length}`)
  }

  if (LIST_ONLY) {
    await pg.end()
    for (const r of records) {
      console.log(
        `  #${r.albatrosId} ${r.title} | ${r.propertyType} | ${r.pax ?? '-'} kişi | ${r.cabinCount ?? '-'} kabin | ${r.sourceUrl}`,
      )
    }
    return
  }

  const ctx = await resolveAlbatrosImportContext(pg, orgId)

  let created = 0
  let merged = 0
  let updated = 0
  let failed = 0

  for (const base of records) {
    process.stdout.write(`  #${base.albatrosId} ${base.title} … `)
    try {
      const record = SKIP_HTML ? base : await enrichYachtFromHtml(base)
      const result = await upsertAlbatrosYachtListing(pg, ctx, record, {
        status,
        dryRun: DRY_RUN,
        skipImages: SKIP_IMAGES,
        uploadsRoot: UPLOADS_ROOT,
        forceImages: !SKIP_IMAGES,
      })
      if (result.action === 'created') created += 1
      else if (result.action === 'merged') merged += 1
      else if (result.action === 'updated') updated += 1
      console.log(
        DRY_RUN
          ? `dry → ${result.title}${result.match ? ` (eşleşme: ${result.match})` : ''} | ${result.rates ?? 0} fiyat`
          : `${result.action} ${result.slug}${result.matchScore ? ` (eşleşme ${result.matchScore})` : ''} | ${result.images ?? 0} görsel`,
      )
    } catch (e) {
      failed += 1
      console.log(`hata: ${e.message}`)
    }
  }

  await pg.end()
  console.log(`Bitti: yeni=${created}, birleşen=${merged}, güncellenen=${updated}, hata=${failed}`)
}

main().catch((e) => {
  console.error(e.message || e)
  process.exit(1)
})
