/**
 * Wtatil (Reserwation Tour API v2) → PostgreSQL tur ilanı aktarımı.
 *
 * Kullanım (repo kökünden):
 *   set WTATIL_APPLICATION_SECRET_KEY=...
 *   set WTATIL_USERNAME=...
 *   set WTATIL_PASSWORD=...
 *   node scripts/import-wtatil-tours.mjs --ping
 *   node scripts/import-wtatil-tours.mjs --dry-run --limit 5
 *   node scripts/import-wtatil-tours.mjs --enrich --limit 10
 *   node scripts/import-wtatil-tours.mjs --full
 *
 * Ortam:
 *   WTATIL_BASE_URL (varsayılan https://tour-api.reserwation.com)
 *   WTATIL_APPLICATION_SECRET_KEY, WTATIL_USERNAME, WTATIL_PASSWORD (zorunlu)
 *   WTATIL_AGENCY_ID — search-tour fiyat zenginleştirmesi için (--prices / --full)
 *   WTATIL_ORG_ID — varsayılan a0000000-0000-4000-8000-000000000001
 *   WTATIL_PAGE_SIZE — varsayılan 50
 *   WTATIL_STATUS — draft | published (varsayılan draft)
 *   DATABASE_URL veya PGHOST, PGPORT, PGUSER, PGPASSWORD, PGDATABASE — PostgreSQL
 */

import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  fetchWtatilToken,
  fetchAllTours,
  loadWtatilConfig,
} from './lib/wtatil-api.mjs'
import { enrichWtatilTour } from './lib/wtatil-enrich.mjs'
import { resolveImportContext, upsertWtatilTourListing } from './lib/wtatil-listing-db.mjs'
import { createPgClient } from './lib/pg-client.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const TRAVEL_ROOT = path.resolve(__dirname, '..')

const DEFAULT_ORG = 'a0000000-0000-4000-8000-000000000001'

const args = new Set(process.argv.slice(2))
const DRY_RUN = args.has('--dry-run')
const PING = args.has('--ping')
const ENRICH = args.has('--enrich') || args.has('--full')
const WITH_PRICES = args.has('--prices') || args.has('--full')
const limitIdx = process.argv.indexOf('--limit')
const LIMIT = limitIdx >= 0 ? Number(process.argv[limitIdx + 1]) : 0
const pageSizeIdx = process.argv.indexOf('--page-size')
const PAGE_SIZE = pageSizeIdx >= 0 ? Number(process.argv[pageSizeIdx + 1]) : Number(process.env.WTATIL_PAGE_SIZE || 50)

function pgClient() {
  return createPgClient()
}

async function enrichTour(userName, token, tour, agencyId) {
  return enrichWtatilTour(userName, token, tour, agencyId, { withPrices: WITH_PRICES })
}

async function main() {
  if (PING) {
    const { token, expireDate } = await fetchWtatilToken()
    console.log('Wtatil token OK, expireDate:', expireDate, 'token uzunluk:', token?.length ?? 0)
    return
  }

  const orgId = process.env.WTATIL_ORG_ID || DEFAULT_ORG
  const status = (process.env.WTATIL_STATUS || 'draft').toLowerCase() === 'published' ? 'published' : 'draft'
  const { agencyId } = loadWtatilConfig()

  if (WITH_PRICES && !agencyId) {
    console.warn('WTATIL_AGENCY_ID yok — fiyat zenginleştirmesi atlanır (--prices / --full).')
  }

  const { userName, token } = await fetchWtatilToken()
  console.log('Token alındı, katalog çekiliyor…')

  let tours = await fetchAllTours(userName, token, PAGE_SIZE)
  console.log(`API: ${tours.length} tur`)

  if (LIMIT > 0) tours = tours.slice(0, LIMIT)

  const client = pgClient()
  if (!DRY_RUN) await client.connect()

  try {
    const ctx = DRY_RUN ? { orgId, categoryId: null, localeTrId: null } : await resolveImportContext(client, orgId)

    let created = 0
    let updated = 0
    for (let i = 0; i < tours.length; i++) {
      const tour = tours[i]
      const label = `${tour.id} — ${String(tour.name || '').slice(0, 50)}`
      process.stdout.write(`[${i + 1}/${tours.length}] ${label} … `)

      let enrich = null
      if (ENRICH && !DRY_RUN) {
        enrich = await enrichTour(userName, token, tour, agencyId)
      }

      const result = await upsertWtatilTourListing(client, ctx, tour, {
        status,
        enrich,
        dryRun: DRY_RUN,
      })

      if (result.action === 'created') created += 1
      else if (result.action === 'updated') updated += 1
      console.log(result.action + (result.slug ? ` (${result.slug})` : ''))
    }

    console.log(`\nBitti: ${created} yeni, ${updated} güncelleme${DRY_RUN ? ' (dry-run)' : ''}.`)
  } finally {
    if (!DRY_RUN) await client.end()
  }
}

main().catch((err) => {
  console.error(err.message || err)
  process.exit(1)
})
