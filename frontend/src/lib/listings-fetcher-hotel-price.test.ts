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
  it('does not present the all-season floor as the selected-stay price', () => {
    const listing = mapPublicListingItemToListingBase(hotel, {
      locale: 'tr',
      suppressUndatedHotelPrice: true,
    })

    expect(listing.priceAmount).toBeUndefined()
    expect(listing.price).toBeUndefined()
  })

  it('keeps the starting price when no dated quote is requested', () => {
    const listing = mapPublicListingItemToListingBase(hotel, { locale: 'tr' })

    expect(listing.priceAmount).toBe(1250)
    expect(listing.price).toBeTruthy()
  })
})
