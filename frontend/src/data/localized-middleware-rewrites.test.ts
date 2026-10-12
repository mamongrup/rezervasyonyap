import { describe, expect, it } from 'vitest'
import { LOCALIZED_ROUTES_STATIC_FALLBACK } from './localized-routes-fallback'
import { resolveLocalizedFirstSegment } from './localized-middleware-rewrites'

describe('localized advertisement landing pages', () => {
  for (const locale of ['tr', 'en', 'de', 'ru', 'zh', 'fr']) {
    it(`${locale} preserves category roots and /all instead of listing detail aliases`, () => {
      for (const logical of ['oteller', 'tatil-evleri', 'yat-kiralama', 'turlar', 'aktiviteler', 'kruvaziyer', 'arac-kiralama']) {
        const row = LOCALIZED_ROUTES_STATIC_FALLBACK.find((r) => r.locale === locale && r.logical_key === logical)
        const path = row?.path_segment || logical
        expect(resolveLocalizedFirstSegment(locale, path, []) || path).toBe(logical)
        expect(resolveLocalizedFirstSegment(locale, path, ['all']) || path).toBe(logical)
      }
    })
  }
  it('keeps existing yacht detail links resolvable', () => {
    expect(resolveLocalizedFirstSegment('en', 'yacht-charter', ['private-yacht-123'])).toBe('yat')
    expect(resolveLocalizedFirstSegment('fr', 'location-bateaux', ['bateau-123'])).toBe('yat')
  })
})
