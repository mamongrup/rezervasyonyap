import { describe, expect, it } from 'vitest'

import { withSearchResultsAnchor } from './search-results-anchor'

describe('withSearchResultsAnchor', () => {
  it('preserves query parameters and adds the results hash', () => {
    expect(withSearchResultsAnchor('/oteller/all?location=Antalya&guests=2')).toBe(
      '/oteller/all?location=Antalya&guests=2#search-results',
    )
  })

  it('replaces an existing hash', () => {
    expect(withSearchResultsAnchor('/oteller/all?location=Antalya#top')).toBe(
      '/oteller/all?location=Antalya#search-results',
    )
  })
})
