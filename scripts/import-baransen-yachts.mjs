/**
 * Baransel Yachting → travel PostgreSQL yat kiralama aktarımı.
 *
 *   node scripts/import-baransen-yachts.mjs --dry-run --limit 5
 *   node scripts/import-baransen-yachts.mjs --skip-images
 *   BARANSEN_STATUS=published node scripts/import-baransen-yachts.mjs
 */

import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createPgClient } from './lib/pg-client.mjs'
import { fetchAllListingCards, fetchBoatDetail } from './lib/baransen-api.mjs'
import {
  resolveBaransenImportContext,
  upsertBaransenYachtListing,
} from './lib/baransen-listing-db.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const TRAVEL_ROOT = path.resolve(__dirname, '..')
const UPLOADS_ROOT = path.join(TRAVEL_ROOT, 'frontend', 'public', 'uploads', 'listings')
const DEFAULT_ORG = 'a0000000-0000-4000-8000-000000000001'

const args = new Set(process.argv.slice(2))
const DRY_RUN = args.has('--dry-run')
const SKIP_IMAGES = args.has('--skip-images')
const LIST_ONLY = args.has('--list-only')
const SKIP_EXISTING = args.has('--skip-existing')
const limitIdx = process.argv.indexOf('--limit')
const LIMIT = limitIdx >= 0 ? Number(process.argv[limitIdx + 1]) : 0
const pageIdx = process.argv.indexOf('--max-pages')
const MAX_PAGES = pageIdx >= 0 ? Number(process.argv[pageIdx + 1]) : 0

async function main() {
  const orgId = process.env.BARANSEN_ORG_ID || DEFAULT_ORG
  const status = process.env.BARANSEN_STATUS === 'published' ? 'published' : 'draft'

  console.log(
    `Baransen import (dry-run=${DRY_RUN}, skip-images=${SKIP_IMAGES}, status=${status}, limit=${LIMIT || '∞'})`,
  )

  const cards = await fetchAllListingCards({ maxPages: MAX_PAGES })
  console.log(`Liste: ${cards.length} tekne (sayfa limit=${MAX_PAGES || 'tümü'})`)

  let targets = cards
  if (LIMIT > 0) targets = targets.slice(0, LIMIT)

  const pg = createPgClient()
  await pg.connect()

  if (SKIP_EXISTING && !LIST_ONLY) {
    const { rows: existing } = await pg.query(
      `SELECT external_listing_ref FROM listings WHERE external_provider_code = 'baransen'`,
    )
    const done = new Set(existing.map((r) => String(r.external_listing_ref)))
    targets = targets.filter((c) => !done.has(String(c.baransenId)))
    console.log(`Atlanan (zaten baransen): ${done.size}, kalan: ${targets.length}`)
  }

  if (LIST_ONLY) {
    await pg.end()
    for (const c of targets) {
      console.log(`  #${c.baransenId} ${c.title} | ${c.boatTypeLabel} | ${c.pax ?? '-'} kişi | ${c.detailUrl}`)
    }
    return
  }

  const ctx = await resolveBaransenImportContext(pg, orgId)

  let created = 0
  let merged = 0
  let updated = 0
  let failed = 0

  for (const card of targets) {
    process.stdout.write(`  #${card.baransenId} ${card.title} … `)
    try {
      const detail = await fetchBoatDetail(card.detailUrl)
      const result = await upsertBaransenYachtListing(pg, ctx, { card, detail }, {
        status,
        dryRun: DRY_RUN,
        skipImages: SKIP_IMAGES,
        uploadsRoot: UPLOADS_ROOT,
      })
      if (result.action === 'created') created += 1
      else if (result.action === 'merged') merged += 1
      else if (result.action === 'updated') updated += 1
      console.log(
        DRY_RUN
          ? `dry → ${result.title}${result.match ? ` (eşleşme: ${result.match})` : ''}`
          : `${result.action} ${result.slug}${result.matchScore ? ` (eşleşme ${result.matchScore})` : ''}`,
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
