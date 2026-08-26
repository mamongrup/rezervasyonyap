import { describe, expect, it } from 'vitest'

import { buildActivityCheckoutUrl, parseActivityCheckoutParams } from '@/lib/stay-checkout-url'

describe('activity checkout staff preference', () => {
  it('carries a female pilot preference to checkout', () => {
    const url = buildActivityCheckoutUrl('/checkout', {
      listingId: 'listing-1',
      date: '2026-08-26',
      sessionId: 'session-1',
      adults: 2,
      children: 1,
      currencyCode: 'TRY',
      unitPrice: 9000,
      femaleStaffPreference: 'female_pilot',
    })
    const params = new URL(url, 'https://example.test').searchParams

    expect(parseActivityCheckoutParams(params)).toMatchObject({
      sessionId: 'session-1',
      adults: 2,
      children: 1,
      femaleStaffPreference: 'female_pilot',
    })
  })

  it('allows a child-only activity reservation', () => {
    const url = buildActivityCheckoutUrl('/checkout', {
      listingId: 'listing-1',
      date: '2026-08-27',
      sessionId: 'session-1',
      adults: 0,
      children: 1,
      currencyCode: 'TRY',
      unitPrice: 4500,
    })
    const params = new URL(url, 'https://example.test').searchParams

    expect(parseActivityCheckoutParams(params)).toMatchObject({ adults: 0, children: 1 })
  })
})
