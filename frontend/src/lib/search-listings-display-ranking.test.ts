import { describe, expect, it } from 'vitest'
import type { PublicListingItem } from './travel-api'
import { rankSearchListings } from './search-listings-display'

function listing(
  id: string,
  title: string,
  slug: string,
  categoryCode = 'holiday_home',
): PublicListingItem {
  return {
    id,
    title,
    slug,
    category_code: categoryCode,
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

    expect(ranked.map((item) => item.id)).toEqual(['infinity', 'fethiye', 'adagio'])
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
})
