import { describe, expect, it } from 'vitest'
import { listingTodayVisualStatus } from './listing-availability-day'
import type { ListingAvailabilityDay } from './travel-api'

function day(am: boolean, pm: boolean): ListingAvailabilityDay {
  return {
    day: '2026-08-19',
    is_available: am || pm,
    am_available: am,
    pm_available: pm,
    price_override: '',
  }
}

describe('listingTodayVisualStatus', () => {
  it('shows an available today as afternoon check-in', () => {
    expect(listingTodayVisualStatus(day(true, true))).toBe('checkout')
    expect(listingTodayVisualStatus(day(false, true))).toBe('checkout')
  })

  it('closes today when the afternoon is occupied', () => {
    expect(listingTodayVisualStatus(day(true, false))).toBe('blocked')
    expect(listingTodayVisualStatus(day(false, false))).toBe('blocked')
  })
})
