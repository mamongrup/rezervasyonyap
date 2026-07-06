import 'server-only'

import { cache } from 'react'
import { unstable_cache } from 'next/cache'
import { getCategoryPageBuilderConfig } from '@/data/page-builder-config'
import type { RegionSliderItem } from '@/components/SectionSliderRegions'
import { getPublicRegionStats } from '@/lib/travel-api'
import {
  isStayRentalCategory,
  stayRentalPropertyTypeFromHandle,
  type StayRentalCategoryCode,
} from '@/lib/stay-rental-categories'
import { SLUG_TO_CODE } from '@/lib/listings-fetcher'
import type { PageBuilderModule } from '@/types/listing-types'

export type CategoryPageShellData = {
  regionStats: RegionSliderItem[]
  pageBuilderModules: PageBuilderModule[]
}

async function loadCategoryPageShellInner(
  categorySlug: string,
  locale: string,
  regionHandle?: string,
): Promise<CategoryPageShellData> {
  const categoryCode = SLUG_TO_CODE[categorySlug] ?? categorySlug
  const stayRentalPropertyTypeForRegions =
    isStayRentalCategory(categoryCode) && regionHandle && regionHandle !== 'all'
      ? stayRentalPropertyTypeFromHandle(categoryCode as StayRentalCategoryCode, regionHandle)
      : undefined

  const [regionStats, pageBuilderModules] = await Promise.all([
    getPublicRegionStats(
      categoryCode,
      12,
      { next: { revalidate: 300 } } as RequestInit,
      stayRentalPropertyTypeForRegions
        ? { propertyType: stayRentalPropertyTypeForRegions }
        : undefined,
    ).catch(() => [] as RegionSliderItem[]),
    getCategoryPageBuilderConfig(categorySlug, locale).catch(
      () => [] as PageBuilderModule[],
    ),
  ])

  return { regionStats, pageBuilderModules }
}

/** `/all` landing — istekler arası 5 dk önbellek (region-stats + page builder). */
const loadCategoryPageShellPersisted = (
  categorySlug: string,
  locale: string,
  regionHandle: string,
) =>
  unstable_cache(
    async () => loadCategoryPageShellInner(categorySlug, locale, regionHandle || undefined),
    ['category-shell-v1', categorySlug, locale, regionHandle || 'all'],
    { revalidate: 300, tags: [`category-shell-${categorySlug}`] },
  )()

/**
 * Kategori şablonu için bölge istatistikleri + page builder config.
 * `loadCategoryPageListingsBundle` ile paralel çağrılırsa aynı render'da React cache isabet eder.
 */
export const loadCategoryPageShellCached = cache(
  async (
    categorySlug: string,
    locale: string,
    regionHandle?: string,
  ): Promise<CategoryPageShellData> => {
    const handle = regionHandle?.trim() || 'all'
    if (handle === 'all') {
      return loadCategoryPageShellPersisted(categorySlug, locale, 'all')
    }
    return loadCategoryPageShellInner(categorySlug, locale, regionHandle)
  },
)
