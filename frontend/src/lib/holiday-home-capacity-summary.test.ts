import { describe, expect, it } from 'vitest'

import { holidayHomeCapacitySummary } from './holiday-home-capacity-summary'

const copy = { guests: 'misafir', rooms: 'oda', bathrooms: 'banyo' }

describe('holidayHomeCapacitySummary', () => {
  it('shows capacity, room and bathroom values when all are known', () => {
    expect(holidayHomeCapacitySummary({ maxGuests: 8, bedrooms: 4, bathrooms: 3 }, copy)).toBe(
      '8 misafir · 4 oda · 3 banyo',
    )
  })

  it('does not display misleading placeholders for missing values', () => {
    expect(holidayHomeCapacitySummary({ maxGuests: 6, bedrooms: undefined, bathrooms: 2 }, copy)).toBe(
      '6 misafir · 2 banyo',
    )
  })
})
