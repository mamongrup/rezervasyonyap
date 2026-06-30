/**
 * Edge (proxy.ts) — `?hotel_theme=sea_view` gibi facet query'lerini kanonik path'e 308 yönlendirir.
 */

import { LOCALIZED_FIRST_SEGMENT_ALIASES } from '@/data/localized-middleware-rewrites'
import { LOCALIZED_ROUTES_STATIC_FALLBACK } from '@/data/localized-routes-fallback'
import {
  buildCategoryFacetVitrinPath,
  categoryFacetRouteFromHandle,
  isFacetRoutableCategorySlug,
  pickFacetForPath,
} from '@/lib/category-facet-routes'
import { defaultLocale, isAppLocale } from '@/lib/i18n-config'
import { buildLocalizedRouteIndexes } from '@/lib/localized-path-shared'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

const FACET_ROUTE_IDX = buildLocalizedRouteIndexes(LOCALIZED_ROUTES_STATIC_FALLBACK)

function parseFacetCategoryPath(
  pathname: string,
): { locale: string; categorySlug: string; handle?: string } | null {
  const raw = pathname.split('/').filter(Boolean)
  if (!raw.length) return null

  let locale = defaultLocale.toLowerCase()
  let i = 0
  const first = raw[0]
  if (first && isAppLocale(first)) {
    locale = first.toLowerCase()
    i = 1
  }

  const vitrinSeg = raw[i]?.toLowerCase()
  if (!vitrinSeg) return null

  const logical = LOCALIZED_FIRST_SEGMENT_ALIASES[locale]?.[vitrinSeg] ?? raw[i]!
  if (!isFacetRoutableCategorySlug(logical)) return null

  return { locale, categorySlug: logical, handle: raw[i + 1] }
}

/** Facet query varsa kanonik vitrin path'ine yönlendir (308). */
export function facetQueryRedirectResponse(request: NextRequest): NextResponse | null {
  const { pathname, searchParams } = request.nextUrl
  const parsed = parseFacetCategoryPath(pathname)
  if (!parsed) return null

  const query: Record<string, string | undefined> = {}
  searchParams.forEach((v, k) => {
    query[k] = v
  })

  const facet = pickFacetForPath(parsed.categorySlug, query)
  if (!facet) return null

  const pathFacet = parsed.handle
    ? categoryFacetRouteFromHandle(parsed.categorySlug, parsed.locale, parsed.handle)
    : undefined

  const targetPath = buildCategoryFacetVitrinPath(
    parsed.locale,
    parsed.categorySlug,
    facet.queryKey,
    facet.queryValue,
    FACET_ROUTE_IDX,
  )

  const alreadyOnPath =
    pathFacet?.queryKey === facet.queryKey && pathFacet?.queryValue === facet.queryValue

  if (alreadyOnPath && !searchParams.has(facet.queryKey)) return null

  const url = request.nextUrl.clone()
  url.pathname = targetPath
  const nextSp = new URLSearchParams()
  searchParams.forEach((v, k) => {
    if (k !== facet.queryKey) nextSp.append(k, v)
  })
  url.search = nextSp.toString()

  return NextResponse.redirect(url, 308)
}
