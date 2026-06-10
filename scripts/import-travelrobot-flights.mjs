/**
 * Travelrobot uçuş import — rota bazlı SearchAvailability (canlı API).
 *
 *   node scripts/import-travelrobot-flights.mjs --ping
 *   node scripts/import-travelrobot-flights.mjs --dry-run --limit 5
 *   node scripts/import-travelrobot-flights.mjs
 *
 * Rotalar: scripts/config/travelrobot-flight-routes.json
 */

import { createTravelrobotToken, loadTravelrobotConfig, searchFlights } from './lib/travelrobot-api.mjs'
import { resolveImportContext, upsertTravelrobotFlightListing } from './lib/travelrobot-listing-db.mjs'
import {
  flightRowFromRouteSearch,
  loadTravelrobotFlightRoutes,
} from './lib/travelrobot-flight-routes.mjs'
import { createPgClient } from './lib/pg-client.mjs'

const args = new Set(process.argv.slice(2))
const PING = args.has('--ping')
const DRY_RUN = args.has('--dry-run')
const limitIdx = process.argv.indexOf('--limit')
const LIMIT = limitIdx >= 0 ? Number(process.argv[limitIdx + 1]) : 0
const orgIdIdx = process.argv.indexOf('--org-id')
const ORG_ID = orgIdIdx >= 0 ? process.argv[orgIdIdx + 1] : (process.env.IMPORT_ORG_ID ?? '')
const delayMs = Number(process.env.TRAVELROBOT_FLIGHT_DELAY_MS || 400)

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms))
}

async function resolveOrgId(pgClient) {
  if (ORG_ID) return ORG_ID
  const r = await pgClient.query(`SELECT id::text FROM organizations ORDER BY created_at LIMIT 1`)
  if (!r.rows[0]) throw new Error('organizations tablosunda kayıt yok; --org-id <uuid> ile belirtin')
  return r.rows[0].id
}

async function main() {
  const cfg = await loadTravelrobotConfig()
  if (!cfg.enabled && !PING) {
    console.warn('[uyarı] Travelrobot panelde kapalı (enabled=false) — yine de devam ediliyor')
  }
  if (!cfg.importFlights && !PING) {
    console.warn('[uyarı] import_flights=false — apply-travelrobot-live-config veya panelden açın')
  }

  const { tokenCode } = await createTravelrobotToken(cfg)
  if (PING) {
    console.log('Travelrobot token OK, uzunluk:', tokenCode.length)
    return
  }

  const routes = loadTravelrobotFlightRoutes()
  const slice = LIMIT > 0 ? routes.slice(0, LIMIT) : routes
  console.log(`Uçuş: ${slice.length} rota işlenecek (${cfg.baseUrl})`)

  const client = createPgClient()
  if (!DRY_RUN) await client.connect()

  try {
    const orgId = DRY_RUN ? ORG_ID : await resolveOrgId(client)
    const ctx = DRY_RUN
      ? { orgId, categoryId: null, localeTrId: null }
      : await resolveImportContext(client, orgId, 'flight')
    const status = cfg.listingStatus || 'published'

    let created = 0
    let updated = 0
    let skipped = 0

    for (let i = 0; i < slice.length; i++) {
      const route = slice[i]
      const key = `${route.origin}-${route.destination}`.toLowerCase()
      process.stdout.write(`[${i + 1}/${slice.length}] ${key} … `)
      try {
        const payload = await searchFlights(cfg, tokenCode, {
          legs: [{ originCode: route.origin, destinationCode: route.destination }],
        })
        const flight = flightRowFromRouteSearch(route, payload)
        if (DRY_RUN) {
          console.log(`dry-run (${flight.offerCount ?? 0} teklif)`)
          continue
        }
        const result = await upsertTravelrobotFlightListing(client, ctx, flight, { status })
        if (result.action === 'created') created++
        else updated++
        const priceNote = result.price != null ? ` ₺${result.price}` : ''
        console.log(`${result.action}${result.slug ? ` (${result.slug})` : ''}${priceNote}`)
      } catch (e) {
        skipped++
        console.log(`atlandı (${e.message})`)
      }
      await sleep(delayMs)
    }

    console.log(`\nTamamlandı: ${created} yeni, ${updated} güncellendi, ${skipped} atlandı${DRY_RUN ? ' (dry-run)' : ''}`)
  } finally {
    if (!DRY_RUN) await client.end()
  }
}

main().catch((e) => {
  console.error(e.message || e)
  process.exit(1)
})
