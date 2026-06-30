/**
 * @deprecated Yeni kod `category-facet-routes.ts` kullanmalı.
 * Geriye uyumluluk için ince sarmalayıcı.
 */

import {
  buildCategoryFacetVitrinPath,
  categoryFacetRouteFromHandle,
  categoryFacetSlugForCode,
  isCategoryFacetSlug,
  swapCategoryFacetSlug,
  type CategoryFacetRoute,
} from '@/lib/category-facet-routes'
import type { LocalizedRouteIndexes } from '@/lib/localized-path-shared'

export const STAY_RENTAL_THEME_CATEGORY_SLUGS = ['tatil-evleri', 'yat-kiralama'] as const
export type StayRentalThemeCategorySlug = (typeof STAY_RENTAL_THEME_CATEGORY_SLUGS)[number]

export function isStayRentalThemeCategorySlug(slug: string | undefined | null): slug is StayRentalThemeCategorySlug {
  if (!slug) return false
  return (STAY_RENTAL_THEME_CATEGORY_SLUGS as readonly string[]).includes(slug)
}

export function holidayThemeSlugForCode(locale: string, themeCode: string): string | undefined {
  return categoryFacetSlugForCode('tatil-evleri', locale, 'theme', themeCode)
}

export function holidayThemeCodeFromSlug(locale: string, slug: string | undefined | null): string | undefined {
  const route = categoryFacetRouteFromHandle('tatil-evleri', locale, slug)
  return route?.queryKey === 'theme' ? route.queryValue : undefined
}

export function holidayThemeCodeFromAnySlug(slug: string | undefined | null): string | undefined {
  if (!slug?.trim()) return undefined
  for (const cat of STAY_RENTAL_THEME_CATEGORY_SLUGS) {
    const route = categoryFacetRouteFromHandle(cat, 'tr', slug)
    if (route?.queryKey === 'theme') return route.queryValue
  }
  return undefined
}

export function isHolidayThemeSlug(locale: string, slug: string | undefined | null): boolean {
  return isCategoryFacetSlug('tatil-evleri', locale, slug)
}

export function holidayThemeInternalPath(
  categorySlug: StayRentalThemeCategorySlug,
  themeCode: string,
): string | undefined {
  const slug = categoryFacetSlugForCode(categorySlug, 'tr', 'theme', themeCode)
  if (!slug) return undefined
  return `/${categorySlug}/${slug}`
}

export function buildHolidayThemeVitrinPath(
  locale: string,
  categorySlug: StayRentalThemeCategorySlug,
  themeCode: string,
  idx: LocalizedRouteIndexes,
): string {
  return buildCategoryFacetVitrinPath(locale, categorySlug, 'theme', themeCode, idx)
}

export type HolidayThemeRoute = { themeCode: string }

export function holidayThemeRouteFromHandle(
  locale: string,
  categorySlug: string,
  handle: string | undefined,
): HolidayThemeRoute | undefined {
  const route = categoryFacetRouteFromHandle(categorySlug, locale, handle)
  if (!route || route.queryKey !== 'theme') return undefined
  return { themeCode: route.queryValue }
}

export function swapHolidayThemeSlug(slug: string, fromLocale: string, toLocale: string, categorySlug: StayRentalThemeCategorySlug): string | undefined {
  return swapCategoryFacetSlug(categorySlug, slug, fromLocale, toLocale)
}

export type { CategoryFacetRoute }
