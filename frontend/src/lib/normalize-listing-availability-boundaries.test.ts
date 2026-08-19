import { describe, expect, it } from 'vitest'
import type { ListingAvailabilityDay } from '@/lib/travel-api'
import { normalizeOrphanHalfDayBoundaries } from './normalize-listing-availability-boundaries'

function day(value: string, am: boolean, pm: boolean): ListingAvailabilityDay {
  return { day: value, is_available: am || pm, am_available: am, pm_available: pm, price_override: '' }
}

describe('normalizeOrphanHalfDayBoundaries', () => {
  it('adds only the checkout boundary after legacy fully blocked ranges', () => {
    const result = normalizeOrphanHalfDayBoundaries([
      day('2026-09-01', true, true),
      day('2026-09-02', false, false),
      day('2026-09-03', false, false),
      day('2026-09-04', false, false),
      day('2026-09-05', true, true),
    ])

    expect(result.map((row) => [row.am_available, row.pm_available])).toEqual([
      [true, true],
      [false, false],
      [false, false],
      [false, false],
      [false, true],
    ])
  })

  it('keeps real range boundaries and removes a duplicate checkout', () => {
    const result = normalizeOrphanHalfDayBoundaries([
      day('2026-08-18', true, false),
      day('2026-08-19', false, false),
      day('2026-08-20', false, false),
      day('2026-08-21', false, true),
      day('2026-08-22', false, true),
    ])

    expect(result.slice(0, 4).map((row) => [row.am_available, row.pm_available])).toEqual([
      [true, false],
      [false, false],
      [false, false],
      [false, true],
    ])
    expect(result[4]).toMatchObject({ am_available: true, pm_available: true })
  })

  it('removes half-day markers with only open days between them', () => {
    const result = normalizeOrphanHalfDayBoundaries([
      day('2026-09-18', true, false),
      day('2026-09-19', true, true),
      day('2026-09-20', true, true),
      day('2026-09-21', false, true),
    ])

    expect(result.every((row) => row.am_available && row.pm_available)).toBe(true)
  })

  it('keeps a valid one-night check-in and checkout pair', () => {
    const result = normalizeOrphanHalfDayBoundaries([
      day('2026-08-21', true, false),
      day('2026-08-22', false, true),
    ])

    expect(result).toEqual([
      day('2026-08-21', true, false),
      day('2026-08-22', false, true),
    ])
  })
})
