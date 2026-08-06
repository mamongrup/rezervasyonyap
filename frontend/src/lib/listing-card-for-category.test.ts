import { describe, expect, it } from 'vitest'
import { listingCardForCategorySlug } from '@/lib/listing-card-for-category'
import { HotelCard, HolidayHomeCard, TourCard, ActivityCard } from '@/components/cards'

describe('listingCardForCategorySlug', () => {
  it('maps core category slugs to listing cards', () => {
    expect(listingCardForCategorySlug('oteller')).toBe(HotelCard)
    expect(listingCardForCategorySlug('tatil-evleri')).toBe(HolidayHomeCard)
    expect(listingCardForCategorySlug('turlar')).toBe(TourCard)
    expect(listingCardForCategorySlug('aktiviteler')).toBe(ActivityCard)
  })

  it('returns null for unknown or empty slug', () => {
    expect(listingCardForCategorySlug('')).toBeNull()
    expect(listingCardForCategorySlug(undefined)).toBeNull()
    expect(listingCardForCategorySlug('unknown-category')).toBeNull()
  })
})
