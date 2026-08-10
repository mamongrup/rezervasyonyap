import { describe, expect, it } from 'vitest'
import { logoSloganI18nFromBranding, resolveLogoSlogan } from '@/lib/logo-slogan'

describe('logo slogan', () => {
  it('uses the localized configured slogan', () => {
    expect(resolveLogoSlogan({ logo_slogan_i18n: { tr: 'Bizimle Keşfedin', en: 'Explore with Us' } }, 'en')).toBe(
      'Explore with Us',
    )
  })

  it('falls back to the Turkish value for an untranslated locale', () => {
    expect(resolveLogoSlogan({ logo_slogan_i18n: { tr: 'Bizimle Keşfedin' } }, 'de')).toBe('Bizimle Keşfedin')
  })

  it('provides defaults for every supported site language', () => {
    const defaults = logoSloganI18nFromBranding({})
    expect(Object.keys(defaults)).toEqual(['tr', 'en', 'de', 'ru', 'zh', 'fr'])
    expect(resolveLogoSlogan({}, 'tr')).toBe('Bizimle Keşfedin')
  })
})
