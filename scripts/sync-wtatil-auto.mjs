/**
 * Wtatil ↔ site otomatik senkron (günlük zamanlayıcı hedefi).
 *
 * 1) Yayında/taslak tüm wtatil turları: dönem + fiyat API'den (replace — Stop&Sale yansır)
 * 2) API'de olup DB'de olmayan yeni turlar: sınırlı sayıda import (--import-new-limit)
 *
 *   node scripts/sync-wtatil-auto.mjs --ping
 *   node scripts/sync-wtatil-auto.mjs --dry-run --limit 5
 *   node scripts/sync-wtatil-auto.mjs
 *
 * Env: DATABASE_URL veya PG*, WTATIL_*, WTATIL_AGENCY_ID (search-tour / dönem)
 *      WTATIL_AUTO_IMPORT_NEW_LIMIT=10 (varsayılan)
 *      WTATIL_SYNC_DELAY_MS=350
 */
import {
  fetchWtatilToken,
  fetchAllTours,
  loadWtatilConfigAsync,
} from './lib/wtatil-api.mjs'
import { enrichWtatilTour } from './lib/wtatil-enrich.mjs'
import {
  resolveImportContext,
  findListingByWtatilRef,
  updateWtatilTourPricesOnly,
  upsertWtatilTourListing,
  refreshWtatilTourVitrin,
} from './lib/wtatil-listing-db.mjs'
import { createPgClient } from './lib/pg-client.mjs'
import { createJobReporter } from './lib/sync-job-reporter.mjs'

const DEFAULT_ORG = 'a0000000-0000-4000-8000-000000000001'

const args = new Set(process.argv.slice(2))
const DRY_RUN = args.has('--dry-run')
const PING = args.has('--ping')

const jobIdIdx = process.argv.indexOf('--job-id')
const JOB_ID = jobIdIdx >= 0 ? process.argv[jobIdIdx + 1] : (process.env.SYNC_JOB_ID || '')
const reporter = createJobReporter(JOB_ID)
const SKIP_NEW = args.has('--skip-new')
const limitIdx = process.argv.indexOf('--limit')
const LIMIT = limitIdx >= 0 ? Number(process.argv[limitIdx + 1]) : 0
const newLimitIdx = process.argv.indexOf('--import-new-limit')
const IMPORT_NEW_LIMIT =
  newLimitIdx >= 0
    ? Number(process.argv[newLimitIdx + 1])
    : Number(process.env.WTATIL_AUTO_IMPORT_NEW_LIMIT || 10)
const pageSizeIdx = process.argv.indexOf('--page-size')
const PAGE_SIZE =
  pageSizeIdx >= 0 ? Number(process.argv[pageSizeIdx + 1]) : Number(process.env.WTATIL_PAGE_SIZE || 50)
const delayMs = Number(process.env.WTATIL_SYNC_DELAY_MS || 350)
const STATUS = (process.env.WTATIL_STATUS || 'published').toLowerCase() === 'published' ? 'published' : 'draft'

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms))
}

function pickCurrency(tour) {
  const c = tour?.currency?.code || tour?.currency?.name || 'TRY'
  const x = String(c).trim().toUpperCase()
  if (x === 'TRY' || x === 'EUR' || x === 'USD' || x === 'GBP') return x
  return 'TRY'
}

