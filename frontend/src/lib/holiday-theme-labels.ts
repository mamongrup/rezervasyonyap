import { listPublicCategoryThemeItems } from '@/lib/catalog-theme-items-api'
import { HOLIDAY_THEME_FILTER_FALLBACK } from '@/lib/holiday-theme-filter-fallback'

function mergeHolidayThemeFallbacksIntoMap(map: Map<string, string>): void {
  for (const row of HOLIDAY_THEME_FILTER_FALLBACK) {
    const k = row.code.trim().toLowerCase()
    if (!map.has(k)) map.set(k, row.label)
  }
}

/**
 * Tek `theme-items` isteğiyle kod→etiket haritası (liste/grid kartlarında toplu kullanım).
 */
export async function getHolidayThemeLabelMap(locale: string): Promise<Map<string, string>> {
  const map = new Map<string, string>()
  const loc = locale.trim() || 'tr'
  const { items } = await listPublicCategoryThemeItems({
    categoryCode: 'holiday_home',
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
  const trimmed = codes.map((c) => c.trim()).filter(Boolean)
  if (!trimmed.length) return []

  const seen = new Set<string>()
  const out: string[] = []
  for (const raw of trimmed) {
    const key = raw.toLowerCase()
    const label = map.get(key) ?? raw.replace(/_/g, ' ')
    if (seen.has(label)) continue
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
  const trimmed = codes.map((c) => c.trim()).filter(Boolean)
  if (!trimmed.length) return []
  const map = await getHolidayThemeLabelMap(locale?.trim() || 'tr')
  return resolveHolidayThemeLabelsFromMap(trimmed, map)
}
