import {
  parseCheckoutGuestsFromSearchParams,
  parseCheckoutTripDate,
} from '@/lib/stay-checkout-url'
import { DEFAULT_GUESTS_STAY } from '@/lib/guest-search-defaults'
import type { SearchQuery } from '@/lib/listings-fetcher'
import type { GuestsObject } from '@/type'

/** Kategori arama → ilan detay URL query (tarih / misafir / çocuk yaşları). */
export function buildStayDetailSearchQuery(query: SearchQuery): string | undefined {
  const qs = new URLSearchParams()
  const checkin = query.checkin?.trim() || query.from?.trim()
  const checkout = query.checkout?.trim() || query.to?.trim()
  if (checkin) qs.set('checkIn', checkin)
  if (checkout) qs.set('checkOut', checkout)

  const adultsRaw = query.guestAdults?.trim()
  const childrenRaw = query.guestChildren?.trim()
  const infantsRaw = query.guestInfants?.trim()
  const agesRaw = query.childAges?.trim()
  const guestsRaw = query.guests?.trim()

  const adults = adultsRaw ? parseInt(adultsRaw, 10) : NaN
  const children = childrenRaw ? parseInt(childrenRaw, 10) : NaN
  const infants = infantsRaw ? parseInt(infantsRaw, 10) : NaN
  const hasBreakdown =
    (Number.isFinite(adults) && adults >= 1) ||
    (Number.isFinite(children) && children >= 1) ||
    (Number.isFinite(infants) && infants >= 1)

  if (hasBreakdown) {
    qs.set('guestAdults', String(Number.isFinite(adults) && adults >= 1 ? adults : 2))
    if (Number.isFinite(children) && children > 0) qs.set('guestChildren', String(children))
    if (Number.isFinite(infants) && infants > 0) qs.set('guestInfants', String(infants))
    if (agesRaw && Number.isFinite(children) && children > 0) qs.set('childAges', agesRaw)
  } else if (guestsRaw) {
    const g = parseInt(guestsRaw, 10)
    if (Number.isFinite(g) && g >= 1) qs.set('guestAdults', String(g))
  }

  const s = qs.toString()
  return s || undefined
}

/** İlan detay / arama URL'sinden konaklama tarih aralığı (checkIn, checkOut, startDate, endDate, checkin). */
export function parseStayListingDatesFromSearchParams(
  searchParams: URLSearchParams,
): { start: Date | null; end: Date | null } {
  const startRaw =
    searchParams.get('checkIn')?.trim() ||
    searchParams.get('startDate')?.trim() ||
    searchParams.get('checkin')?.trim() ||
    ''
  const endRaw =
    searchParams.get('checkOut')?.trim() ||
    searchParams.get('endDate')?.trim() ||
    searchParams.get('checkout')?.trim() ||
    ''
  const start = parseCheckoutTripDate(startRaw || null)
  const end = parseCheckoutTripDate(endRaw || null)
  if (start && end && end.getTime() > start.getTime()) {
    return { start, end }
  }
  return { start: null, end: null }
}

export function parseStayListingGuestsFromSearchParams(
  searchParams: URLSearchParams,
): GuestsObject {
  return parseCheckoutGuestsFromSearchParams(searchParams)
}

export function parsePoolHeatingFromSearchParams(searchParams: URLSearchParams): boolean {
  const v = searchParams.get('pool_heating')?.trim()
  return v === '1' || v === 'true'
}

export function defaultStayListingGuests(): GuestsObject {
  return { ...DEFAULT_GUESTS_STAY }
}
