#!/usr/bin/env node
/**
 * Travelrobot günlük otomatik senkron — tur + otel (incremental) + uçuş rotaları.
 *
 *   node scripts/sync-travelrobot-auto.mjs --ping
 *   node scripts/sync-travelrobot-auto.mjs --dry-run
 *   node scripts/sync-travelrobot-auto.mjs --only tours|hotels|flights
 */
import {
  createTravelrobotToken,
  loadTravelrobotConfig,
  searchTours,
  pickTourRows,
  searchFlights,
} from './lib/travelrobot-api.mjs'
import {
  authenticateStatic,
  getAllHotelCodes,
  getHotelCodes,
  getBulkHotelContent,
} from './lib/travelrobot-static-api.mjs'
import { pickStaticHotelCodes, staticHotelRowsFromMap } from './lib/travelrobot-hotel-catalog.mjs'
import {
  resolveImportContext,
  upsertTravelrobotTourListing,
  upsertTravelrobotHotelListing,
  upsertTravelrobotFlightListing,
  buildStaticHotelMap,
} from './lib/travelrobot-listing-db.mjs'
import { enrichTravelrobotHotelRows } from './lib/travelrobot-hotel-enrich.mjs'
import {
  flightRowFromRouteSearch,
  loadTravelrobotFlightRoutes,
} from './lib/travelrobot-flight-routes.mjs'
import { createPgClient } from './lib/pg-client.mjs'
import { createJobReporter } from './lib/sync-job-reporter.mjs'

const args = new Set(process.argv.slice(2))
const PING = args.has('--ping')
const DRY_RUN = args.has('--dry-run')
const onlyIdx = process.argv.indexOf('--only')
const ONLY = onlyIdx >= 0 ? String(process.argv[onlyIdx + 1] || '').toLowerCase() : ''
const jobIdIdx = process.argv.indexOf('--job-id')
const JOB_ID = jobIdIdx >= 0 ? process.argv[jobIdIdx + 1] : (process.env.SYNC_JOB_ID || '')
const reporter = createJobReporter(JOB_ID)

const SYNC_KEY = 'travelrobot_last_sync'
const delayMs = Number(process.env.TRAVELROBOT_SYNC_DELAY_MS || 400)

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms))
}

async function readLastSync(client) {
  const r = await client.query(
    `SELECT value_json::text AS raw FROM site_settings
     WHERE key = $1 AND organization_id IS NULL ORDER BY id DESC LIMIT 1`,
    [SYNC_KEY],
  )
  if (!r.rows[0]?.raw) return null
  try {
    return JSON.parse(r.rows[0].raw)
  } catch {
    return null
  }
}

async function writeLastSync(client, patch) {
  const prev = (await readLastSync(client)) ?? {}
  const next = { ...prev, ...patch, at: new Date().toISOString() }
  await client.query(
    `INSERT INTO site_settings (organization_id, key, value_json)
     VALUES (NULL, $1, $2::jsonb)
     ON CONFLICT (key) WHERE organization_id IS NULL
     DO UPDATE SET value_json = excluded.value_json`,
    [SYNC_KEY, JSON.stringify(next)],
  )
}

async function resolveOrgId(client) {
  const r = await client.query(`SELECT id::text FROM organizations ORDER BY created_at LIMIT 1`)
  if (!r.rows[0]) throw new Error('organizations kaydı yok')
  return r.rows[0].id
}

async function syncTours(cfg, tokenCode, client, orgId) {
  if (!cfg.importTours) {
    await reporter.log('Tur: import_tours kapalı — atlandı')
    return { created: 0, updated: 0, skipped: 0 }
  }
  await reporter.log('Tur: SearchTour…')
  const payload = await searchTours(cfg, tokenCode)
  const rows = pickTourRows(payload)
  await reporter.log(`Tur: ${rows.length} aday`)
  const ctx = await resolveImportContext(client, orgId, 'tour')
  const status = cfg.listingStatus || 'published'
  let created = 0
  let updated = 0
  let skipped = 0
  for (let i = 0; i < rows.length; i++) {
    try {
      if (DRY_RUN) continue
      const result = await upsertTravelrobotTourListing(client, ctx, rows[i], { status })
      if (result.action === 'created') created++
      else updated++
    } catch (e) {
      skipped++
      console.error(`[tur] ${e.message}`)
    }
    if ((i + 1) % 25 === 0) await reporter.log(`Tur: ${i + 1}/${rows.length}…`)
  }
  return { created, updated, skipped, total: rows.length }
}

