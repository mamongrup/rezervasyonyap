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

  it('shows checkout when morning is occupied', () => {
    expect(listingDayVisualStatus(dayRow('2026-08-16', false, true, true))).toBe('checkout')
  })

  it('shows checkin when afternoon is occupied', () => {
    expect(listingDayVisualStatus(dayRow('2026-08-07', true, false, true))).toBe('checkin')
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

describe('single-block boundaries (turnover half-days)', () => {
  // Blok: 10–15 Ağu rezervasyon (geceler 10,11,12,13,14 dolu).
  //   10 Ağu: ÖÖ boş (önceki gece boş) + ÖS dolu (giriş)  -> checkin sınırı
  //   11–14 : tam dolu
  //   15 Ağu: ÖÖ dolu + ÖS boş (sonraki gece boş)          -> checkout sınırı
  const days: ListingAvailabilityDay[] = [
    dayRow('2026-08-05', true, true),
    dayRow('2026-08-06', true, true),
    dayRow('2026-08-07', true, true),
    dayRow('2026-08-08', true, true),
    dayRow('2026-08-09', true, true),
    dayRow('2026-08-10', true, false), // checkin sınırı (ÖÖ boş)
    dayRow('2026-08-11', false, false, false),
    dayRow('2026-08-12', false, false, false),
    dayRow('2026-08-13', false, false, false),
    dayRow('2026-08-14', false, false, false),
    dayRow('2026-08-15', false, true), // checkout sınırı (ÖS boş)
    dayRow('2026-08-16', true, true),
    dayRow('2026-08-17', true, true),
    dayRow('2026-08-18', true, true),
    dayRow('2026-08-19', true, true),
    dayRow('2026-08-20', true, true),
  ]
  const byYmd = new Map(days.map((d) => [d.day, d]))
  const minDate = new Date(2026, 7, 1)

  it('renders boundary visuals correctly', () => {
    expect(listingDayVisualStatus(byYmd.get('2026-08-10'))).toBe('checkin')
    expect(listingDayVisualStatus(byYmd.get('2026-08-15'))).toBe('checkout')
  })

  it('allows checkout on the first blocked day (5→10)', () => {
    const start = new Date(2026, 7, 5)
    const checkout = new Date(2026, 7, 10)
    expect(stayRangeOvernightsAvailable(start, checkout, byYmd, formatLocalYmd)).toBe(true)
    expect(
      stayListingCalendarDaySelectable(checkout, {
        effectiveMinDate: minDate,
        byYmd,
        startDate: start,
        endDate: null,
        minNights: 1,
        formatLocalYmd,
      }),
    ).toBe(true)
  })

  it('allows check-in on the checkout-boundary day (15→20)', () => {
    const checkin = new Date(2026, 7, 15)
    // Yeni giriş: 15 Ağu ÖS boş olduğundan başlangıç olarak seçilebilir
    expect(
      stayListingCalendarDaySelectable(checkin, {
        effectiveMinDate: minDate,
        byYmd,
        startDate: null,
        endDate: null,
        minNights: 1,
        formatLocalYmd,
      }),
    ).toBe(true)
    // 15→20 aralığı geçerli
    const checkout = new Date(2026, 7, 20)
    expect(stayRangeOvernightsAvailable(checkin, checkout, byYmd, formatLocalYmd)).toBe(true)
    expect(
      stayListingCalendarDaySelectable(checkout, {
        effectiveMinDate: minDate,
        byYmd,
        startDate: checkin,
        endDate: null,
        minNights: 1,
        formatLocalYmd,
      }),
    ).toBe(true)
  })

  it('allows reselecting an earlier check-in while a start is pending', () => {
    const start = new Date(2026, 7, 18) // 18 Ağu seçili, çıkış bekleniyor
    const opts = {
      effectiveMinDate: minDate,
      byYmd,
      startDate: start,
      endDate: null,
      minNights: 1,
      formatLocalYmd,
    }
    // daha erken serbest gün -> yeni giriş olarak seçilebilir (geri alma)
    expect(stayListingCalendarDaySelectable(new Date(2026, 7, 5), opts)).toBe(true)
    // 15 Ağu (çıkış sınırı, ÖS boş) erken de olsa giriş olabilir
    expect(stayListingCalendarDaySelectable(new Date(2026, 7, 15), opts)).toBe(true)
    // 10 Ağu (giriş sınırı, ÖS dolu) giriş olamaz
    expect(stayListingCalendarDaySelectable(new Date(2026, 7, 10), opts)).toBe(false)
  })

  it('does not allow starting a new stay on the checkin-boundary day (10)', () => {
    const day = new Date(2026, 7, 10)
    expect(
      stayListingCalendarDaySelectable(day, {
        effectiveMinDate: minDate,
        byYmd,
        startDate: null,
        endDate: null,
        minNights: 1,
        formatLocalYmd,
      }),
    ).toBe(false)
  })

  it('keeps pre-minimum checkout days paintable without making them valid checkouts', () => {
    const start = new Date(2026, 7, 23)
    const candidate = new Date(2026, 7, 24)
    const opts = {
      effectiveMinDate: minDate,
      byYmd,
      startDate: start,
      endDate: null,
      minNights: 3,
      formatLocalYmd,
    }

    expect(stayListingCalendarDaySelectable(candidate, opts)).toBe(false)
    expect(
      stayListingCalendarDaySelectable(candidate, { ...opts, allowBeforeMinStay: true }),
    ).toBe(true)
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
