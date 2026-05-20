/**
 * Katalog tema öğeleri (`category_theme_items`) — vitrin + yönetim uçları.
 *
 * Vitrin: `GET /api/v1/catalog/public/theme-items`
 * Yönetim: `GET|POST|PATCH|DELETE /api/v1/catalog/manage/theme-items` (admin)
 */

import { HOTEL_ACCOMMODATION_FILTER_FALLBACK } from '@/lib/hotel-accommodation-fallback'
import { HOTEL_THEME_OPTIONS, HOTEL_TYPE_OPTIONS } from '@/lib/hotel-manage-fields'
import {
  TOUR_ACCOMMODATION_OPTIONS,
  TOUR_TRAVEL_TYPE_OPTIONS,
} from '@/lib/tour-filter-options'

export type ThemeFacet = 'hotel_type' | 'theme' | 'accommodation' | 'travel_type'

function travelApiBase(): string {
  if (typeof process === 'undefined') return ''
  return String(process.env.NEXT_PUBLIC_TRAVEL_API_URL ?? '')
    .trim()
    .replace(/\/$/, '')
}

/** Tam backend kökü (örn. http://127.0.0.1:8080) — path’e `/api/v1/...` eklenir. */
function apiV1(path: string): string {
  const base = travelApiBase()
  const p = path.startsWith('/') ? path : `/${path}`
  if (!base) return `/api/v1${p}`
  return `${base}/api/v1${p}`
}

async function readJson<T>(res: Response): Promise<T | null> {
  if (res.status === 404) return null
  if (!res.ok) return null
  try {
    return (await res.json()) as T
  } catch {
    return null
  }
}

function facetCodeSet(categoryCode: string, facet: ThemeFacet): Set<string> | null {
  if (categoryCode === 'tour') {
    if (facet === 'travel_type') return new Set(TOUR_TRAVEL_TYPE_OPTIONS.map((x) => x.code))
    if (facet === 'accommodation') return new Set(TOUR_ACCOMMODATION_OPTIONS.map((x) => x.code))
    return new Set()
  }
  if (facet === 'hotel_type') return new Set(HOTEL_TYPE_OPTIONS.map((x) => x.code))
  if (facet === 'theme') return new Set(HOTEL_THEME_OPTIONS.map((x) => x.code))
  if (facet === 'accommodation') return new Set(HOTEL_ACCOMMODATION_FILTER_FALLBACK.map((x) => x.code))
  return null
}

function filterByFacet(
  items: { code: string; label: string }[] | undefined,
  categoryCode: string,
  facet: ThemeFacet,
): { code: string; label: string }[] {
  if (!items?.length) return []
  const allow = facetCodeSet(categoryCode, facet)
  if (allow == null) return []
  return items.filter((i) => allow.has(i.code))
}

/** Vitrin — auth gerekmez; facet filtresi yok (tatil evi vb. tüm aktif kodlar). */
export async function listPublicCategoryThemeItems(params: {
  categoryCode: string
  locale: string
}): Promise<{ items: { code: string; label: string }[] }> {
  const q = new URLSearchParams({
    category_code: params.categoryCode,
    locale: params.locale,
  })
  try {
    const res = await fetch(apiV1(`/catalog/public/theme-items?${q}`), {
      method: 'GET',
      cache: 'no-store',
      headers: { Accept: 'application/json' },
    })
    const data = await readJson<{ items?: { code: string; label: string }[] }>(res)
    return { items: Array.isArray(data?.items) ? data!.items! : [] }
  } catch {
    return { items: [] }
  }
}

/** Vitrin — auth gerekmez */
export async function listPublicThemeItems(params: {
  categoryCode: string
  locale: string
  facet: ThemeFacet
}): Promise<{ items?: { code: string; label: string }[] } | null> {
  const q = new URLSearchParams({
    category_code: params.categoryCode,
    locale: params.locale,
  })
  try {
    const res = await fetch(apiV1(`/catalog/public/theme-items?${q}`), {
      method: 'GET',
      cache: 'no-store',
      headers: { Accept: 'application/json' },
    })
    const data = await readJson<{ items?: { code: string; label: string }[] }>(res)
    if (!data?.items) return data
    return { items: filterByFacet(data.items, params.categoryCode, params.facet) }
  } catch {
    return null
  }
}

export type ManageThemeItemRow = { id: string; code: string; label: string }

/** Yönetim listesi — Bearer token; `facet` desteklenen kategori alt kümeleri için istemci filtresi. */
export async function listManageThemeItems(
  token: string,
  params: { categoryCode: string; locale: string; facet?: ThemeFacet },
): Promise<{ items: ManageThemeItemRow[] }> {
  const q = new URLSearchParams({
    category_code: params.categoryCode,
    locale: params.locale,
  })
  const res = await fetch(apiV1(`/catalog/manage/theme-items?${q}`), {
    method: 'GET',
    cache: 'no-store',
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${token}`,
    },
  })
  let data: { items?: ManageThemeItemRow[]; error?: string } | null = null
  try {
    data = (await res.json()) as { items?: ManageThemeItemRow[]; error?: string }
  } catch {
    data = null
  }
  if (!res.ok) {
    const msg = typeof data?.error === 'string' ? data.error : `http_${res.status}`
    throw new Error(msg)
  }
  let items = Array.isArray(data?.items) ? data!.items! : []
  const facet = params.facet
  if (facet != null) {
    const allow = facetCodeSet(params.categoryCode, facet)
    if (allow != null) items = items.filter((i) => allow.has(i.code))
  }
  return { items }
}

export async function patchManageThemeItem(
  token: string,
  id: string,
  body: { label: string; locale_code: string },
): Promise<void> {
  const enc = encodeURIComponent(id)
  const res = await fetch(apiV1(`/catalog/manage/theme-items/${enc}`), {
    method: 'PATCH',
    cache: 'no-store',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const t = await res.text().catch(() => '')
    throw new Error(t || `patch_theme_item_${res.status}`)
  }
}

export async function createManageThemeItem(
  token: string,
  body: {
    category_code: string
    facet?: ThemeFacet
    code: string
    label: string
    locale_code: string
  },
): Promise<void> {
  const res = await fetch(apiV1('/catalog/manage/theme-items'), {
    method: 'POST',
    cache: 'no-store',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      category_code: body.category_code,
      code: body.code,
      label: body.label,
      locale_code: body.locale_code,
    }),
  })
  if (!res.ok) {
    const t = await res.text().catch(() => '')
    throw new Error(t || `create_theme_item_${res.status}`)
  }
}

export async function deleteManageThemeItem(token: string, id: string): Promise<void> {
  const enc = encodeURIComponent(id)
  const res = await fetch(apiV1(`/catalog/manage/theme-items/${enc}`), {
    method: 'DELETE',
    cache: 'no-store',
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${token}`,
    },
  })
  if (!res.ok) {
    const t = await res.text().catch(() => '')
    throw new Error(t || `delete_theme_item_${res.status}`)
  }
}
