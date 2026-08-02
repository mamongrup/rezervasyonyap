import { describe, expect, it } from 'vitest'
import { shouldAskChildAgesForStaySearch, staySearchResultsPathFromRestPath } from './stay-search-target'

describe('stay-search-target', () => {
  it('asks child ages only for hotel stay searches', () => {
    expect(shouldAskChildAgesForStaySearch('/oteller/all')).toBe(true)
    expect(shouldAskChildAgesForStaySearch('/oteller/antalya')).toBe(true)
    expect(shouldAskChildAgesForStaySearch('/tatil-evleri/all')).toBe(false)
    expect(shouldAskChildAgesForStaySearch('/yat-kiralama/all')).toBe(false)
  })

  it('maps holiday-home paths to holiday-home results', () => {
    expect(staySearchResultsPathFromRestPath('/tatil-evleri')).toBe('/tatil-evleri/all')
    expect(staySearchResultsPathFromRestPath('/oteller')).toBe('/oteller/all')
  })
})
