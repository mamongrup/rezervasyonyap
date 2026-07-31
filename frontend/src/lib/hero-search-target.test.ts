import { describe, expect, it } from 'vitest'
import {
  heroSearchResultsPathFromRestPath,
  heroSearchResultsPathForCategoryRoute,
  heroSearchVerticalFromRestPath,
} from './hero-search-target'

describe('hero-search-target', () => {
  it('maps stay paths', () => {
    expect(heroSearchVerticalFromRestPath('/')).toBe('stay')
    expect(heroSearchResultsPathFromRestPath('/')).toBe('/oteller/all')
    expect(heroSearchResultsPathFromRestPath('/tatil-evleri/all')).toBe('/tatil-evleri/all')
    expect(heroSearchResultsPathFromRestPath('/yat-kiralama/kas')).toBe('/yat-kiralama/all')
  })

  it('keeps experience search on current category', () => {
    expect(heroSearchVerticalFromRestPath('/aktiviteler/all')).toBe('experience')
    expect(heroSearchResultsPathFromRestPath('/aktiviteler/all')).toBe('/aktiviteler/all')
    expect(heroSearchResultsPathFromRestPath('/kruvaziyer')).toBe('/kruvaziyer/all')
    expect(heroSearchResultsPathFromRestPath('/turlar/all')).toBe('/turlar/all')
  })

  it('maps experience/car map routes to same category /all (not turlar fallback)', () => {
    expect(heroSearchVerticalFromRestPath('/aktiviteler-harita')).toBe('experience')
    expect(heroSearchResultsPathFromRestPath('/aktiviteler-harita')).toBe('/aktiviteler/all')
    expect(heroSearchResultsPathFromRestPath('/kruvaziyer-harita/all')).toBe('/kruvaziyer/all')
    expect(heroSearchResultsPathFromRestPath('/hac-umre-harita')).toBe('/hac-umre/all')
    expect(heroSearchResultsPathFromRestPath('/feribot-harita')).toBe('/feribot/all')
    expect(heroSearchResultsPathFromRestPath('/transfer-harita')).toBe('/transfer/all')
    expect(heroSearchResultsPathFromRestPath('/oteller-harita')).toBe('/oteller/all')
  })

  it('maps car / ferry / transfer', () => {
    expect(heroSearchVerticalFromRestPath('/arac-kiralama/all')).toBe('car')
    expect(heroSearchResultsPathFromRestPath('/feribot/all')).toBe('/feribot/all')
    expect(heroSearchResultsPathFromRestPath('/transfer/all')).toBe('/transfer/all')
  })

  it('maps flights', () => {
    expect(heroSearchVerticalFromRestPath('/ucak-bileti/all')).toBe('flight')
    expect(heroSearchResultsPathFromRestPath('/ucak-bileti')).toBe('/ucak-bileti/all')
  })

  it('builds from categoryRoute', () => {
    expect(heroSearchResultsPathForCategoryRoute('/tatil-evleri')).toBe('/tatil-evleri/all')
    expect(heroSearchResultsPathForCategoryRoute('/turlar/')).toBe('/turlar/all')
  })
})