async function main() {
  if (PING) {
    const { token, expireDate } = await fetchWtatilToken()
    console.log('Wtatil auto-sync ping OK, expireDate:', expireDate)
    return
  }

  await reporter.start(0)

  const orgId = process.env.WTATIL_ORG_ID || DEFAULT_ORG
  const { agencyId } = await loadWtatilConfigAsync()
  if (!agencyId) {
    console.warn('[WARN] WTATIL_AGENCY_ID yok — search-tour / ek dönem penceresi sınırlı kalır.')
  }

  let auth = await fetchWtatilToken()
  let authFetchedAt = Date.now()

  async function ensureFreshToken() {
    const expMs = auth.expireDate ? new Date(auth.expireDate).getTime() : NaN
    const expireSoon = Number.isFinite(expMs) && expMs - Date.now() < 5 * 60 * 1000
    const stale = Date.now() - authFetchedAt > 20 * 60 * 1000
    if (!expireSoon && !stale) return
    auth = await fetchWtatilToken()
    authFetchedAt = Date.now()
    console.log(`\n[wtatil] token yenilendi (expireDate: ${auth.expireDate || '?'})`)
  }

  await reporter.log('Token alındı, katalog çekiliyor…')

  const tours = await fetchAllTours(auth.userName, auth.token, PAGE_SIZE)
  const tourById = new Map(tours.map((t) => [String(t.id), t]))
  await reporter.log(`API katalog: ${tours.length} tur`)

  const client = createPgClient()
  if (!DRY_RUN) await client.connect()

  try {
    const ctx = await resolveImportContext(client, orgId)

    const refsRes = await client.query(
      `SELECT l.external_listing_ref::text AS ref
       FROM listings l
       JOIN product_categories pc ON pc.id = l.category_id
       WHERE l.organization_id = $1::uuid
         AND pc.code = 'tour'
         AND l.external_provider_code = 'wtatil'
         AND l.external_listing_ref IS NOT NULL
       ORDER BY l.external_listing_ref`,
      [ctx.orgId],
    )
    const dbRefs = new Set(refsRes.rows.map((r) => r.ref).filter(Boolean))
    let targets = [...dbRefs]
    if (LIMIT > 0) targets = targets.slice(0, LIMIT)

    console.log(`\n=== Mevcut turlar: dönem+fiyat (replace) — ${targets.length} hedef ===`)

    let syncOk = 0
    let syncNoPrice = 0
    let syncSkipped = 0
    const totalTargets = targets.length
    await reporter.step('Senkron başlıyor…', 0, totalTargets)

    for (let i = 0; i < targets.length; i++) {
      const ref = targets[i]
      const tour = tourById.get(ref)
      if (!tour) {
        syncSkipped += 1
        await reporter.step(`[sync ${i + 1}/${targets.length}] ${ref} … API katalogda yok`, i + 1, totalTargets)
        continue
      }

      const label = `${ref} — ${String(tour.name || '').slice(0, 40)}`
      process.stdout.write(`[sync ${i + 1}/${targets.length}] ${label} … `)

      if (DRY_RUN) {
        console.log('dry-run')
        continue
      }

      const listingId = await findListingByWtatilRef(client, ctx.orgId, ref)
      if (!listingId) {
        syncSkipped += 1
        console.log('DB yok')
        continue
      }

      await ensureFreshToken()
      const enrich = await enrichWtatilTour(auth.userName, auth.token, tour, agencyId, { withPrices: true })
      const result = await updateWtatilTourPricesOnly(client, listingId, ref, enrich, {
        currencyCode: pickCurrency(tour),
        replacePeriods: true,
      })

      await refreshWtatilTourVitrin(client, ctx, listingId, tour, enrich)

      const periodCount = Array.isArray(enrich.periods) ? enrich.periods.length : 0
      if (result.cheapest_price != null) {
        syncOk += 1
        await reporter.step(`${label}: ${periodCount} dönem, fiyat: ${result.cheapest_price}`, i + 1, totalTargets)
      } else {
        syncNoPrice += 1
        await reporter.step(`${label}: ${periodCount} dönem, fiyat yok`, i + 1, totalTargets)
      }

      if (delayMs > 0 && i + 1 < targets.length) await sleep(delayMs)
    }

    let imported = 0
    if (!SKIP_NEW && IMPORT_NEW_LIMIT > 0) {
      await reporter.log(`\n=== Yeni turlar (API → DB, max ${IMPORT_NEW_LIMIT}) ===`)
      for (const tour of tours) {
        if (imported >= IMPORT_NEW_LIMIT) break
        const ref = String(tour.id)
        if (dbRefs.has(ref)) continue

        const label = `${ref} — ${String(tour.name || '').slice(0, 40)}`
        process.stdout.write(`[new ${imported + 1}] ${label} … `)

        if (DRY_RUN) {
          console.log('dry-run')
          imported += 1
          continue
        }

        await ensureFreshToken()
      const enrich = await enrichWtatilTour(auth.userName, auth.token, tour, agencyId, { withPrices: true })
        const row = await upsertWtatilTourListing(client, ctx, tour, {
          status: STATUS,
          enrich,
        })
        imported += 1
        await reporter.log(`[new ${imported}] ${row.action} ${row.slug}`)

        if (delayMs > 0) await sleep(delayMs)
      }
    }

    const summary = `Bitti: sync ${syncOk} fiyatlı, ${syncNoPrice} fiyatsız, ${syncSkipped} atlandı; yeni import ${imported}${DRY_RUN ? ' (dry-run)' : ''}.`
    await reporter.done(summary)
  } finally {
    if (!DRY_RUN) await client.end()
  }
}

main().catch(async (err) => {
  await reporter.fail(err.message || String(err))
  process.exit(1)
})
