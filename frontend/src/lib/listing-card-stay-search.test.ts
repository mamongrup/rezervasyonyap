import { describe, expect, it } from 'vitest'

import { mergeStaySearchIntoDetailQuery } from './listing-card-stay-search'

describe('stay result card detail query', () => {
  it('carries hotel dates and full guest breakdown from the search page', () => {
    const pageSearch = new URLSearchParams(
      'location=Antalya&checkin=2026-09-01&checkout=2026-09-05&guests=3&guestAdults=2&guestChildren=1&childAges=5',
    )

    expect(mergeStaySearchIntoDetailQuery(undefined, pageSearch)).toBe(
      'checkIn=2026-09-01&checkOut=2026-09-05&guestAdults=2&guestChildren=1&childAges=5',
    )
  })

  it('does not overwrite an explicit server-provided detail query', () => {
    const pageSearch = new URLSearchParams(
      'checkin=2026-09-01&checkout=2026-09-05&guestAdults=2',
    )

    expect(
      mergeStaySearchIntoDetailQuery(
        'checkIn=2026-10-10&checkOut=2026-10-12&guestAdults=4',
        pageSearch,
      ),
    ).toBe('checkIn=2026-10-10&checkOut=2026-10-12&guestAdults=4')
  })
})
