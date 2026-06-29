/**
 * Yolcu360 araç kiralama → PostgreSQL car_rental ilanları.
 *
 * Ortam:
 *   YOLCU360_API_KEY, YOLCU360_API_SECRET (zorunlu — panelden de okunur)
 *   YOLCU360_BASE_URL — varsayılan staging.api.pro.yolcu360.com/api/v1
 *   YOLCU360_STATUS — draft | published (varsayılan published)
 *   YOLCU360_ORG_ID — varsayılan a0000000-0000-4000-8000-000000000001
 *   YOLCU360_CHECKIN_OFFSET_DAYS — varsayılan 7
 *   YOLCU360_PER_ROUTE_LIMIT — rota başına max araç (varsayılan 25)
 *
 * Kullanım:
 *   node scripts/import-yolcu360-cars.mjs --ping
 *   node scripts/import-yolcu360-cars.mjs --dry-run --limit 2
 *   node scripts/import-yolcu360-cars.mjs --limit 5
 *
 * Rota listesi: scripts/config/yolcu360-car-routes.json
 */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { fetchYolcu360CarSearch, loadYolcu360ConfigAsync, pingYolcu360 } from './lib/yolcu360-api.mjs'
import { normalizeYolcu360Cars, isPlausiblyPricedCar } from './lib/yolcu360-cars.mjs'
import { resolveImportContext, routeKey, upsertYolcu360CarListing } from './lib/yolcu360-listing-db.mjs'
import { createPgClient } from './lib/pg-client.mjs'
import { createJobReporter } from './lib/sync-job-reporter.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROUTES_PATH = path.join(__dirname, 'config', 'yolcu360-car-routes.json')
const DEFAULT_ORG = 'a0000000-0000-4000-8000-000000000001'

const args = new Set(process.argv.slice(2))
const DRY_RUN = args.has('--dry-run')
const PING = args.has('--ping')

const limitIdx = process.argv.indexOf('--limit')
const LIMIT = limitIdx >= 0 ? Number(process.argv[limitIdx + 1]) : 0

const perRouteIdx = process.argv.indexOf('--per-route-limit')
const PER_ROUTE_LIMIT =
  perRouteIdx >= 0
    ? Number(process.argv[perRouteIdx + 1])
    : Number(process.env.YOLCU360_PER_ROUTE_LIMIT || 25)

const jobIdIdx = process.argv.indexOf('--job-id')
const JOB_ID = jobIdIdx >= 0 ? process.argv[jobIdIdx + 1] : (process.env.SYNC_JOB_ID || '')
const reporter = createJobReporter(JOB_ID)

const CHECKIN_OFFSET_DAYS = Number(process.env.YOLCU360_CHECKIN_OFFSET_DAYS || 7)
const RENTAL_DAYS_DEFAULT = Number(process.env.YOLCU360_RENTAL_DAYS || 3)

function loadCarRoutes() {
  if (!fs.existsSync(ROUTES_PATH)) {
    throw new Error(
      `Rota dosyası yok: ${ROUTES_PATH} (örnek: scripts/config/yolcu360-car-routes.example.json)`,
    )
  }
  const parsed = JSON.parse(fs.readFileSync(ROUTES_PATH, 'utf8').trim() || '[]')
  if (!Array.isArray(parsed) || !parsed.length) throw new Error(`${ROUTES_PATH} boş`)
  return parsed
}

function isoDate(d) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function buildSearchDates(route) {
  const rentalDays = Number(route.rentalDays || RENTAL_DAYS_DEFAULT)
  const checkinDate = new Date()
  checkinDate.setDate(checkinDate.getDate() + CHECKIN_OFFSET_DAYS)
  const checkoutDate = new Date(checkinDate)
  checkoutDate.setDate(checkoutDate.getDate() + (Number.isFinite(rentalDays) && rentalDays > 0 ? rentalDays : 3))
  return {
    checkin: `${isoDate(checkinDate)}T10:00`,
    checkout: `${isoDate(checkoutDate)}T10:00`,
  }
}

function enrichRoute(route) {
  const dates = buildSearchDates(route)
  return {
    ...route,
    dropoff: route.dropoff || route.pickup,
    checkin: route.checkin || dates.checkin,
    checkout: route.checkout || dates.checkout,
  }
}

async function main() {
  const cfg = await loadYolcu360ConfigAsync()
  console.log(`[yolcu360] baseUrl=${cfg.baseUrl} enabled=${cfg.enabled}`)

  if (PING) {
    const out = await pingYolcu360(cfg)
    console.log('Yolcu360 ping OK', out)
    return
  }

  const orgId = process.env.YOLCU360_ORG_ID || DEFAULT_ORG
  const status =
    (process.env.YOLCU360_STATUS || cfg.listingStatus || 'published').toLowerCase() === 'draft'
      ? 'draft'
      : 'published'
  const routes = loadCarRoutes().map(enrichRoute)
  const slice = LIMIT > 0 ? routes.slice(0, LIMIT) : routes

  await reporter.start(slice.length)

  const client = createPgClient()
  if (!DRY_RUN) await client.connect()

  try {
    const ctx = DRY_RUN
      ? { orgId, categoryId: null, localeTrId: null }
      : await resolveImportContext(client, orgId)
    let created = 0
    let updated = 0
    let skipped = 0

    for (let i = 0; i < slice.length; i++) {
      const route = slice[i]
      if (!route?.pickup) continue
      const key = routeKey(route)
      const msg = `[yolcu360] ${key} (${route.checkin} → ${route.checkout}) …`
      await reporter.step(msg, i, slice.length)

      let searchPayload = null
      let cars = []
      try {
        const { json } = await fetchYolcu360CarSearch(route, { cfg })
        searchPayload = json
        cars = normalizeYolcu360Cars(json).filter(isPlausiblyPricedCar)
      } catch (e) {
        skipped += 1
        console.log(`atlandı (${e.message})`)
        continue
      }

      const carSlice =
        PER_ROUTE_LIMIT > 0 && cars.length > PER_ROUTE_LIMIT ? cars.slice(0, PER_ROUTE_LIMIT) : cars

      if (!carSlice.length) {
        skipped += 1
        console.log('sonuç yok')
        continue
      }

      for (const car of carSlice) {
        const out = await upsertYolcu360CarListing(client, ctx, route, car, searchPayload, {
          status,
          dryRun: DRY_RUN,
        })
        if (out.created) created += 1
        else if (!DRY_RUN && out.action === 'updated') updated += 1
        const priceNote = out.price != null ? ` ₺${out.price}` : ''
        console.log(`  ${out.action}${out.slug ? ` (${out.slug})` : ''}${priceNote}`)
      }
    }

    const summary = `Bitti: ${created} yeni, ${updated} güncelleme, ${skipped} rota atlandı${DRY_RUN ? ' (dry-run)' : ''}.`
    console.log(`\n${summary}`)
    await reporter.done(summary)
  } catch (e) {
    await reporter.fail(e?.message || String(e))
    throw e
  } finally {
    if (!DRY_RUN) await client.end()
  }
}

main().catch((e) => {
  console.error(e.message || e)
  process.exit(1)
})
