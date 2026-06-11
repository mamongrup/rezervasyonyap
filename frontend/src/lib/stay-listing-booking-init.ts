import {
  parseCheckoutGuestsFromSearchParams,
  parseCheckoutTripDate,
} from '@/lib/stay-checkout-url'
import { DEFAULT_GUESTS_STAY } from '@/lib/guest-search-defaults'
import type { GuestsObject } from '@/type'

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
