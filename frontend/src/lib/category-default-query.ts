import type { SearchQuery } from '@/lib/listings-fetcher'
import type { FetchCategoryListingsOpts } from '@/lib/listings-fetcher'

/** URL'de filtre yok — `/oteller/all` varsayılan vitrin (sayfa 1). */
export function isDefaultCategoryListingQuery(
  query: SearchQuery,
  opts: FetchCategoryListingsOpts = {},
): boolean {
  const region = opts.regionHandle?.trim()
  if (region && region !== 'all') return false

  const page = Math.max(1, parseInt(query.page ?? '1', 10) || 1)
  if (page > 1) return false

  const scalarKeys: (keyof SearchQuery)[] = [
    'q',
    'location',
    'checkin',
    'checkout',
    'last_minute',
    'flex_days',
    'guests',
    'sort',
    'price_min',
    'price_max',
    'beds',
    'bedrooms',
    'bathrooms',
    'attrs',
    'amenities',
    'theme',
    'hotel_type',
    'hotel_theme',
    'hotel_accommodation',
    'hotel_stars',
    'hotel_scope',
    'tour_travel_type',
    'tour_accommodation',
    'tour_duration',
    'tour_departure',
    'tour_region',
    'cruise_line',
    'cruise_route',
    'drop_off',
    'from',
    'to',
    'trip',
    'class',
    'vitrin_tab',
  ]

  for (const key of scalarKeys) {
    const v = query[key]
    if (v != null && String(v).trim() !== '') return false
  }

  return true
}
