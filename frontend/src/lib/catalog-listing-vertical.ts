/**
 * Backend `product_categories.code` / API `category_code` ile hizalı ilan dikey kodu.
 * SEO JSON-LD ve vitrin mantığında öncelik: `listingVertical` — yoksa metin çıkarımı.
 */

/** `listings-fetcher` SLUG_TO_CODE değerleri + API public search ile uyumlu */
export const CATALOG_LISTING_VERTICAL_CODES = [
  'hotel',
  'holiday_home',
  'yacht_charter',
  'tour',
  'activity',
  'cruise',
  'hajj',
  'visa',
  'car_rental',
  'ferry',
  'transfer',
  'flight',
] as const

export type CatalogListingVerticalCode = (typeof CATALOG_LISTING_VERTICAL_CODES)[number]

const VERTICAL_SET = new Set<string>(CATALOG_LISTING_VERTICAL_CODES)

/**
 * API `category_code` veya `listing_vertical` ham dizesini güvenli tipe çevirir.
 */
export function normalizeCatalogVertical(
  raw: string | null | undefined,
): CatalogListingVerticalCode | undefined {
  if (raw == null) return undefined
  const v = String(raw).trim().toLowerCase()
  return VERTICAL_SET.has(v) ? (v as CatalogListingVerticalCode) : undefined
}

/** schema.org @type — ItemList satırları ve tutarlılık için */
export function schemaOrgTypeForCatalogVertical(code: CatalogListingVerticalCode): string {
  const map: Record<CatalogListingVerticalCode, string> = {
    hotel: 'Hotel',
    holiday_home: 'VacationRental',
    yacht_charter: 'Boat',
    tour: 'TouristTrip',
    activity: 'TouristAttraction',
    cruise: 'TouristTrip',
    hajj: 'Product',
    visa: 'Product',
    car_rental: 'Product',
    ferry: 'Product',
    transfer: 'Service',
    flight: 'Product',
  }
  return map[code] ?? 'Product'
}
