import { describe, expect, it } from 'vitest'
import {
  listingDayOpenForStayNight,
  listingDayVisualStatus,
} from './listing-availability-day'
import {
  maxConsecutiveNightsFromStart,
  stayListingCalendarDaySelectable,
  stayRangeOvernightsAvailable,
} from './stay-booking-rules'
import type { ListingAvailabilityDay } from './travel-api'

function formatLocalYmd(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function dayRow(
  day: string,
  am: boolean,
  pm: boolean,
  is_available?: boolean,
): ListingAvailabilityDay {
  return {
    day,
    is_available: is_available ?? (am || pm),
    am_available: am,
    pm_available: pm,
    price_override: '',
  }
}

describe('listingDayVisualStatus', () => {
  it('shows turnover when both halves blocked but day still bookable', () => {
    expect(listingDayVisualStatus(dayRow('2026-07-11', false, false, true))).toBe('turnover')
  })

  it('shows blocked when panel fully closed the day', () => {
    expect(listingDayVisualStatus(dayRow('2026-07-11', false, false, false))).toBe('blocked')
  })
})

describe('stay half-day booking', () => {
  const days: ListingAvailabilityDay[] = [
    dayRow('2026-07-05', true, true),
    dayRow('2026-07-06', true, true),
    dayRow('2026-07-07', true, true),
    dayRow('2026-07-08', true, true),
    dayRow('2026-07-09', true, true),
    dayRow('2026-07-10', true, true),
    // turnover: sabah çıkış + öğleden sonra yeni giriş
    dayRow('2026-07-11', false, false, true),
  ]
  const byYmd = new Map(days.map((d) => [d.day, d]))
  const checkIn = new Date(2026, 6, 5)
  const checkOut = new Date(2026, 6, 11)
  const minDate = new Date(2026, 6, 1)

  it('allows 6-night stay ending on turnover checkout day', () => {
    expect(stayRangeOvernightsAvailable(checkIn, checkOut, byYmd, formatLocalYmd)).toBe(true)
    expect(maxConsecutiveNightsFromStart(checkIn, byYmd, formatLocalYmd)).toBe(6)
    expect(
      stayListingCalendarDaySelectable(checkOut, {
        effectiveMinDate: minDate,
        byYmd,
        startDate: checkIn,
        endDate: null,
        minNights: 5,
        formatLocalYmd,
      }),
    ).toBe(true)
  })

  it('requires PM on check-in and full nights in between', () => {
    expect(listingDayOpenForStayNight(byYmd.get('2026-07-05'), 0)).toBe(true)
    expect(listingDayOpenForStayNight(byYmd.get('2026-07-10'), 5)).toBe(true)
    expect(listingDayOpenForStayNight(byYmd.get('2026-07-11'), 6)).toBe(false)
  })
})

describe('computeStayRentalLodgingQuote availability', () => {
  it('marks turnover checkout range as available', async () => {
    const { computeStayRentalLodgingQuote } = await import('./stay-rental-range-quote')
    const days: ListingAvailabilityDay[] = [
      dayRow('2026-07-05', true, true),
      dayRow('2026-07-06', true, true),
      dayRow('2026-07-07', true, true),
      dayRow('2026-07-08', true, true),
      dayRow('2026-07-09', true, true),
      dayRow('2026-07-10', true, true),
      dayRow('2026-07-11', false, false, true),
    ]
    const quote = computeStayRentalLodgingQuote({
      days,
      priceRules: [],
      rangeStart: new Date(2026, 6, 5),
      rangeEnd: new Date(2026, 6, 11),
      fallbackNightly: 25,
    })
    expect(quote.nights).toBe(6)
    expect(quote.total).toBe(150)
    expect(quote.available).toBe(true)
  })
})
