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

  it('recognizes localized category paths before selecting the mobile form', () => {
    expect(heroSearchVerticalFromRestPath('/tours/all')).toBe('experience')
    expect(heroSearchResultsPathFromRestPath('/tours/all')).toBe('/turlar/all')
    expect(heroSearchResultsPathFromRestPath('/ferienhauser/all')).toBe('/tatil-evleri/all')
    expect(heroSearchResultsPathFromRestPath('/circuits/all')).toBe('/turlar/all')
    expect(heroSearchResultsPathFromRestPath('/fluege/all')).toBe('/ucak-bileti/all')
    expect(heroSearchResultsPathFromRestPath('/transferts/all')).toBe('/transfer/all')
  })

  it('keeps every registered category on its own mobile search target', () => {
    const cases: Array<[string, 'stay' | 'experience' | 'car' | 'flight']> = [
      ['oteller', 'stay'],
      ['tatil-evleri', 'stay'],
      ['yat-kiralama', 'stay'],
      ['turlar', 'experience'],
      ['aktiviteler', 'experience'],
      ['kruvaziyer', 'experience'],
      ['hac-umre', 'experience'],
      ['vize', 'experience'],
      ['plaj-sezlong', 'experience'],
      ['sinema-biletleri', 'experience'],
      ['etkinlikler', 'experience'],
      ['restoran-rezervasyon', 'experience'],
      ['ucak-bileti', 'flight'],
      ['arac-kiralama', 'car'],
      ['feribot', 'car'],
      ['transfer', 'car'],
    ]

    for (const [slug, vertical] of cases) {
      expect(heroSearchVerticalFromRestPath(`/${slug}/all`)).toBe(vertical)
      expect(heroSearchResultsPathFromRestPath(`/${slug}/detail`)).toBe(`/${slug}/all`)
    }
  })

  it('builds from categoryRoute', () => {
    expect(heroSearchResultsPathForCategoryRoute('/tatil-evleri')).toBe('/tatil-evleri/all')
    expect(heroSearchResultsPathForCategoryRoute('/turlar/')).toBe('/turlar/all')
  })
})
