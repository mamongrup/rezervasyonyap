import { HOLIDAY_THEME_FILTER_FALLBACK } from '@/lib/holiday-theme-filter-fallback'
import { listPublicThemeItems } from '@/lib/travel-api'

/** Tatil evi tema kodlarını vitrin etiketlerine çevirir (API + yedek sözlük). */
export async function resolveHolidayThemeLabels(
  codes: string[],
  locale: string | undefined,
): Promise<string[]> {
  const trimmed = codes.map((c) => c.trim()).filter(Boolean)
  if (!trimmed.length) return []

  const map = new Map<string, string>()
  const api = await listPublicThemeItems({ categoryCode: 'holiday_home', locale })
  if (api?.items?.length) {
    for (const i of api.items) {
      map.set(i.code.trim().toLowerCase(), i.label.trim())
    }
  }
  for (const row of HOLIDAY_THEME_FILTER_FALLBACK) {
    const k = row.code.trim().toLowerCase()
    if (!map.has(k)) map.set(k, row.label)
  }

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
