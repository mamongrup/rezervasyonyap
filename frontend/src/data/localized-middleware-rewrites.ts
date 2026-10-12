import { LOCALIZED_ROUTES_STATIC_FALLBACK } from '@/data/localized-routes-fallback'

/**
 * Edge — vitrin ilk segment alias → App Router klasör adı (`logical_key`).
 */
function buildAliasTable(): Record<string, Record<string, string>> {
  const m: Record<string, Record<string, string>> = {}
  for (const r of LOCALIZED_ROUTES_STATIC_FALLBACK) {
    if (r.path_segment === r.logical_key) continue
    const loc = r.locale.trim().toLowerCase()
    if (!m[loc]) m[loc] = {}
    m[loc][r.path_segment.trim().toLowerCase()] = r.logical_key.trim()
  }
  return m
}

export const LOCALIZED_FIRST_SEGMENT_ALIASES = buildAliasTable()

const CATEGORY_KEYS = new Set([
  'oteller', 'tatil-evleri', 'yat-kiralama', 'turlar', 'aktiviteler',
  'kruvaziyer', 'arac-kiralama', 'feribot', 'transfer', 'ucak-bileti',
  'hac-umre', 'vize',
])

/** A category root or /all is a browse page, even if a detail prefix shares its alias. */
export function resolveLocalizedFirstSegment(locale: string, segment: string, tail: string[]): string | undefined {
  const loc = locale.toLowerCase()
  const key = segment.toLowerCase()
  if (tail.length === 0 || tail[0].toLowerCase() === 'all') {
    const category = LOCALIZED_ROUTES_STATIC_FALLBACK.find((row) =>
      row.locale === loc && row.path_segment.toLowerCase() === key && CATEGORY_KEYS.has(row.logical_key),
    )
    if (category) return category.logical_key
  }
  return LOCALIZED_FIRST_SEGMENT_ALIASES[loc]?.[key]
}