async function syncHotelsIncremental(cfg, tokenCode, client, orgId) {
  if (!cfg.importHotels) {
    await reporter.log('Otel: import_hotels kapalı — atlandı')
    return { created: 0, updated: 0, skipped: 0 }
  }
  const last = await readLastSync(client)
  const lastHotelAt = last?.hotels_at ?? null
  await reporter.log(`Otel: statik incremental${lastHotelAt ? ` (since ${lastHotelAt})` : ' (ilk tam tarama)'}…`)

  const { token: staticToken } = await authenticateStatic(cfg)
  let codes = []
  if (!lastHotelAt) {
    // İlk tarama: LastUpdateDateTime zorunlu olduğu için getHotelCodes atla
    await reporter.log('Otel: ilk tam tarama — getAllHotelCodes kullanılıyor…')
    const allPayload = await getAllHotelCodes(cfg, staticToken)
    codes = pickStaticHotelCodes(allPayload).slice(0, Number(process.env.TRAVELROBOT_SYNC_HOTEL_LIMIT || 200))
  } else {
    const codesPayload = await getHotelCodes(cfg, staticToken, {
      lastUpdateDateTime: lastHotelAt,
    })
    codes = pickStaticHotelCodes(codesPayload)
    if (!codes.length) {
      await reporter.log('Otel: incremental boş — yeni otel yok')
    }
  }
  await reporter.log(`Otel: ${codes.length} kod işlenecek`)
  if (!codes.length) return { created: 0, updated: 0, skipped: 0, total: 0 }

  const bulk = await getBulkHotelContent(cfg, staticToken, codes, { chunkSize: 50 })
  let rows = staticHotelRowsFromMap(buildStaticHotelMap(bulk))
  rows = await enrichTravelrobotHotelRows(cfg, tokenCode, rows, {
    withRooms: cfg.importHotelRooms !== false,
    skipStatic: true,
    log: (msg) => reporter.log(msg),
  })

  const ctx = await resolveImportContext(client, orgId, 'hotel')
  const status = cfg.listingStatus || 'published'
  let created = 0
  let updated = 0
  let skipped = 0
  for (const hotel of rows) {
    try {
      if (DRY_RUN) continue
      const result = await upsertTravelrobotHotelListing(client, ctx, hotel, { status })
      if (result.action === 'created') created++
      else updated++
    } catch (e) {
      skipped++
      console.error(`[otel] ${e.message}`)
    }
  }
  if (!DRY_RUN) await writeLastSync(client, { hotels_at: new Date().toISOString() })
  return { created, updated, skipped, total: rows.length }
}

async function syncFlights(cfg, tokenCode, client, orgId) {
  if (!cfg.importFlights) {
    await reporter.log('Uçuş: import_flights kapalı — atlandı')
    return { created: 0, updated: 0, skipped: 0 }
  }
  const routes = loadTravelrobotFlightRoutes()
  await reporter.log(`Uçuş: ${routes.length} rota`)
  const ctx = await resolveImportContext(client, orgId, 'flight')
  const status = cfg.listingStatus || 'published'
  let created = 0
  let updated = 0
  let skipped = 0

  for (let i = 0; i < routes.length; i++) {
    const route = routes[i]
    const key = `${route.origin}-${route.destination}`.toLowerCase()
    try {
      const payload = await searchFlights(cfg, tokenCode, {
        legs: [{ originCode: route.origin, destinationCode: route.destination }],
      })
      const flight = flightRowFromRouteSearch(route, payload)
      if (DRY_RUN) {
        await reporter.log(`[dry-run] ${key} — ${flight.offerCount ?? 0} teklif`)
        continue
      }
      const result = await upsertTravelrobotFlightListing(client, ctx, flight, { status })
      if (result.action === 'created') created++
      else updated++
      await reporter.log(`[${i + 1}/${routes.length}] ${key} — ${flight.offerCount ?? 0} teklif`)
    } catch (e) {
      skipped++
      console.error(`[uçuş] ${key}: ${e.message}`)
    }
    await sleep(delayMs)
  }
  return { created, updated, skipped, total: routes.length }
}

async function main() {
  const cfg = await loadTravelrobotConfig()
  const { tokenCode } = await createTravelrobotToken(cfg)
  if (PING) {
    console.log('Travelrobot sync ping OK, token:', tokenCode.length)
    return
  }

  const client = createPgClient()
  await client.connect()
  try {
    const orgId = await resolveOrgId(client)
    await reporter.start(0)
    const run = (name) => !ONLY || ONLY === name || ONLY === `${name}s`

    const parts = []
    if (run('tour')) parts.push(['tur', () => syncTours(cfg, tokenCode, client, orgId)])
    if (run('hotel')) parts.push(['otel', () => syncHotelsIncremental(cfg, tokenCode, client, orgId)])
    if (run('flight')) parts.push(['uçuş', () => syncFlights(cfg, tokenCode, client, orgId)])

    const summary = []
    for (const [label, fn] of parts) {
      const r = await fn()
      summary.push(`${label}: +${r.created} / ~${r.updated} (${r.total ?? 0} kayıt)`)
    }
    await reporter.done(`Senkron tamam — ${summary.join(' · ')}${DRY_RUN ? ' (dry-run)' : ''}`)
  } finally {
    await client.end()
  }
}

main().catch(async (e) => {
  await reporter.fail(e.message || String(e))
  process.exit(1)
})
