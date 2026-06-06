import { listPublicCategoryThemeItems } from '@/lib/catalog-theme-items-api'
import { HOLIDAY_THEME_FILTER_FALLBACK } from '@/lib/holiday-theme-filter-fallback'
import { HOLIDAY_THEME_CODE_RE, parseHolidayThemeCodes } from '@/lib/holiday-theme-codes'

function mergeHolidayThemeFallbacksIntoMap(map: Map<string, string>): void {
  for (const row of HOLIDAY_THEME_FILTER_FALLBACK) {
    const k = row.code.trim().toLowerCase()
    if (!map.has(k)) map.set(k, row.label)
  }
}

/**
 * Tek `theme-items` isteğiyle kod→etiket haritası (liste/grid kartlarında toplu kullanım).
 */
export async function getHolidayThemeLabelMap(
  locale: string,
  categoryCode: 'holiday_home' | 'yacht_charter' = 'holiday_home',
): Promise<Map<string, string>> {
  const map = new Map<string, string>()
  const loc = locale.trim() || 'tr'
  const { items } = await listPublicCategoryThemeItems({
    categoryCode,
    locale: loc,
  })
  for (const i of items) {
    map.set(i.code.trim().toLowerCase(), i.label.trim())
  }
  mergeHolidayThemeFallbacksIntoMap(map)
  return map
}

/** Harita üzerinde tema kodlarını görünür etiketlere çevirir (sıra korunur, tekrarsız). */
export function resolveHolidayThemeLabelsFromMap(codes: string[], map: Map<string, string>): string[] {
  const normalized = parseHolidayThemeCodes(codes)
  if (!normalized.length) return []

  const seen = new Set<string>()
  const out: string[] = []
  for (const key of normalized) {
    const fromMap = map.get(key)?.trim()
    const label = fromMap || (HOLIDAY_THEME_CODE_RE.test(key) ? key.replace(/_/g, ' ') : '')
    if (!label || seen.has(label)) continue
    seen.add(label)
    out.push(label)
  }
  return out
}

/** Tatil evi tema kodlarını vitrin etiketlerine çevirir (API + yedek sözlük). */
export async function resolveHolidayThemeLabels(
  codes: string[],
  locale: string | undefined,
): Promise<string[]> {
  const normalized = parseHolidayThemeCodes(codes)
  if (!normalized.length) return []
  const map = await getHolidayThemeLabelMap(locale?.trim() || 'tr')
  return resolveHolidayThemeLabelsFromMap(normalized, map)
}
