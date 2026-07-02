import { HOTEL_ACCOMMODATION_FILTER_FALLBACK } from '@/lib/hotel-accommodation-fallback'
import { HOTEL_THEME_OPTIONS, HOTEL_TYPE_OPTIONS } from '@/lib/hotel-manage-fields'
import { listPublicThemeItems, type ThemeFacet } from '@/lib/catalog-theme-items-api'
import {
  getTourAccommodationOptions,
  getTourDepartureCityOptions,
  getTourTravelTypeOptions,
} from '@/lib/tour-filter-options'
import { getTourRegionFilterOptions } from '@/lib/tour-kultur-regions'
import {
  getCruiseLineFilterOptions,
  getCruiseRouteFilterOptions,
} from '@/data/cruise-hub-categories'
import type { FilterOption } from '@/types/listing-types'
import { getMessages } from '@/utils/getT'
import { STAY_RENTAL_PRICE_FILTER_MAX } from '@/lib/stay-rental-price-filter'

type CodeLabel = { code: string; label: string }

function mergeFacetOptions(api: CodeLabel[] | null | undefined, fallback: CodeLabel[]): CodeLabel[] {
  if (api && api.length > 0) return api
  return fallback
}

async function getFacetOptions(
  categoryCode: string,
  facet: ThemeFacet,
  locale: string,
  fallback: CodeLabel[],
): Promise<CodeLabel[]> {
  const result = await listPublicThemeItems({ categoryCode, facet, locale })
  return mergeFacetOptions(result?.items, fallback)
}

function checkboxFilter(
  label: string,
  name: string,
  options: CodeLabel[],
): FilterOption | null {
  const normalized = options
    .map((option) => ({
      name: option.label,
      value: option.code,
    }))
    .filter((option) => option.value.trim() !== '' && option.name.trim() !== '')
  if (normalized.length === 0) return null
  return {
    label,
    name,
    tabUIType: 'checkbox',
    options: normalized,
  }
}

export async function getHotelCategoryFilterOptions(locale: string): Promise<FilterOption[]> {
  const m = getMessages(locale)
  const filters = m.categoryPage.listingFilters

  const [types, themes, accommodations] = await Promise.all([
    getFacetOptions('hotel', 'hotel_type', locale, HOTEL_TYPE_OPTIONS),
    getFacetOptions('hotel', 'theme', locale, HOTEL_THEME_OPTIONS),
    getFacetOptions('hotel', 'accommodation', locale, HOTEL_ACCOMMODATION_FILTER_FALLBACK),
  ])

  return [
    checkboxFilter(filters.hotelTypeLabel, 'hotel_type', types),
    checkboxFilter(filters.themeLabel, 'hotel_theme', themes),
    checkboxFilter(filters.accommodationTypeLabel, 'hotel_accommodation', accommodations),
    {
      label: filters.starsLabel,
      name: 'hotel_stars',
      tabUIType: 'checkbox',
      options: [5, 4, 3, 2, 1].map((star) => ({
        name: `${star} ${filters.starSuffix}`,
        value: String(star),
      })),
    },
    {
      label: filters.priceRangeLabel,
      name: 'price',
      tabUIType: 'price-range',
      min: 0,
      max: STAY_RENTAL_PRICE_FILTER_MAX,
    },
  ].filter((option): option is FilterOption => option != null)
}

export async function getTourCategoryFilterOptions(locale: string): Promise<FilterOption[]> {
  const m = getMessages(locale)
  const filters = m.categoryPage.listingFilters

  const [travelTypes, accommodationTypes] = await Promise.all([
    getFacetOptions('tour', 'travel_type', locale, getTourTravelTypeOptions(locale)),
    getFacetOptions('tour', 'accommodation', locale, getTourAccommodationOptions(locale)),
  ])

  const departureCities = getTourDepartureCityOptions(locale)
  const tourRegions = getTourRegionFilterOptions(locale)

  return [
    checkboxFilter(filters.tourRegionLabel ?? 'Bölge', 'tour_region', tourRegions),
    checkboxFilter(filters.tourDepartureLabel, 'tour_departure', departureCities),
    checkboxFilter(filters.travelTypeLabel, 'tour_travel_type', travelTypes),
    checkboxFilter(filters.accommodationTypeLabel, 'tour_accommodation', accommodationTypes),
    {
      label: filters.durationLabel,
      name: 'tour_duration',
      tabUIType: 'checkbox',
      options: [
        { name: filters.duration1Day, value: '1' },
        { name: filters.duration2_3Days, value: '2-3' },
        { name: filters.duration4_7Days, value: '4-7' },
        { name: filters.duration8PlusDays, value: '8+' },
      ],
    },
    {
      label: filters.priceRangeLabel,
      name: 'price',
      tabUIType: 'price-range',
      min: 0,
      max: STAY_RENTAL_PRICE_FILTER_MAX,
    },
  ].filter((option): option is FilterOption => option != null)
}

export async function getCruiseCategoryFilterOptions(locale: string): Promise<FilterOption[]> {
  const m = getMessages(locale)
  const filters = m.categoryPage.listingFilters

  return [
    checkboxFilter(filters.cruiseLineLabel ?? 'Gemi hattı', 'cruise_line', getCruiseLineFilterOptions(locale)),
    checkboxFilter(filters.cruiseRouteLabel ?? 'Rota', 'cruise_route', getCruiseRouteFilterOptions(locale)),
    {
      label: filters.priceRangeLabel,
      name: 'price',
      tabUIType: 'price-range',
      min: 0,
      max: STAY_RENTAL_PRICE_FILTER_MAX,
    },
  ].filter((option): option is FilterOption => option != null)
}
