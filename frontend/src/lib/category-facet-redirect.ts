/**
 * Eski `?facet=code` sorgularını kanonik path URL'lerine yönlendirir.
 */

import {
  applyFacetRouteToSearchQuery,
  buildCategoryFacetVitrinPath,
  categoryFacetRouteFromHandle,
  pickFacetForPath,
  type CategoryFacetRoute,
} from '@/lib/category-facet-routes'
import { fetchLocalizedRoutes } from '@/lib/i18n-server'
import { buildLocalizedRouteIndexes } from '@/lib/localized-path-shared'
import { redirect } from 'next/navigation'

function spValue(v: string | string[] | undefined): string | undefined {
  if (Array.isArray(v)) return v[0]
  return v
}

function queryRecordFromSp(sp: Record<string, string | string[] | undefined>): Record<string, string | undefined> {
  const out: Record<string, string | undefined> = {}
  for (const [k, v] of Object.entries(sp)) {
    out[k] = spValue(v)
  }
  return out
}

function redirectTargetWithQuery(
  target: string,
  sp: Record<string, string | string[] | undefined>,
  omitKeys: Set<string>,
): string {
  const params = new URLSearchParams()
  for (const [k, v] of Object.entries(sp)) {
    if (omitKeys.has(k)) continue
    const val = spValue(v)
    if (val != null && String(val).trim() !== '') params.set(k, String(val))
  }
  const q = params.toString()
  return q ? `${target}?${q}` : target
}

/** Tek facet query seçimi varsa ve path ile uyuşmuyorsa 307 redirect */
export async function redirectCategoryFacetFromQuery(
  locale: string,
  categorySlug: string,
  sp: Record<string, string | string[] | undefined>,
  currentHandle?: string,
): Promise<void> {
  const facet = pickFacetForPath(categorySlug, queryRecordFromSp(sp))
  if (!facet) return

  const pathFacet = currentHandle ? categoryFacetRouteFromHandle(categorySlug, locale, currentHandle) : undefined
  if (pathFacet?.queryKey === facet.queryKey && pathFacet.queryValue === facet.queryValue) return

  const idx = buildLocalizedRouteIndexes(await fetchLocalizedRoutes())
  const target = buildCategoryFacetVitrinPath(locale, categorySlug, facet.queryKey, facet.queryValue, idx)
  redirect(redirectTargetWithQuery(target, sp, new Set([facet.queryKey])))
}

export function facetLabelFromRoute(
  route: CategoryFacetRoute,
  filterOptions: { name: string; options: { name: string; value?: string }[] }[],
): string | undefined {
  const filter = filterOptions.find((f) => f.name === route.queryKey)
  if (!filter) return undefined
  const opt = filter.options.find((o) => (o.value ?? o.name) === route.queryValue)
  return opt?.name
}

export function mergeFacetRouteIntoQuery<T extends Record<string, string | undefined>>(
  query: T,
  route: CategoryFacetRoute | undefined,
): T {
  if (!route) return query
  return applyFacetRouteToSearchQuery(query, route) as T
}
