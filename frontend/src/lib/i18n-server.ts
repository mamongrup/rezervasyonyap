/** Sunucu tarafı — API'deki aktif diller (Next layout / sitemap / hreflang). */

import { LOCALIZED_ROUTES_STATIC_FALLBACK } from '@/data/localized-routes-fallback'
import {
  mergePublicLocalesWithCatalog,
  SITE_LOCALE_CATALOG,
  type PublicLocaleRow,
} from '@/lib/i18n-catalog-locales'
import { apiOriginForFetch } from '@/lib/api-origin'
import { withDevNoStore } from '@/lib/api-fetch-dev'
import { parseLenientJson } from '@/lib/json-parse'
import { cache } from 'react'

export type { PublicLocaleRow }

/** API cevap vermezse dev'de `/[locale]` derlemesi sonsuza dek beklemesin. */
const I18N_FETCH_MS = 8000

const FALLBACK: PublicLocaleRow[] = SITE_LOCALE_CATALOG.map((c) => ({
  code: c.code,
  name: c.name,
  is_active: true,
}))

export const fetchActiveLocales = cache(async function fetchActiveLocales(): Promise<PublicLocaleRow[]> {
  const b = apiOriginForFetch()
  if (!b) return FALLBACK
  try {
    const res = await fetch(`${b}/api/v1/i18n/locales`, {
      ...withDevNoStore({ next: { revalidate: 120 } }),
      signal: AbortSignal.timeout(I18N_FETCH_MS),
    })
    if (!res.ok) return FALLBACK
    // res.clone() kullanmıyoruz — JSON parse hatası catch'e düşmeli
    const text = await res.text()
    let data: { locales?: PublicLocaleRow[] }
    try {
      data = parseLenientJson(text) as { locales?: PublicLocaleRow[] }
    } catch {
      return FALLBACK
    }
    const rows = Array.isArray(data.locales) ? data.locales : []
    const active = rows.filter((l) => l && l.is_active !== false)
    const merged = mergePublicLocalesWithCatalog(active.length > 0 ? active : FALLBACK)
    return merged.length > 0 ? merged : FALLBACK
  } catch {
    return FALLBACK
  }
})

export async function fetchActiveLocaleCodes(): Promise<string[]> {
  const rows = await fetchActiveLocales()
  return rows.map((r) => r.code)
}

export type LocalizedRouteApiRow = {
  locale: string
  logical_key: string
  path_segment: string
}

/** Tüm diller — `GET /api/v1/i18n/localized-routes` (auth gerekmez). API boşsa statik yedek eklenir. */
export const fetchLocalizedRoutes = cache(async function fetchLocalizedRoutes(): Promise<LocalizedRouteApiRow[]> {
  const b = apiOriginForFetch()
  let routes: LocalizedRouteApiRow[] = []
  if (b) {
    try {
      const res = await fetch(`${b}/api/v1/i18n/localized-routes`, {
        ...withDevNoStore({ next: { revalidate: 120 } }),
        signal: AbortSignal.timeout(I18N_FETCH_MS),
      })
      if (res.ok) {
        const text = await res.text()
        try {
          const data = parseLenientJson(text) as {
            routes?: { locale: string; logical_key: string; path_segment: string }[]
          }
          const raw = Array.isArray(data.routes) ? data.routes : []
          routes = raw.filter((r) => r && r.locale && r.logical_key && r.path_segment)
        } catch {
          routes = []
        }
      }
    } catch {
      routes = []
    }
  }
  const seen = new Set(routes.map((r) => `${r.locale}:${r.logical_key}`))
  for (const r of LOCALIZED_ROUTES_STATIC_FALLBACK) {
    const k = `${r.locale}:${r.logical_key}`
    if (!seen.has(k)) {
      seen.add(k)
      routes.push({ locale: r.locale, logical_key: r.logical_key, path_segment: r.path_segment })
    }
  }
  return routes
})
