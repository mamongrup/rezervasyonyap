import { getRegionHeroConfig, type HeroOverride } from '@/data/region-hero-config'
import type { RegionSliderItem } from '@/components/SectionSliderRegions'
import { isDefaultCategoryListingQuery } from '@/lib/category-default-query'
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
import { unstable_cache } from 'next/cache'

export type CategoryPageListingsBundle<TFilter = undefined> = {
  result: ListingsResult
  filterOptions: TFilter
  heroOverride: HeroOverride | undefined
  shell: CategoryPageShellData
}

function fetchDefaultCategoryListingsCached(
  categorySlug: string,
  locale: string,
): Promise<ListingsResult> {
  return unstable_cache(
    async () => fetchCategoryListings(categorySlug, {}, {}, locale),
    ['category-listings-v1', categorySlug, locale],
    // Kategori vitrinleri ilk üretimde API/DB üzerinde pahalı olabilir. Kabuk verisi
    // zaten 5 dakika tutulduğundan listeyi de aynı sürede saklamak, her dakika bir
    // ziyaretçiyi soğuk render'a düşürmeyi engeller.
    { revalidate: 300, tags: [`category-listings-${categorySlug}`] },
  )()
}

async function loadCategoryPageListingsBundleInner<TFilter = undefined>(
  categorySlug: string,
  query: SearchQuery,
  opts: FetchCategoryListingsOpts,
  locale: string,
  filterOptionsPromise?: Promise<TFilter>,
): Promise<CategoryPageListingsBundle<TFilter>> {
  const regionHandle = opts.regionHandle ?? ''
  const listingsPromise = isDefaultCategoryListingQuery(query, opts)
    ? fetchDefaultCategoryListingsCached(categorySlug, locale)
    : fetchCategoryListings(categorySlug, query, opts, locale)

  const [result, filterOptions, heroOverride, shell] = await Promise.all([
    listingsPromise,
    filterOptionsPromise ?? Promise.resolve(undefined as TFilter),
    getRegionHeroConfig(categorySlug, regionHandle),
    loadCategoryPageShellCached(categorySlug, locale, regionHandle || undefined),
  ])
  return { result, filterOptions, heroOverride, shell }
}

/**
 * Kategori vitrin sayfası: ilan listesi + filtre seçenekleri + bölge hero + şablon verisi.
 * `/kategori/all` varsayılan listesi `unstable_cache` ile istekler arası önbelleğe alınır.
 */
export async function loadCategoryPageListingsBundle<TFilter = undefined>(
  categorySlug: string,
  query: SearchQuery,
  opts: FetchCategoryListingsOpts,
  locale: string,
  filterOptionsPromise?: Promise<TFilter>,
): Promise<CategoryPageListingsBundle<TFilter>> {
  return loadCategoryPageListingsBundleInner(
    categorySlug,
    query,
    opts,
    locale,
    filterOptionsPromise,
  )
}

/** CategoryPageTemplate'e shell ön yüklemesi — tekrar region-stats çağrısı yok. */
export function categoryPageShellProps(shell: CategoryPageShellData): {
  regionStats: RegionSliderItem[]
  modules: PageBuilderModule[] | undefined
} {
  return {
    regionStats: shell.regionStats,
    modules: shell.pageBuilderModules.length > 0 ? shell.pageBuilderModules : undefined,
  }
}
