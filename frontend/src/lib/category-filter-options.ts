import { HOTEL_ACCOMMODATION_FILTER_FALLBACK } from '@/lib/hotel-accommodation-fallback'
import { HOTEL_THEME_OPTIONS, HOTEL_TYPE_OPTIONS } from '@/lib/hotel-manage-fields'
import { listPublicThemeItems, type ThemeFacet } from '@/lib/catalog-theme-items-api'
import {
  TOUR_ACCOMMODATION_OPTIONS,
  TOUR_TRAVEL_TYPE_OPTIONS,
} from '@/lib/tour-filter-options'
import type { FilterOption } from '@/types/listing-types'

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
  const [types, themes, accommodations] = await Promise.all([
    getFacetOptions('hotel', 'hotel_type', locale, HOTEL_TYPE_OPTIONS),
    getFacetOptions('hotel', 'theme', locale, HOTEL_THEME_OPTIONS),
    getFacetOptions('hotel', 'accommodation', locale, HOTEL_ACCOMMODATION_FILTER_FALLBACK),
  ])

  return [
    checkboxFilter('Otel tipi', 'hotel_type', types),
    checkboxFilter('Tema', 'hotel_theme', themes),
    checkboxFilter('Konaklama tipi', 'hotel_accommodation', accommodations),
    {
      label: 'Yıldız',
      name: 'hotel_stars',
      tabUIType: 'checkbox',
      options: [5, 4, 3, 2, 1].map((star) => ({
        name: `${star} yıldız`,
        value: String(star),
      })),
    },
    {
      label: 'Fiyat aralığı',
      name: 'price',
      tabUIType: 'price-range',
      min: 0,
      max: 50000,
    },
  ].filter((option): option is FilterOption => option != null)
}

export async function getTourCategoryFilterOptions(locale: string): Promise<FilterOption[]> {
  const [travelTypes, accommodationTypes] = await Promise.all([
    getFacetOptions('tour', 'travel_type', locale, TOUR_TRAVEL_TYPE_OPTIONS),
    getFacetOptions('tour', 'accommodation', locale, TOUR_ACCOMMODATION_OPTIONS),
  ])

  return [
    checkboxFilter('Ulaşım türü', 'tour_travel_type', travelTypes),
    checkboxFilter('Konaklama tipi', 'tour_accommodation', accommodationTypes),
    {
      label: 'Süre',
      name: 'tour_duration',
      tabUIType: 'checkbox',
      options: [
        { name: '1 gün', value: '1' },
        { name: '2-3 gün', value: '2-3' },
        { name: '4-7 gün', value: '4-7' },
        { name: '8+ gün', value: '8+' },
      ],
    },
    {
      label: 'Fiyat aralığı',
      name: 'price',
      tabUIType: 'price-range',
      min: 0,
      max: 50000,
    },
  ].filter((option): option is FilterOption => option != null)
}
