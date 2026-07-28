import { describe, expect, it } from 'vitest'
import { slimListingForCategoryClient, slimListingForVitrinCard } from '@/lib/featured-listings-utils'
import type { TListingBase } from '@/types/listing-types'

function sampleListing(galleryCount: number): TListingBase {
  const galleryImgs = Array.from({ length: galleryCount }, (_, i) => `/uploads/img-${i}.jpg`)
  return {
    id: 'listing-1',
    handle: 'sample-villa',
    title: 'Sample Villa',
    listingCategory: 'Villa',
    listingVertical: 'holiday_home',
    featuredImage: galleryImgs[0],
    galleryImgs,
    address: 'Kalkan',
    city: 'Kalkan',
    price: '₺10.000',
    priceAmount: 10000,
    priceCurrency: 'TRY',
    reviewStart: 4.5,
    reviewCount: 3,
    isNew: true,
    isCampaign: false,
    discountPercent: 10,
    saleOff: '%10',
    like: false,
    themeCodes: ['havuz'],
    themeChipLabels: ['Havuz'],
    instantBook: true,
    createdAt: '2026-07-01T00:00:00Z',
  }
}

describe('category listing payload slim', () => {
  it('vitrin slim keeps a single cover image', () => {
    const slim = slimListingForVitrinCard(sampleListing(12))
    expect(slim.galleryImgs).toEqual(['/uploads/img-0.jpg'])
    expect(slim.themeCodes).toBeUndefined()
  })

  it('category client slim keeps filter meta without full gallery', () => {
    const slim = slimListingForCategoryClient(sampleListing(12))
    expect(slim.galleryImgs).toEqual(['/uploads/img-0.jpg'])
    expect(slim.themeCodes).toEqual(['havuz'])
    expect(slim.themeChipLabels).toEqual(['Havuz'])
    expect(slim.instantBook).toBe(true)
    expect(slim.isNew).toBe(true)
    expect(slim.discountPercent).toBe(10)
  })
})
