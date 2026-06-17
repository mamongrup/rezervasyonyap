/** Tatil evleri / yat kiralama vitrin fiyat filtresi üst sınırı */
export const STAY_RENTAL_PRICE_FILTER_MIN = 0
export const STAY_RENTAL_PRICE_FILTER_MAX = 1_000_000
/** 1M aralıkta sürüklemeyi kullanılabilir tutar */
export const STAY_RENTAL_PRICE_FILTER_STEP = 5_000

export function clampStayRentalPriceFilter(value: number): number {
  return Math.min(STAY_RENTAL_PRICE_FILTER_MAX, Math.max(STAY_RENTAL_PRICE_FILTER_MIN, value))
}

export function defaultStayRentalPriceFilterMax(urlMax: string | null | undefined): number {
  if (!urlMax?.trim()) return STAY_RENTAL_PRICE_FILTER_MAX
  const n = parseInt(urlMax, 10)
  if (!Number.isFinite(n) || n <= 0) return STAY_RENTAL_PRICE_FILTER_MAX
  return clampStayRentalPriceFilter(n)
}

/** Eski şablon filtreleri: `priceRange_min`, `Price-range_min` → standart `price_min` / `price_max` */
export function resolveCatalogPriceQueryKeys(
  query: Record<string, string | undefined>,
): { price_min?: string; price_max?: string } {
  const price_min =
    query.price_min?.trim() ||
    query.priceRange_min?.trim() ||
    query['Price-range_min']?.trim() ||
    undefined
  const price_max =
    query.price_max?.trim() ||
    query.priceRange_max?.trim() ||
    query['Price-range_max']?.trim() ||
    undefined
  return {
    ...(price_min ? { price_min } : {}),
    ...(price_max ? { price_max } : {}),
  }
}

/** Tam aralık (0–1M) seçiliyse API’ye gönderme — gereksiz filtreleme yapmasın */
export function activeCatalogPriceFilterParams(
  priceMinRaw?: string,
  priceMaxRaw?: string,
): { priceMin?: string; priceMax?: string } {
  const minN = priceMinRaw?.trim()
    ? parseInt(priceMinRaw, 10)
    : STAY_RENTAL_PRICE_FILTER_MIN
  const maxN = priceMaxRaw?.trim()
    ? defaultStayRentalPriceFilterMax(priceMaxRaw)
    : STAY_RENTAL_PRICE_FILTER_MAX
  const priceMin =
    Number.isFinite(minN) && minN > STAY_RENTAL_PRICE_FILTER_MIN ? String(minN) : undefined
  const priceMax =
    Number.isFinite(maxN) && maxN < STAY_RENTAL_PRICE_FILTER_MAX ? String(maxN) : undefined
  return { priceMin, priceMax }
}
