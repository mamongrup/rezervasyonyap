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
