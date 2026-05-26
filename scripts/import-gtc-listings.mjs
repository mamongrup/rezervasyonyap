/**
 * GTC Reservation API → PostgreSQL otel + uçak ilanı aktarımı.
 *
 * Ortam:
 *   GTC_BASE_URL, GTC_AGENCY_ID, GTC_PASSWORD (zorunlu)
 *   GTC_ORG_ID — varsayılan a0000000-0000-4000-8000-000000000001
 *   GTC_STATUS — draft | published (varsayılan draft)
 *   PGHOST, PGPORT, PGUSER, PGPASSWORD, PGDATABASE
 *
 * Kullanım:
 *   node scripts/import-gtc-listings.mjs
 *   node scripts/import-gtc-listings.mjs --dry-run --limit 5
 *   node scripts/import-gtc-listings.mjs --hotels-only --limit 50
 *   node scripts/import-gtc-listings.mjs --flights-only
 */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'
import {
  fetchAirLowSearch,
  fetchAirPortProfile,
  fetchHotelCatalogPage,
  fetchHotelDetail,
  hotelItemId,
  loadGtcConfig,
  pickHotelRows,
} from './lib/gtc-api.mjs'
import {
  resolveImportContext,
  upsertGtcFlightListing,
  upsertGtcHotelListing,
} from './lib/gtc-listing-db.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const TRAVEL_ROOT = path.resolve(__dirname, '..')
const require = createRequire(path.join(TRAVEL_ROOT, 'frontend', 'package.json'))
const pg = require('pg')

const DEFAULT_ORG = 'a0000000-0000-4000-8000-000000000001'
const ROUTES_PATH = path.join(__dirname, 'config', 'gtc-flight-routes.json')

const args = new Set(process.argv.slice(2))
const DRY_RUN = args.has('--dry-run')
const HOTELS_ONLY = args.has('--hotels-only')
const FLIGHTS_ONLY = args.has('--flights-only')
const WITH_DETAIL = args.has('--detail')
const limitIdx = process.argv.indexOf('--limit')
const LIMIT = limitIdx >= 0 ? Number(process.argv[limitIdx + 1]) : 0

function pgClient() {
  return new pg.Client({
    host: process.env.PGHOST || '127.0.0.1',
    port: Number(process.env.PGPORT || 5432),
    user: process.env.PGUSER || 'postgres',
    password: process.env.PGPASSWORD || '',
    database: process.env.PGDATABASE || 'travel',
  })
}

function loadFlightRoutes() {
  if (!fs.existsSync(ROUTES_PATH)) {
    throw new Error(`Uçak rota dosyası yok: ${ROUTES_PATH} (örnek: gtc-flight-routes.example.json)`)
  }
  const raw = fs.readFileSync(ROUTES_PATH, 'utf8').trim()
  const parsed = JSON.parse(raw || '[]')
  if (!Array.isArray(parsed) || parsed.length === 0) {
    throw new Error(`${ROUTES_PATH} boş — en az bir rota tanımlayın`)
  }
  return parsed
}

async function importHotels(client, orgId, status) {
  loadGtcConfig()
  const ctx = await resolveImportContext(client, orgId, 'hotel')
  let page = 1
  let processed = 0
  let created = 0
  let updated = 0

  while (true) {
    const payload = await fetchHotelCatalogPage(page, 50)
    const rows = pickHotelRows(payload)
    if (!rows.length) break

    for (const row of rows) {
      if (LIMIT > 0 && processed >= LIMIT) return { processed, created, updated }
      const itemId = hotelItemId(row)
      if (!itemId) continue

      let detail = null
      if (WITH_DETAIL) {
        try {
          detail = await fetchHotelDetail(itemId)
        } catch (e) {
          console.warn(`  [uyarı] otel detay ${itemId}: ${e.message}`)
        }
      }

      const out = await upsertGtcHotelListing(client, ctx, row, {
        detail,
        status,
        dryRun: DRY_RUN,
      })
      processed += 1
      if (out.created) created += 1
      else if (!DRY_RUN) updated += 1
      console.log(`  [otel] ${out.action || 'ok'} ${itemId} ${out.slug}`)
    }

    if (rows.length < 50) break
    page += 1
  }

  return { processed, created, updated }
}

async function importFlights(client, orgId, status) {
  loadGtcConfig()
  const ctx = await resolveImportContext(client, orgId, 'flight')
  const routes = loadFlightRoutes()
  let processed = 0
  let created = 0
  let updated = 0

  try {
    await fetchAirPortProfile()
  } catch (e) {
    console.warn(`  [uyarı] AirPortProfile: ${e.message}`)
  }

  for (const route of routes) {
    if (LIMIT > 0 && processed >= LIMIT) break
    if (!route?.origin || !route?.destination) continue

    let searchPayload = null
    try {
      searchPayload = await fetchAirLowSearch(route)
    } catch (e) {
      console.warn(`  [uyarı] rota ${route.origin}-${route.destination}: ${e.message}`)
      continue
    }

    const out = await upsertGtcFlightListing(client, ctx, route, searchPayload, {
      status,
      dryRun: DRY_RUN,
    })
    processed += 1
    if (out.created) created += 1
    else if (!DRY_RUN) updated += 1
    console.log(`  [uçak] ${out.action || 'ok'} ${route.origin}-${route.destination} ${out.slug}`)
  }

  return { processed, created, updated }
}

async function main() {
  const orgId = process.env.GTC_ORG_ID || DEFAULT_ORG
  const status = process.env.GTC_STATUS === 'published' ? 'published' : 'draft'
  const runHotels = !FLIGHTS_ONLY
  const runFlights = !HOTELS_ONLY

  console.log(`GTC import başlıyor (dry-run=${DRY_RUN}, status=${status})`)
  loadGtcConfig()

  const client = pgClient()
  await client.connect()
  try {
    if (runHotels) {
      console.log('Oteller…')
      const h = await importHotels(client, orgId, status)
      console.log(`Oteller: işlenen=${h.processed}, yeni=${h.created}, güncellenen=${h.updated}`)
    }
    if (runFlights) {
      console.log('Uçak rotaları…')
      const f = await importFlights(client, orgId, status)
      console.log(`Uçak: işlenen=${f.processed}, yeni=${f.created}, güncellenen=${f.updated}`)
    }
  } finally {
    await client.end()
  }
}

main().catch((e) => {
  console.error(e.message || e)
  process.exit(1)
})
