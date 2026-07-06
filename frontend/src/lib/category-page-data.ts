import { getRegionHeroConfig, type HeroOverride } from '@/data/region-hero-config'
import type { RegionSliderItem } from '@/components/SectionSliderRegions'
import {
  loadCategoryPageShellCached,
  type CategoryPageShellData,
} from '@/lib/category-page-shell-cache'
import {
  fetchCategoryListings,
  type FetchCategoryListingsOpts,
  type ListingsResult,
  type SearchQuery,
} from '@/lib/listings-fetcher'
import type { PageBuilderModule } from '@/types/listing-types'

export type CategoryPageListingsBundle<TFilter = undefined> = {
  result: ListingsResult
  filterOptions: TFilter
  heroOverride: HeroOverride | undefined
  shell: CategoryPageShellData
}

/**
 * Kategori vitrin sayfası: ilan listesi + filtre seçenekleri + bölge hero + şablon verisi
 * tek `Promise.all` içinde paralel çeker (CategoryPageTemplate ikinci dalga API'yi beklemez).
 */
export async function loadCategoryPageListingsBundle<TFilter = undefined>(
  categorySlug: string,
  query: SearchQuery,
  opts: FetchCategoryListingsOpts,
  locale: string,
  filterOptionsPromise?: Promise<TFilter>,
): Promise<CategoryPageListingsBundle<TFilter>> {
  const regionHandle = opts.regionHandle ?? ''
  const [result, filterOptions, heroOverride, shell] = await Promise.all([
    fetchCategoryListings(categorySlug, query, opts, locale),
    filterOptionsPromise ?? Promise.resolve(undefined as TFilter),
    getRegionHeroConfig(categorySlug, regionHandle),
    loadCategoryPageShellCached(categorySlug, locale, regionHandle || undefined),
  ])
  return { result, filterOptions, heroOverride, shell }
}

/** CategoryPageTemplate'e shell ön yüklemesi — tekrar API çağrısı yok. */
export function categoryPageShellProps(shell: CategoryPageShellData): {
  regionStats: RegionSliderItem[]
  modules: PageBuilderModule[] | undefined
} {
  return {
    regionStats: shell.regionStats,
    modules: shell.pageBuilderModules.length > 0 ? shell.pageBuilderModules : undefined,
  }
}
