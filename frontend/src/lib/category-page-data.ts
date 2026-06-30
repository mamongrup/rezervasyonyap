import { getRegionHeroConfig, type HeroOverride } from '@/data/region-hero-config'
import {
  fetchCategoryListings,
  type FetchCategoryListingsOpts,
  type ListingsResult,
  type SearchQuery,
} from '@/lib/listings-fetcher'

export type CategoryPageListingsBundle<TFilter = undefined> = {
  result: ListingsResult
  filterOptions: TFilter
  heroOverride: HeroOverride | undefined
}

/**
 * Kategori vitrin sayfası: ilan listesi + filtre seçenekleri + bölge hero'sunu
 * paralel çeker. Sıralı `fetchCategoryListings` → `Promise.all(filter, hero)`
 * deseninde ~1 ekstra round-trip gecikmesi oluşuyordu.
 */
export async function loadCategoryPageListingsBundle<TFilter = undefined>(
  categorySlug: string,
  query: SearchQuery,
  opts: FetchCategoryListingsOpts,
  locale: string,
  filterOptionsPromise?: Promise<TFilter>,
): Promise<CategoryPageListingsBundle<TFilter>> {
  const regionHandle = opts.regionHandle ?? ''
  const [result, filterOptions, heroOverride] = await Promise.all([
    fetchCategoryListings(categorySlug, query, opts, locale),
    filterOptionsPromise ?? Promise.resolve(undefined as TFilter),
    getRegionHeroConfig(categorySlug, regionHandle),
  ])
  return { result, filterOptions, heroOverride }
}
