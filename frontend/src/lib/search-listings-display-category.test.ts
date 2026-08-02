import { describe, expect, it } from 'vitest'
import { listingCategoryCodeForHeroPath } from './search-listings-display'

describe('listingCategoryCodeForHeroPath', () => {
  it('maps stay category paths', () => {
    expect(listingCategoryCodeForHeroPath('/oteller/all')).toBe('hotel')
    expect(listingCategoryCodeForHeroPath('/tatil-evleri/all')).toBe('holiday_home')
    expect(listingCategoryCodeForHeroPath('/yat-kiralama/all')).toBe('yacht_charter')
  })

  it('maps experience paths', () => {
    expect(listingCategoryCodeForHeroPath('/turlar/all')).toBe('tour')
    expect(listingCategoryCodeForHeroPath('/aktiviteler/all')).toBe('activity')
    expect(listingCategoryCodeForHeroPath('/kruvaziyer/all')).toBe('cruise')
  })

  it('returns undefined on home', () => {
    expect(listingCategoryCodeForHeroPath('/')).toBeUndefined()
  })
})
