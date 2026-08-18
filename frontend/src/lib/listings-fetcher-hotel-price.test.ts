import { describe, expect, it } from 'vitest'

import { mapPublicListingItemToListingBase } from './listings-fetcher'
import type { PublicListingItem } from './travel-api'

const hotel = {
  id: 'hotel-1',
  slug: 'ornek-otel',
  title: 'Örnek Otel',
  category_code: 'hotel',
  listing_vertical: 'hotel',
  currency_code: 'TRY',
  featured_image_url: null,
  thumbnail_url: null,
  price_from: '1250',
  location: 'Antalya',
  review_avg: null,
  discount_percent: null,
} satisfies PublicListingItem

describe('dated hotel listing prices', () => {
  it('shows the dated minimum returned by the public listing API', () => {
    const listing = mapPublicListingItemToListingBase(hotel, { locale: 'tr' })

    expect(listing.priceAmount).toBe(1250)
    expect(listing.price).toBeTruthy()
  })

  it('keeps the starting price when no dated quote is requested', () => {
    const listing = mapPublicListingItemToListingBase(hotel, { locale: 'tr' })

    expect(listing.priceAmount).toBe(1250)
    expect(listing.price).toBeTruthy()
  })
})

describe('stay listing mobile discounts', () => {
  it('keeps the mobile discount out of the generic desktop sale badge', () => {
    const listing = mapPublicListingItemToListingBase(
      {
        ...hotel,
        id: 'villa-1',
        slug: 'villa-1',
        category_code: 'holiday_home',
        listing_vertical: 'holiday_home',
        discount_percent: 10,
      },
      { locale: 'tr' },
    )

    expect(listing.saleOff).toBeNull()
    expect(listing.mobileSaleOff).toBe('%10')
  })
})
