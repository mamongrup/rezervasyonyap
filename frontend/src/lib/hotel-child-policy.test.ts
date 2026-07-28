import { describe, expect, it } from 'vitest'
import {
  ADULTS_ONLY_CHILD_POLICY,
  computeChildOccupancySurcharge,
  normalizeGuestsWithChildAges,
  parseHotelChildPolicy,
  syncChildAges,
} from '@/lib/hotel-child-policy'

describe('hotel-child-policy', () => {
  it('syncs childAges length to guestChildren', () => {
    expect(syncChildAges({ guestChildren: 2, childAges: [4] })).toEqual([4, 6])
    expect(syncChildAges({ guestChildren: 1, childAges: [5, 8, 9] })).toEqual([5])
  })

  it('parses adults-only policy', () => {
    expect(parseHotelChildPolicy(null, true)).toEqual(ADULTS_ONLY_CHILD_POLICY)
    expect(parseHotelChildPolicy({ children_allowed: false })).toEqual(ADULTS_ONLY_CHILD_POLICY)
  })

  it('charges only children above free max age', () => {
    const r = computeChildOccupancySurcharge({
      nightlyRoomRate: 4000,
      nights: 3,
      childAges: [4, 8, 14],
      policy: parseHotelChildPolicy({ free_max_age: 6, charge_percent: 50 }),
    })
    // adult share 2000; 50% = 1000 / charged child / night; one charged (8)
    expect(r.freeChildren).toBe(1)
    expect(r.chargedChildren).toBe(1)
    expect(r.adultAsChildAges).toBe(1)
    expect(r.perChargedChildNightly).toBe(1000)
    expect(r.childSurchargeTotal).toBe(3000)
  })

  it('normalizes guests with ages', () => {
    const g = normalizeGuestsWithChildAges({ guestAdults: 2, guestChildren: 2, childAges: [3] })
    expect(g.childAges).toEqual([3, 6])
    expect(g.guestChildren).toBe(2)
  })
})
