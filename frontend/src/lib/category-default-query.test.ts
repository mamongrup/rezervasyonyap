import { describe, expect, it } from 'vitest'
import { isDefaultCategoryListingQuery } from './category-default-query'

describe('isDefaultCategoryListingQuery', () => {
  it('accepts empty /all landing', () => {
    expect(isDefaultCategoryListingQuery({}, { regionHandle: 'all' })).toBe(true)
    expect(isDefaultCategoryListingQuery({}, {})).toBe(true)
  })

  it('rejects filters and pagination', () => {
    expect(isDefaultCategoryListingQuery({ sort: 'price_asc' }, {})).toBe(false)
    expect(isDefaultCategoryListingQuery({ page: '2' }, {})).toBe(false)
    expect(isDefaultCategoryListingQuery({}, { regionHandle: 'antalya' })).toBe(false)
  })
})
