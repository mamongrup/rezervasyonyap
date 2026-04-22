import type { LocaleRow } from '@/lib/travel-api'

/**
 * Sitede gösterilmesi beklenen dil kodları (DB’de henüz yoksa bile UI’da tamamlanır).
 * Veritabanına `228_site_locales_five.sql` ile yazıldığında API ile birebir örtüşür.
 */
export const SITE_LOCALE_CATALOG = [
  { code: 'tr', name: 'Türkçe' },
  { code: 'en', name: 'English' },
  { code: 'de', name: 'Deutsch' },
  { code: 'ru', name: 'Русский' },
  { code: 'zh', name: '中文' },
  { code: 'fr', name: 'Français' },
] as const

export type SiteLocaleCode = (typeof SITE_LOCALE_CATALOG)[number]['code']

export type PublicLocaleRow = { code: string; name: string; is_active: boolean }

/** API + katalog: eksik kodlar katalogdan eklenir; API’de pasif olanlar düşer. */
export function mergePublicLocalesWithCatalog(
  apiRows: PublicLocaleRow[],
  catalog: readonly { code: string; name: string }[] = SITE_LOCALE_CATALOG,
): PublicLocaleRow[] {
  const apiByCode = new Map<string, PublicLocaleRow>()
  for (const r of apiRows) {
    if (r?.code) apiByCode.set(r.code.toLowerCase(), r)
  }

  const primary: PublicLocaleRow[] = []
  for (const c of catalog) {
    const fromApi = apiByCode.get(c.code.toLowerCase())
    if (fromApi) {
      if (fromApi.is_active === false) continue
      primary.push({
        code: fromApi.code,
        name: (typeof fromApi.name === 'string' && fromApi.name.trim() !== '') ? fromApi.name : c.name,
        is_active: true,
      })
    } else {
      primary.push({ code: c.code, name: c.name, is_active: true })
    }
  }

  const catalogCodes = new Set(catalog.map((c) => c.code.toLowerCase()))
  const extras: PublicLocaleRow[] = []
  for (const r of apiRows) {
    if (!r?.code) continue
    const k = r.code.toLowerCase()
    if (catalogCodes.has(k)) continue
    if (r.is_active !== false) {
      extras.push({
        code: r.code,
        name: typeof r.name === 'string' && r.name.trim() !== '' ? r.name : r.code,
        is_active: true,
      })
    }
  }

  const merged = [...primary, ...extras]
  return merged.length > 0 ? merged : [...catalog.map((c) => ({ code: c.code, name: c.name, is_active: true as const }))]
}

/** Client / panel — `listLocales` cevabı katalog ile tamamlanır; sentetik id kullanılır. */
export function mergeLocaleRowsWithCatalog(
  apiRows: LocaleRow[],
  catalog: readonly { code: string; name: string }[] = SITE_LOCALE_CATALOG,
): LocaleRow[] {
  const apiByCode = new Map<string, LocaleRow>()
  for (const r of apiRows) {
    if (r?.code) apiByCode.set(r.code.toLowerCase(), r)
  }

  let nextSynthetic = -1
  const primary: LocaleRow[] = []
  for (const c of catalog) {
    const fromApi = apiByCode.get(c.code.toLowerCase())
    if (fromApi) {
      primary.push(fromApi)
    } else {
      nextSynthetic -= 1
      primary.push({
        id: nextSynthetic,
        code: c.code,
        name: c.name,
        is_rtl: false,
        is_active: true,
      })
    }
  }

  const catalogCodes = new Set(catalog.map((c) => c.code.toLowerCase()))
  for (const r of apiRows) {
    if (!r?.code) continue
    if (catalogCodes.has(r.code.toLowerCase())) continue
    primary.push(r)
  }

  return primary
}
