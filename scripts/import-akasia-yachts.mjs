/**
 * Akasia Yachting → travel PostgreSQL yat kiralama aktarımı.
 *
 * Kaynak API (Active theme widget):
 *   https://akasiayachting.com/?get=gulets&for=rent&theme=active-71&ref=akasiayachting.com
 *
 * Kullanım (repo kökünden):
 *   node scripts/import-akasia-yachts.mjs --dry-run --limit 5
 *   node scripts/import-akasia-yachts.mjs --category gulets --limit 10
 *   node scripts/import-akasia-yachts.mjs --skip-images
 *   AKASIA_STATUS=published node scripts/import-akasia-yachts.mjs
 *
 * Ortam: PGHOST, PGPORT, PGUSER, PGPASSWORD, PGDATABASE
 *        AKASIA_ORG_ID (varsayılan a0000000-0000-4000-8000-000000000001)
 *        AKASIA_STATUS — draft | published (varsayılan draft)
 *
 * Yasal not: Metin ve görseller telifli olabilir; yayın öncesi Akasia ile izin önerilir.
 */

import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'
import {
  AKASIA_RENT_CATEGORIES,
  fetchAllListingCards,
  fetchYachtDetail,
} from './lib/akasia-api.mjs'
import {
  resolveAkasiaImportContext,
  upsertAkasiaYachtListing,
} from './lib/akasia-listing-db.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const TRAVEL_ROOT = path.resolve(__dirname, '..')
const require = createRequire(path.join(TRAVEL_ROOT, 'frontend', 'package.json'))
const pg = require('pg')

const UPLOADS_ROOT = path.join(TRAVEL_ROOT, 'frontend', 'public', 'uploads', 'listings')
const DEFAULT_ORG = 'a0000000-0000-4000-8000-000000000001'

const args = new Set(process.argv.slice(2))
const DRY_RUN = args.has('--dry-run')
const SKIP_IMAGES = args.has('--skip-images')
const LIST_ONLY = args.has('--list-only')
const limitIdx = process.argv.indexOf('--limit')
const LIMIT = limitIdx >= 0 ? Number(process.argv[limitIdx + 1]) : 0
const catIdx = process.argv.indexOf('--category')
const CATEGORY_FILTER = catIdx >= 0 ? String(process.argv[catIdx + 1] || '').trim() : ''

function pgClient() {
  return new pg.Client({
    host: process.env.PGHOST || '127.0.0.1',
    port: Number(process.env.PGPORT || 5432),
    user: process.env.PGUSER || 'postgres',
    password: process.env.PGPASSWORD || '',
    database: process.env.PGDATABASE || 'travel',
  })
}

function pickCategories() {
  if (!CATEGORY_FILTER || CATEGORY_FILTER === 'all') return AKASIA_RENT_CATEGORIES
  const hit = AKASIA_RENT_CATEGORIES.filter(
    (c) => c.get === CATEGORY_FILTER || c.propertyType === CATEGORY_FILTER,
  )
  if (!hit.length) {
    throw new Error(
      `Geçersiz --category: ${CATEGORY_FILTER} (gulets | motoryachts | sailingyachts | all)`,
    )
  }
  return hit
}

async function main() {
  const orgId = process.env.AKASIA_ORG_ID || DEFAULT_ORG
  const status = process.env.AKASIA_STATUS === 'published' ? 'published' : 'draft'
  const categories = pickCategories()

  console.log(
    `Akasia import (dry-run=${DRY_RUN}, skip-images=${SKIP_IMAGES}, status=${status}, limit=${LIMIT || '∞'})`,
  )

  const client = pgClient()
  await client.connect()
  const ctx = await resolveAkasiaImportContext(client, orgId)

  let processed = 0
  let created = 0
  let updated = 0
  let failed = 0

  try {
    for (const cat of categories) {
      console.log(`\n[${cat.label}] ${cat.get} listeleniyor…`)
      const cards = await fetchAllListingCards(cat.get, { perpage: 24 })
      console.log(`  ${cards.length} kart bulundu`)

      if (LIST_ONLY) {
        for (const card of cards.slice(0, LIMIT > 0 ? LIMIT : undefined)) {
          console.log(`  - ${card.id} | ${card.title} | ${card.charterRate.amount ?? '-'} ${card.charterRate.currency}`)
        }
        continue
      }

      for (const card of cards) {
        if (LIMIT > 0 && processed >= LIMIT) break
        try {
          const detail = await fetchYachtDetail(card.id)
          const out = await upsertAkasiaYachtListing(
            client,
            ctx,
            { card, detail, propertyType: cat.propertyType },
            { status, dryRun: DRY_RUN, skipImages: SKIP_IMAGES, uploadsRoot: UPLOADS_ROOT },
          )
          processed += 1
          if (out.action === 'created') created += 1
          else if (out.action === 'updated') updated += 1
          console.log(
            `  [${out.action || 'ok'}] ${out.akasiaId} ${out.slug} | ${out.weeklyLow ?? '-'} | img=${out.images ?? 0}`,
          )
        } catch (e) {
          failed += 1
          console.warn(`  [hata] ${card.id} ${card.title}: ${e.message}`)
        }
      }
      if (LIMIT > 0 && processed >= LIMIT) break
    }
  } finally {
    await client.end()
  }

  console.log(
    `\nBitti: işlenen=${processed}, yeni=${created}, güncellenen=${updated}, hata=${failed}`,
  )
}

main().catch((e) => {
  console.error(e.message || e)
  process.exit(1)
})
