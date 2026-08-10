import { normalizeI18nField, pickI18n, type I18nFieldMap } from '@/lib/i18n-field'

export const DEFAULT_LOGO_SLOGAN_I18N: I18nFieldMap = {
  tr: 'Bizimle Keşfedin',
  en: 'Discover with Us',
  de: 'Mit uns entdecken',
  ru: 'Открывайте вместе с нами',
  zh: '与我们一起探索',
  fr: 'Découvrez avec nous',
}

export function logoSloganI18nFromBranding(branding: Record<string, unknown>): I18nFieldMap {
  const configured = normalizeI18nField(branding.logo_slogan_i18n)
  return Object.keys(configured).length > 0 ? configured : DEFAULT_LOGO_SLOGAN_I18N
}

export function resolveLogoSlogan(branding: Record<string, unknown>, locale: string): string {
  const legacy = typeof branding.logo_slogan === 'string' ? branding.logo_slogan.trim() : ''
  const configured = normalizeI18nField(branding.logo_slogan_i18n)
  if (Object.keys(configured).length > 0) return pickI18n(configured, locale, legacy)
  if (legacy) return legacy
  return pickI18n(DEFAULT_LOGO_SLOGAN_I18N, locale, DEFAULT_LOGO_SLOGAN_I18N.tr)
}
