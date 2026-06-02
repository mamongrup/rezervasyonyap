/**
 * Wtatil tur dönem denetimi — API vs DB vs açıklama metni.
 *
 *   node scripts/audit-wtatil-tour-periods.mjs --tour-id 10011
 *   node scripts/audit-wtatil-tour-periods.mjs --tour-id 10011 --apply
 *   node scripts/audit-wtatil-tour-periods.mjs --limit 20
 *
 * Gerekli: WTATIL_* + WTATIL_AGENCY_ID, DATABASE_URL (DB karşılaştırması için)
 */
import {
  fetchWtatilToken,
  fetchTourPeriods,
  loadWtatilConfig,
} from './lib/wtatil-api.mjs'
import {
  enrichWtatilTour,
  mergePeriodsById,
  searchTourPeriodsWide,
} from './lib/wtatil-enrich.mjs'
import {
  findListingByWtatilRef,
  resolveImportContext,
  updateWtatilTourPricesOnly,
} from './lib/wtatil-listing-db.mjs'
import { createPgClient } from './lib/pg-client.mjs'

const DEFAULT_ORG = 'a0000000-0000-4000-8000-000000000001'

const tourIdIdx = process.argv.indexOf('--tour-id')
const TOUR_ID = tourIdIdx >= 0 ? Number(process.argv[tourIdIdx + 1]) : 0
const APPLY = process.argv.includes('--apply')
const limitIdx = process.argv.indexOf('--limit')
const LIMIT = limitIdx >= 0 ? Number(process.argv[limitIdx + 1]) : TOUR_ID ? 1 : 10

const TR_MONTHS =
  /(\d{1,2})\s*(Ocak|Şubat|Subat|Mart|Nisan|Mayıs|Mayis|Haziran|Temmuz|Ağustos|Agustos|Eylül|Eylul|Ekim|Kasım|Kasim|Aralık|Aralik)\s*(\d{2,4})/gi

function countFlightDatesInText(text) {
  if (!text) return 0
  const matches = [...String(text).matchAll(TR_MONTHS)]
  return new Set(matches.map((m) => `${m[1]}-${m[2]}-${m[3]}`)).size
}

function summarizePeriod(p) {
  return {
    id: p.id,
    start: p.startDate || p.periodStartDate,
    end: p.endDate || p.periodEndDate,
    price: p.totalPrice ?? p.tourPrice ?? p.double,
    quota: p.quota,
  }
}

async function auditOne(client, ctx, userName, token, agencyId, tourId) {
  const listingId = client ? await findListingByWtatilRef(client, ctx.orgId, String(tourId)) : null
  let dbPeriods = []
  let description = ''

  if (client && listingId) {
    const r = await client.query(
      `SELECT lt.description,
              ltd.program_days_json->'periods' AS periods
       FROM listings l
       JOIN listing_translations lt ON lt.listing_id = l.id
       JOIN listing_tour_details ltd ON ltd.listing_id = l.id
       WHERE l.id = $1::uuid
       LIMIT 1`,
      [listingId],
    )
    if (r.rows[0]) {
      description = r.rows[0].description || ''
      const p = r.rows[0].periods
      dbPeriods = Array.isArray(p) ? p : p ? [p] : []
    }
  }

  const apiPeriods = await fetchTourPeriods(userName, token, tourId)
  const searchPeriods = agencyId ? await searchTourPeriodsWide(userName, token, tourId, agencyId) : []
  const merged = mergePeriodsById(apiPeriods, searchPeriods)

  const flightHints = countFlightDatesInText(description)
  const report = {
    tourId,
    listingId,
    dbPeriodCount: dbPeriods.length,
    apiPeriodCount: apiPeriods.length,
    searchPeriodCount: searchPeriods.length,
    mergedPeriodCount: merged.length,
    flightDateHintsInDescription: flightHints,
    dbPeriods: dbPeriods.map(summarizePeriod),
    apiPeriods: apiPeriods.map(summarizePeriod),
    searchPeriods: searchPeriods.map(summarizePeriod),
    mergedPeriods: merged.map(summarizePeriod),
  }

  console.log(JSON.stringify(report, null, 2))

  if (APPLY && client && listingId && merged.length) {
    const enrich = await enrichWtatilTour(userName, token, { id: tourId }, agencyId, { withPrices: true })
    await updateWtatilTourPricesOnly(client, listingId, String(tourId), enrich)
    console.log(`[apply] ${tourId} → ${enrich.periods?.length ?? 0} dönem yazıldı`)
  }

  return report
}

async function main() {
  const { userName, token } = await fetchWtatilToken()
  const { agencyId } = loadWtatilConfig()
  const orgId = process.env.WTATIL_ORG_ID || DEFAULT_ORG

  const client = createPgClient()
  await client.connect()
  const ctx = await resolveImportContext(client, orgId)

  try {
    if (TOUR_ID) {
      await auditOne(client, ctx, userName, token, agencyId, TOUR_ID)
      return
    }

    const refs = await client.query(
      `SELECT l.external_listing_ref::text AS ref
       FROM listings l
       JOIN product_categories pc ON pc.id = l.category_id
       WHERE l.organization_id = $1::uuid
         AND pc.code = 'tour'
         AND l.external_provider_code = 'wtatil'
         AND l.external_listing_ref IS NOT NULL
       ORDER BY l.external_listing_ref
       LIMIT $2`,
      [ctx.orgId, LIMIT],
    )

    const mismatches = []
    for (const { ref } of refs.rows) {
      const tourId = Number(ref)
      const r = await auditOne(client, ctx, userName, token, agencyId, tourId)
      if (r.flightDateHintsInDescription > r.mergedPeriodCount) {
        mismatches.push({
          tourId,
          flightHints: r.flightDateHintsInDescription,
          periods: r.mergedPeriodCount,
        })
      }
    }

    if (mismatches.length) {
      console.log('\n=== Uçuş metninde daha çok tarih, az dönem ===')
      console.table(mismatches)
    }
  } finally {
    await client.end()
  }
}

main().catch((e) => {
  console.error(e.message || e)
  process.exit(1)
})
