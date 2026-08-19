import { describe, expect, it } from 'vitest'
import type { PublicListingItem } from './travel-api'
import { rankSearchListings } from './search-listings-display'

function listing(
  id: string,
  title: string,
  slug: string,
  categoryCode = 'holiday_home',
  location = '',
): PublicListingItem {
  return {
    id,
    title,
    slug,
    category_code: categoryCode,
    location,
  } as PublicListingItem
}

describe('rankSearchListings', () => {
  it('puts exact ada villa phrase matches before prefix-only Adagio Village', () => {
    const ranked = rankSearchListings(
      [
        listing('adagio', 'Adagio Jumeirah Village Triangle', 'adagio-jumeirah-village', 'hotel'),
        listing('infinity', 'Infinity Ada Villa', 'infinity-ada-villa'),
        listing('fethiye', 'Fethiye Ada Villa', 'fethiye-ada-villa'),
      ],
      'ada villa',
    )

    expect(ranked.map((item) => item.id)).toEqual(['fethiye', 'infinity', 'adagio'])
  })

  it('handles Turkish characters and prefers the exact title', () => {
    const ranked = rankSearchListings(
      [
        listing('second', 'Ütopia Villa 2', 'utopia-villa-2'),
        listing('first', 'Ütopia Villa', 'utopia-villa'),
      ],
      'utopia villa',
    )

    expect(ranked.map((item) => item.id)).toEqual(['first', 'second'])
  })

  it('puts the whole ada word before Adana prefix matches', () => {
    const ranked = rankSearchListings(
      [
        listing('adana-tour', 'Adana’dan Avrupa Turu', 'adanadan-avrupa-turu', 'tour'),
        listing('ada-yacht', 'Ada Deniz Gulet', 'ada-deniz-gulet', 'yacht_charter'),
        listing('ada-villa', 'Ada Villa', 'fethiye-ada-villa'),
        listing('eco', 'Eco Ada Villa', 'eco-ada-villa'),
      ],
      'ada',
    )

    expect(ranked.map((item) => item.id)).toEqual([
      'ada-villa',
      'ada-yacht',
      'eco',
      'adana-tour',
    ])
  })

  it('prefers a title prefix over a location-only match', () => {
    const ranked = rankSearchListings(
      [
        listing('location', 'Bozyer Atlas Villa', 'bozyer-atlas-villa', 'holiday_home', 'Fethiye, Muğla'),
        listing('title', 'Fethiye Scuba Diving', 'fethiye-scuba-diving', 'activity', 'Fethiye'),
      ],
      'feth',
    )

    expect(ranked.map((item) => item.id)).toEqual(['title', 'location'])
  })

  it('recognizes a transposed category word as a villa intent', () => {
    const ranked = rankSearchListings(
      [
        listing('tour', 'Sevilla Turu', 'sevilla-turu', 'tour'),
        listing('villa', 'Mamon Luxury Life Villa', 'mamon-luxury-life-villa'),
      ],
      'vilal',
    )

    expect(ranked.map((item) => item.id)).toEqual(['villa', 'tour'])
  })
})
