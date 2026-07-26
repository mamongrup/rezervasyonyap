import { describe, expect, it } from 'vitest'
import { guestSearchTotalFromRecord } from './guest-search-defaults'

describe('guestSearchTotalFromRecord', () => {
  it('includes adults, children and infants in search capacity', () => {
    expect(
      guestSearchTotalFromRecord({
        guestAdults: '2',
        guestChildren: '2',
        guestInfants: '1',
      }),
    ).toBe(5)
  })

  it('ignores empty, invalid and negative values', () => {
    expect(
      guestSearchTotalFromRecord({
        guestAdults: '2',
        guestChildren: '-1',
        guestInfants: 'invalid',
      }),
    ).toBe(2)
  })
})
