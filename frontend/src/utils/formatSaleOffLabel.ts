import { defaultLocale, isEnglishLocale } from '@/lib/i18n-config'

export function extractPercentDigits(raw: string | null | undefined): string | null {
  if (raw == null || String(raw).trim() === '') return null
  const s = String(raw).trim()
  const digitsThenPercent = s.match(/(\d+)\s*%/)
  const percentThenDigits = s.match(/%\s*(\d+)/)
  return digitsThenPercent?.[1] ?? percentThenDigits?.[1] ?? null
}

/**
 * Kısa gösterim: TR `%10`, EN `10%`.
 * Parses legacy strings like "-10% today" or "-15%".
 */
export function formatSaleOffLabel(raw: string | null | undefined, locale: string = defaultLocale): string {
  if (raw == null || String(raw).trim() === '') return ''
  const n = extractPercentDigits(raw)
  if (n != null) {
    return isEnglishLocale(locale) ? `${n}%` : `%${n}`
  }
  return String(raw).trim()
}

/** Rozet / kart: TR `%10 İndirimli`, EN `10% Discount` */
/** İlan `discountPercent` veya `saleOff` metninden indirim yüzdesi (sayı). */
export function parseDiscountPercent(
  saleOff: string | null | undefined,
  explicitPercent?: number | null,
): number | null {
  if (explicitPercent != null && explicitPercent > 0) return Math.round(explicitPercent)
  const d = extractPercentDigits(saleOff)
  return d ? parseInt(d, 10) : null
}

export function formatSaleOffBadgeLabel(
  raw: string | null | undefined,
  locale: string = defaultLocale
): string {
  const n = extractPercentDigits(raw)
  if (n != null) {
    return isEnglishLocale(locale) ? `${n}% Discount` : `%${n} İndirimli`
  }
  return raw == null || String(raw).trim() === '' ? '' : String(raw).trim()
}
