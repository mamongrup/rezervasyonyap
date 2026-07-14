import { describe, expect, it } from 'vitest'
import {
  isInternationalSiteHost,
  localeFromAcceptLanguage,
  localeFromCountry,
  resolveInternationalLocale,
} from './international-locale-routing'

describe('international locale routing', () => {
  it('recognizes the international domain and its www alias', () => {
    expect(isInternationalSiteHost('reservationinturkey.com')).toBe(true)
    expect(isInternationalSiteHost('www.reservationinturkey.com:443')).toBe(true)
    expect(isInternationalSiteHost('rezervasyonyap.tr')).toBe(false)
  })

  it('uses configured international host aliases', () => {
    expect(isInternationalSiteHost('travel.example', 'travel.example,www.other.example')).toBe(true)
  })

  it('respects accept-language quality ordering', () => {
    expect(localeFromAcceptLanguage('en-US;q=0.7,ru-RU;q=0.9,tr;q=0.8')).toBe('ru')
    expect(localeFromAcceptLanguage('ja-JP,zh-CN;q=0.8,en;q=0.7')).toBe('zh')
  })

  it('maps supported country fallbacks', () => {
    expect(localeFromCountry('RU')).toBe('ru')
    expect(localeFromCountry('CN')).toBe('zh')
    expect(localeFromCountry('DE')).toBe('de')
    expect(localeFromCountry('US')).toBeNull()
  })

  it('uses preference, browser, country, then English in that order', () => {
    expect(
      resolveInternationalLocale({
        preferredLocale: 'fr',
        acceptLanguage: 'ru-RU',
        country: 'CN',
      }),
    ).toBe('fr')
    expect(resolveInternationalLocale({ acceptLanguage: 'de-DE', country: 'RU' })).toBe('de')
    expect(resolveInternationalLocale({ acceptLanguage: 'ja-JP', country: 'RU' })).toBe('ru')
    expect(resolveInternationalLocale({ acceptLanguage: 'ja-JP', country: 'JP' })).toBe('en')
  })

  it('keeps crawler routing stable in English unless a preference exists', () => {
    expect(resolveInternationalLocale({ country: 'RU', userAgent: 'Googlebot' })).toBe('en')
    expect(
      resolveInternationalLocale({ preferredLocale: 'ru', country: 'CN', userAgent: 'Googlebot' }),
    ).toBe('ru')
  })
})
