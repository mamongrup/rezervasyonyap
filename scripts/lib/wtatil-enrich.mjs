/**
 * Wtatil tur zenginleştirme — dönemler, fiyatlar, ulaşım.
 * getall-tour-period ile search-tour pencerelerini birleştirir.
 */
import {
  fetchTourPeriods,
  fetchTourPeriodPrices,
  fetchTourTransportDetail,
  searchTours,
  defaultSearchWindow,
} from './wtatil-api.mjs'

export function mergePeriodsById(existing, incoming) {
  const byId = new Map()
  for (const list of [existing, incoming]) {
    if (!Array.isArray(list)) continue
    for (const p of list) {
      if (!p || typeof p !== 'object') continue
      const id = p.id ?? p.periodId ?? p.tourPeriodId
      if (id != null) byId.set(String(id).trim(), p)
    }
  }
  return [...byId.values()].sort((a, b) => {
    const da = String(a.startDate || a.periodStartDate || '')
    const db = String(b.startDate || b.periodStartDate || '')
    return da.localeCompare(db)
  })
}

/**
 * search-tour — birden fazla tarih penceresi (Detail:0).
 * Wtatil bazen getall-tour-period'dan daha fazla satışa açık dönem döner.
 */
export async function searchTourPeriodsWide(userName, token, tourId, agencyId, opts = {}) {
  if (!agencyId) return []
  const windows = Number(opts.windows ?? 5)
  const windowDays = Number(opts.windowDays ?? 75)
  const daysAhead = Number(opts.daysAhead ?? 0)
  const delayMs = Number(opts.delayMs ?? 200)
  const byId = new Map()

  const base = new Date()
  base.setUTCDate(base.getUTCDate() + daysAhead)

  for (let w = 0; w < windows; w++) {
    const from = new Date(base)
    from.setUTCDate(from.getUTCDate() + w * windowDays)
    const to = new Date(from)
    to.setUTCDate(to.getUTCDate() + windowDays)

    try {
      const hits = await searchTours(userName, token, {
        agencyId,
        tourId,
        startDate: from.toISOString(),
        endDate: to.toISOString(),
        adultCount: 2,
        childCount: 0,
        detail: 0,
      })
      const row = hits.find((h) => Number(h.id) === Number(tourId)) || hits[0]
      for (const p of row?.periods || []) {
        const id = p?.id ?? p?.periodId ?? p?.tourPeriodId
        if (id != null) byId.set(String(id).trim(), p)
      }
    } catch (e) {
      console.warn(`  [uyarı] search-tour pencere ${w + 1}/${windows} tur ${tourId}: ${e.message}`)
    }

    if (delayMs > 0 && w + 1 < windows) {
      await new Promise((r) => setTimeout(r, delayMs))
    }
  }

  return [...byId.values()]
}

export async function enrichWtatilTour(userName, token, tour, agencyId, { withPrices = true } = {}) {
  const tourId = Number(tour.id)
  const enrich = {}

  try {
    enrich.periods = await fetchTourPeriods(userName, token, tourId)
  } catch (e) {
    console.warn(`  [uyarı] dönem tur ${tourId}: ${e.message}`)
    enrich.periods = []
  }

  if (withPrices && agencyId) {
    try {
      const searchPeriods = await searchTourPeriodsWide(userName, token, tourId, agencyId)
      enrich.periods = mergePeriodsById(enrich.periods, searchPeriods)

      const { startDate, endDate } = defaultSearchWindow(14, 90)
      const hits = await searchTours(userName, token, {
        agencyId,
        tourId,
        startDate,
        endDate,
        adultCount: 2,
        childCount: 0,
        detail: 0,
      })
      const row = hits.find((h) => Number(h.id) === tourId) || hits[0]
      if (row?.cheapestPrice) enrich.cheapestPrice = row.cheapestPrice
      if (row?.periods?.length) {
        enrich.periods = mergePeriodsById(enrich.periods, row.periods)
      }
    } catch (e) {
      console.warn(`  [uyarı] search-tour tur ${tourId}: ${e.message}`)
    }
  }

  const periodIds = (enrich.periods || [])
    .map((p) => p?.id ?? p?.periodId ?? p?.tourPeriodId)
    .filter((id) => id != null && String(id).trim())
  if (periodIds.length) {
    try {
      enrich.periodPrices = await fetchTourPeriodPrices(userName, token, periodIds)
    } catch (e) {
      console.warn(`  [uyarı] dönem fiyat tur ${tourId}: ${e.message}`)
    }
  }

  try {
    enrich.transport = await fetchTourTransportDetail(userName, token, tourId)
  } catch (e) {
    console.warn(`  [uyarı] ulaşım tur ${tourId}: ${e.message}`)
  }

  return enrich
}
