import { prefixLocale } from '@/lib/i18n-config'

function normLocale(s: string): string {
  return s.trim().toLowerCase()
}

/** `xx-YY` → `xx` */
function baseLang(locale: string): string {
  const n = normLocale(locale)
  const base = n.split('-')[0] ?? n
  return base.length >= 2 ? base : 'en'
}

/**
 * Dil başına vitrin URL segmenti — “bölge” kavramının URL’e uygun karşılığı (ASCII).
 * Yeni dil eklerken buraya ve `app/[locale]/(app)/<segment>/[...slug]` rotasına ekleyin.
 */
const REGION_BROWSE_SEGMENT: Record<string, string> = {
  tr: 'bolge',
  en: 'region',
  de: 'region',
  fr: 'region',
  ru: 'region',
  /** 地区 (bölge) */
  zh: 'diqu',
}

const REGION_SEGMENT_FALLBACK = 'region'

export function regionBrowseSegment(locale: string): string {
  const b = baseLang(locale)
  return REGION_BROWSE_SEGMENT[b] ?? REGION_SEGMENT_FALLBACK
}

/**
 * Bölge vitrin sayfası için tarayıcı href’i (`prefixLocale` ile dil önekli).
 * Örn. TR: `/bolge/turkiye`, EN: `/en/region/turkiye`, ZH: `/zh/diqu/turkiye`
 */
export function regionPublicHref(locale: string, slugPath: string): string {
  const clean = slugPath.trim().replace(/^\/+/, '').replace(/\/+$/g, '')
  const seg = regionBrowseSegment(locale)
  const path = clean ? `/${seg}/${clean}` : `/${seg}`
  return prefixLocale(locale, path)
}
