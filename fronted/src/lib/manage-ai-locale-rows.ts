import { defaultLocale } from '@/lib/i18n-config'
import { SITE_LOCALE_CATALOG } from '@/lib/i18n-catalog-locales'

export type ManageAiLocaleRow = { code: string; label: string; flag: string }

const FLAG_BY_CODE: Record<string, string> = {
  tr: '🇹🇷',
  en: '🇬🇧',
  de: '🇩🇪',
  ru: '🇷🇺',
  zh: '🇨🇳',
  fr: '🇫🇷',
  ar: '🇸🇦',
  es: '🇪🇸',
  it: '🇮🇹',
  pt: '🇵🇹',
  nl: '🇳🇱',
  pl: '🇵🇱',
  ja: '🇯🇵',
  ko: '🇰🇷',
  uk: '🇺🇦',
  hi: '🇮🇳',
}

export function localeFlagEmoji(code: string): string {
  const k = code.trim().toLowerCase().split('-')[0] ?? ''
  return FLAG_BY_CODE[k] ?? '🌐'
}

/**
 * Panelde AI çeviri / dil sekmeleri: önce sitede aktif diller (`AvailableLocalesProvider`),
 * yoksa `SITE_LOCALE_CATALOG` yedeği.
 */
export function buildManageAiLocaleRows(
  available: ReadonlyArray<{ code: string; name: string }>,
): ManageAiLocaleRow[] {
  const src =
    available && available.length > 0
      ? available
      : (SITE_LOCALE_CATALOG as readonly { code: string; name: string }[])
  return src.map((l) => ({
    code: l.code.trim().toLowerCase(),
    label: typeof l.name === 'string' && l.name.trim() !== '' ? l.name.trim() : l.code,
    flag: localeFlagEmoji(l.code),
  }))
}

/** Kaynak dil: `defaultLocale` sitede yoksa listenin ilk kodu. */
export function resolveManagePrimaryLocale(codes: string[]): string {
  const configured = defaultLocale.trim().toLowerCase()
  if (codes.includes(configured)) return configured
  return codes[0] ?? configured
}
