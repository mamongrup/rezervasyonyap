/**
 * Merkezi ilan arama yardımcısı.
 *
 * 1. Backend API bağlıysa `searchPublicListings` çağrılır ve sonuç `TListingBase`'e dönüştürülür.
 * 2. API tanımlı değilse veya hata varsa mock veri fonksiyonu çağrılır.
 *
 * Tüm kategori sayfaları bu helper'ı kullanmalı.
 */

import { searchPublicListings, type PublicListingItem } from '@/lib/travel-api'
import { categoryLabelTr } from '@/lib/catalog-category-ui'
import { normalizeCatalogVertical } from '@/lib/catalog-listing-vertical'
import { formatMoneyIntl } from '@/lib/parse-listing-price'
import type { TListingBase } from '@/types/listing-types'
import { parseStayBookingRulesFromPublicItem } from '@/lib/stay-booking-rules'

type MockFn = () => Promise<TListingBase[]>

const MOCK_LOADERS: Record<string, MockFn> = {
  hotel:         () => import('@/data/listings').then((m) => m.getStayListings() as Promise<TListingBase[]>),
  holiday_home:  () => import('@/data/listings').then((m) => m.getStayListings() as Promise<TListingBase[]>),
  yacht_charter: () => import('@/data/listings').then((m) => m.getStayListings() as Promise<TListingBase[]>),
  tour:          () => import('@/data/listings').then((m) => m.getExperienceListings() as Promise<TListingBase[]>),
  activity:      () => import('@/data/listings').then((m) => m.getExperienceListings() as Promise<TListingBase[]>),
  cruise:        () => import('@/data/listings').then((m) => m.getExperienceListings() as Promise<TListingBase[]>),
  hajj:          () => import('@/data/listings').then((m) => m.getExperienceListings() as Promise<TListingBase[]>),
  visa:          () => import('@/data/listings').then((m) => m.getVisaMockListings() as Promise<TListingBase[]>),
  car_rental:    () => import('@/data/listings').then((m) => m.getCarListings() as Promise<TListingBase[]>),
  transfer:      () => import('@/data/listings').then((m) => m.getCarListings() as Promise<TListingBase[]>),
  ferry:         () => import('@/data/listings').then((m) => m.getCarListings() as Promise<TListingBase[]>),
  flight:        () => import('@/data/listings').then((m) => m.getFlightListings() as Promise<TListingBase[]>),
}

export const SLUG_TO_CODE: Record<string, string> = {
  oteller:        'hotel',
  'tatil-evleri': 'holiday_home',
  'yat-kiralama': 'yacht_charter',
  turlar:         'tour',
  aktiviteler:    'activity',
  kruvaziyer:     'cruise',
  'hac-umre':     'hajj',
  vize:           'visa',
  'arac-kiralama':'car_rental',
  transfer:       'transfer',
  feribot:        'ferry',
  'ucak-bileti':  'flight',
}

export interface SearchQuery {
  location?: string
  checkin?: string
  checkout?: string
  guests?: string
  page?: string
  /** Araç kiralama formu */
  drop_off?: string
  /** Uçuş formu */
  from?: string
  to?: string
  trip?: string
  class?: string
  /** tatil evleri: price_asc | price_desc */
  sort?: string
  price_min?: string
  price_max?: string
  beds?: string
  bedrooms?: string
  bathrooms?: string
  /** virgülle: pool,kitchen,wifi,... */
  attrs?: string
  /** Tatil evi tema kodları (virgülle) */
  theme?: string
}

export interface ListingsResult {
  listings: TListingBase[]
  total: number
  page: number
  perPage: number
  fromApi: boolean
}

type CategoryListingsCacheEntry = {
  expiresAt: number
  value: ListingsResult
}
type FlexibleHolidayListingsCacheEntry = {
  expiresAt: number
  value: TListingBase[]
}

const CATEGORY_LISTINGS_DEFAULT_TTL_MS = 20_000
const CATEGORY_LISTINGS_MAX_ENTRIES = 120
const categoryListingsCache = new Map<string, CategoryListingsCacheEntry>()
const FLEXIBLE_HOLIDAY_LISTINGS_TTL_MS = 20_000
const FLEXIBLE_HOLIDAY_LISTINGS_MAX_ENTRIES = 80
const flexibleHolidayListingsCache = new Map<string, FlexibleHolidayListingsCacheEntry>()

const CATEGORY_LISTINGS_TTL_BY_SLUG_MS: Partial<Record<keyof typeof SLUG_TO_CODE | string, number>> = {
  // Daha dinamik fiyat/değişkenlik gösteren kategoriler: kısa TTL
  oteller: 12_000,
  'ucak-bileti': 12_000,
  'arac-kiralama': 15_000,
  transfer: 15_000,
  feribot: 15_000,
  // İçerik değişimi nispeten daha yavaş kategoriler: uzun TTL
  'tatil-evleri': 30_000,
  'yat-kiralama': 25_000,
  aktiviteler: 30_000,
  turlar: 35_000,
  kruvaziyer: 30_000,
  'hac-umre': 30_000,
  vize: 60_000,
}

function resolveCategoryListingsTtlMs(categorySlug: string): number {
  const ttl = CATEGORY_LISTINGS_TTL_BY_SLUG_MS[categorySlug]
  if (typeof ttl === 'number' && Number.isFinite(ttl) && ttl > 0) return ttl
  return CATEGORY_LISTINGS_DEFAULT_TTL_MS
}

function buildCategoryListingsCacheKey(
  categorySlug: string,
  query: SearchQuery,
  opts: FetchCategoryListingsOpts,
  locale: string,
): string {
  return JSON.stringify({
    categorySlug,
    locale: locale || 'tr',
    regionHandle: opts.regionHandle ?? null,
    query: {
      location: query.location ?? null,
      checkin: query.checkin ?? null,
      checkout: query.checkout ?? null,
      guests: query.guests ?? null,
      page: query.page ?? null,
      drop_off: query.drop_off ?? null,
      from: query.from ?? null,
      to: query.to ?? null,
      trip: query.trip ?? null,
      class: query.class ?? null,
      sort: query.sort ?? null,
      price_min: query.price_min ?? null,
      price_max: query.price_max ?? null,
      beds: query.beds ?? null,
      bedrooms: query.bedrooms ?? null,
      bathrooms: query.bathrooms ?? null,
      attrs: query.attrs ?? null,
      theme: query.theme ?? null,
    },
  })
}

function getCachedCategoryListings(key: string): ListingsResult | undefined {
  const cached = categoryListingsCache.get(key)
  if (!cached) return undefined
  if (cached.expiresAt <= Date.now()) {
    categoryListingsCache.delete(key)
    return undefined
  }
  return cached.value
}

function setCachedCategoryListings(key: string, value: ListingsResult, ttlMs: number): void {
  if (categoryListingsCache.size >= CATEGORY_LISTINGS_MAX_ENTRIES) {
    const oldestKey = categoryListingsCache.keys().next().value as string | undefined
    if (oldestKey) categoryListingsCache.delete(oldestKey)
  }
  categoryListingsCache.set(key, { value, expiresAt: Date.now() + ttlMs })
}

function buildFlexibleHolidayListingsCacheKey(
  query: SearchQuery,
  opts: FetchCategoryListingsOpts,
  locale: string,
  maxItems: number,
): string {
  return JSON.stringify({
    locale: locale || 'tr',
    regionHandle: opts.regionHandle ?? null,
    maxItems,
    query: {
      location: query.location ?? null,
      checkin: query.checkin ?? null,
      checkout: query.checkout ?? null,
      guests: query.guests ?? null,
      page: query.page ?? null,
      drop_off: query.drop_off ?? null,
      from: query.from ?? null,
      to: query.to ?? null,
      trip: query.trip ?? null,
      class: query.class ?? null,
      sort: query.sort ?? null,
      price_min: query.price_min ?? null,
      price_max: query.price_max ?? null,
      beds: query.beds ?? null,
      bedrooms: query.bedrooms ?? null,
      bathrooms: query.bathrooms ?? null,
      attrs: query.attrs ?? null,
      theme: query.theme ?? null,
    },
  })
}

function getCachedFlexibleHolidayListings(key: string): TListingBase[] | undefined {
  const cached = flexibleHolidayListingsCache.get(key)
  if (!cached) return undefined
  if (cached.expiresAt <= Date.now()) {
    flexibleHolidayListingsCache.delete(key)
    return undefined
  }
  return cached.value
}

function setCachedFlexibleHolidayListings(key: string, value: TListingBase[]): void {
  if (flexibleHolidayListingsCache.size >= FLEXIBLE_HOLIDAY_LISTINGS_MAX_ENTRIES) {
    const oldestKey = flexibleHolidayListingsCache.keys().next().value as string | undefined
    if (oldestKey) flexibleHolidayListingsCache.delete(oldestKey)
  }
  flexibleHolidayListingsCache.set(key, {
    value,
    expiresAt: Date.now() + FLEXIBLE_HOLIDAY_LISTINGS_TTL_MS,
  })
}

/** Next.js `searchParams` → düz nesne */
export function parseSearchParamsFromUrl(
  sp: Record<string, string | string[] | undefined>,
): SearchQuery {
  const g = (k: string) => {
    const v = sp[k]
    if (Array.isArray(v)) return v[0]
    return v
  }
  return {
    location: g('location'),
    checkin: g('checkin'),
    checkout: g('checkout'),
    guests: g('guests'),
    page: g('page'),
    drop_off: g('drop_off'),
    from: g('from'),
    to: g('to'),
    trip: g('trip'),
    class: g('class'),
    sort: g('sort'),
    price_min: g('price_min'),
    price_max: g('price_max'),
    beds: g('beds'),
    bedrooms: g('bedrooms'),
    bathrooms: g('bathrooms'),
    attrs: g('attrs'),
    theme: g('theme'),
  }
}

function parseMetaInt(v: string | null | undefined): number | undefined {
  if (v == null || String(v).trim() === '') return undefined
  const n = parseInt(String(v), 10)
  return Number.isFinite(n) ? n : undefined
}

function parseFirstChargeAmount(raw: string | null | undefined): number | undefined {
  if (raw == null || String(raw).trim() === '') return undefined
  const n = parseFloat(String(raw).replace(/\s/g, '').replace(',', '.'))
  return Number.isFinite(n) && n > 0 ? n : undefined
}

export function mapPublicListingItemToListingBase(item: PublicListingItem): TListingBase {
  const stayBookingRules = parseStayBookingRulesFromPublicItem(item)
  const cur = (item.currency_code?.trim() || 'TRY').toUpperCase()
  const raw = item.price_from
  const num =
    raw != null && String(raw).trim() !== ''
      ? parseFloat(String(raw).replace(/\s/g, '').replace(/,/g, '.'))
      : NaN
  const priceAmount = Number.isFinite(num) ? num : undefined
  const price =
    priceAmount != null ? formatMoneyIntl(priceAmount, cur) : undefined

  const mealPlanSummary = item.meal_plan_summary ?? undefined

  let map: TListingBase['map'] = undefined
  const rawLat = item.map_lat
  const rawLng = item.map_lng
  if (rawLat != null && rawLng != null && String(rawLat).trim() !== '' && String(rawLng).trim() !== '') {
    const lat = parseFloat(String(rawLat).replace(',', '.'))
    const lng = parseFloat(String(rawLng).replace(',', '.'))
    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      map = { lat, lng }
    }
  }

  const cat = item.category_code ?? ''
  const vertical = normalizeCatalogVertical(item.listing_vertical ?? cat)
  const isHoliday = cat === 'holiday_home' || vertical === 'holiday_home'

  const typeLine =
    isHoliday && item.property_type?.trim()
      ? item.property_type.trim()
      : isHoliday
        ? categoryLabelTr('holiday_home')
        : categoryLabelTr(cat || 'hotel')

  const rawRev = item.review_avg
  let reviewStart: number | undefined
  if (rawRev != null && String(rawRev).trim() !== '') {
    const n =
      typeof rawRev === 'number' ? rawRev : parseFloat(String(rawRev).replace(',', '.'))
    reviewStart = Number.isFinite(n) ? n : undefined
  }

  const firstChargeAmount = parseFirstChargeAmount(item.first_charge_amount ?? undefined)

  const base: TListingBase = {
    id: item.id,
    handle: item.slug,
    title: item.title,
    listingCategory: typeLine,
    listingVertical: vertical,
    address: item.location ?? undefined,
    city: item.location ?? undefined,
    price,
    priceAmount,
    priceCurrency: cur,
    reviewStart,
    reviewCount: item.review_count ?? 0,
    featuredImage: item.featured_image_url ?? item.thumbnail_url ?? undefined,
    isNew: item.is_new ?? false,
    discountPercent: item.discount_percent ?? undefined,
    isCampaign: item.is_campaign ?? false,
    createdAt: item.created_at ?? '',
    like: false,
    saleOff: item.discount_percent != null ? `%${item.discount_percent}` : null,
    isAds: null,
    mealPlanSummary,
    ...(map != null ? { map } : {}),
    ...(stayBookingRules != null ? { stayBookingRules } : {}),
    ...(firstChargeAmount != null ? { firstChargeAmount } : {}),
  }

  if (!isHoliday) {
    const hotelTypeTrim = item.hotel_type_code?.trim()
    return {
      ...base,
      maxGuests: parseMetaInt(item.max_guests ?? undefined),
      bedrooms: parseMetaInt(item.room_count ?? undefined),
      bathrooms: parseMetaInt(item.bath_count ?? undefined),
      beds: parseMetaInt(item.room_count ?? undefined),
      ...(vertical === 'hotel' && hotelTypeTrim ? { hotelTypeCode: hotelTypeTrim } : {}),
    } as TListingBase
  }

  const themeCsv = item.theme_codes?.trim() ?? ''
  const themeCodes = themeCsv
    ? themeCsv
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
    : []

  const cpt = item.cancellation_policy_text?.trim()

  return {
    ...base,
    listingVertical: 'holiday_home',
    maxGuests: parseMetaInt(item.max_guests ?? undefined),
    bedrooms: parseMetaInt(item.room_count ?? undefined),
    bathrooms: parseMetaInt(item.bath_count ?? undefined),
    themeCodes: themeCodes.length ? themeCodes : undefined,
    ...(cpt ? { cancellationPolicyText: cpt } : {}),
  } as TListingBase
}

function regionHandleToNeedle(handle: string): string {
  return handle.replace(/-/g, ' ').toLowerCase()
}

function filterMockByRegion(list: TListingBase[], regionHandle?: string): TListingBase[] {
  if (!regionHandle || regionHandle === 'all') return list
  const needle = regionHandleToNeedle(regionHandle)
  const filtered = list.filter(
    (l) =>
      l.city?.toLowerCase().includes(needle) ||
      l.handle?.toLowerCase().includes(needle) ||
      l.title?.toLowerCase().includes(needle) ||
      l.address?.toLowerCase().includes(needle),
  )
  return filtered.length > 0 ? filtered : list
}

function listingNumericPrice(l: TListingBase): number {
  if (l.priceAmount != null && Number.isFinite(l.priceAmount)) return l.priceAmount
  const raw = l.price?.replace(/[^\d.,]/g, '').replace(',', '.') ?? ''
  const n = parseFloat(raw)
  return Number.isFinite(n) ? n : 0
}

/** Tatil evleri URL filtreleri — API yanıtı sonrası istemci tarafı sıralama/fiyat (backend genişleyince kaldırılabilir) */
export function applyHolidayListingQueryFilters(
  listings: TListingBase[],
  query: SearchQuery,
): TListingBase[] {
  let out = listings.slice()
  const min = query.price_min?.trim() ? parseFloat(query.price_min) : NaN
  const max = query.price_max?.trim() ? parseFloat(query.price_max) : NaN
  if (Number.isFinite(min)) out = out.filter((l) => listingNumericPrice(l) >= min)
  if (Number.isFinite(max)) out = out.filter((l) => listingNumericPrice(l) <= max)

  const nb = query.beds?.trim() ? parseInt(query.beds, 10) : NaN
  if (Number.isFinite(nb) && nb > 0) {
    out = out.filter((l) => {
      const v = (l as { beds?: number }).beds
      return v != null && v >= nb
    })
  }
  const nbr = query.bedrooms?.trim() ? parseInt(query.bedrooms, 10) : NaN
  if (Number.isFinite(nbr) && nbr > 0) {
    out = out.filter((l) => {
      const v = (l as { bedrooms?: number }).bedrooms
      return v != null && v >= nbr
    })
  }
  const nba = query.bathrooms?.trim() ? parseInt(query.bathrooms, 10) : NaN
  if (Number.isFinite(nba) && nba > 0) {
    out = out.filter((l) => {
      const v = (l as { bathrooms?: number }).bathrooms
      return v != null && v >= nba
    })
  }

  const attrs =
    query.attrs
      ?.split(',')
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean) ?? []
  if (attrs.length > 0) {
    out = out.filter((l) => {
      const row = l as { pool?: boolean; beachFront?: boolean }
      return attrs.every((k) => {
        if (k === 'pool') return row.pool === true
        if (k === 'beach') return row.beachFront === true
        return true
      })
    })
  }

  const themeNeedle =
    query.theme
      ?.split(',')
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean) ?? []
  if (themeNeedle.length > 0) {
    out = out.filter((l) => {
      const codes = (l as { themeCodes?: string[] }).themeCodes ?? []
      const set = new Set(codes.map((c) => c.toLowerCase()))
      return themeNeedle.every((c) => set.has(c))
    })
  }

  const sort = query.sort?.trim()
  if (sort === 'price_asc') {
    out.sort((a, b) => listingNumericPrice(a) - listingNumericPrice(b))
  } else if (sort === 'price_desc') {
    out.sort((a, b) => listingNumericPrice(b) - listingNumericPrice(a))
  }
  return out
}

function filterMockByLocationQuery(list: TListingBase[], loc?: string): TListingBase[] {
  if (!loc?.trim()) return list
  const q = loc.trim().toLowerCase()
  const filtered = list.filter(
    (l) =>
      l.city?.toLowerCase().includes(q) ||
      l.address?.toLowerCase().includes(q) ||
      l.title.toLowerCase().includes(q),
  )
  return filtered.length > 0 ? filtered : list
}

export interface FetchCategoryListingsOpts {
  /** URL segmenti: `antalya` gibi — mock’ta ve API’de konum olarak kullanılır */
  regionHandle?: string
}

/** Tatil evleri: fiyat, tema, oda vb. sıkı filtreleri kaldırarak “esnek” havuz sorgusu */
export function relaxedHolidaySearchQuery(query: SearchQuery): SearchQuery {
  return {
    ...query,
    theme: undefined,
    price_min: undefined,
    price_max: undefined,
    beds: undefined,
    bedrooms: undefined,
    bathrooms: undefined,
    attrs: undefined,
    sort: undefined,
  }
}

/**
 * Ana ızgarada gösterilen ilanların dışında, gevşetilmiş filtrelerle ek öneriler (tatil evleri).
 * API’den daha geniş limit ile çekilir; ana listedeki id’ler hariç tutulur.
 */
export async function fetchFlexibleHolidayListings(
  excludeIds: Set<string>,
  query: SearchQuery,
  opts: FetchCategoryListingsOpts,
  locale: string,
  maxItems = 8,
): Promise<TListingBase[]> {
  const cacheKey = buildFlexibleHolidayListingsCacheKey(query, opts, locale, maxItems)
  const cached = getCachedFlexibleHolidayListings(cacheKey)
  if (cached) return cached.filter((l) => !excludeIds.has(l.id)).slice(0, maxItems)

  const relaxed = relaxedHolidaySearchQuery(query)
  const region = opts.regionHandle
  const regionAsLocation =
    region && region !== 'all' ? region.replace(/-/g, ' ') : undefined
  const apiLocation = query.location?.trim() || regionAsLocation || undefined

  const apiResult = await searchPublicListings({
    categoryCode: 'holiday_home',
    location: apiLocation,
    checkin: relaxed.checkin,
    checkout: relaxed.checkout,
    guests: relaxed.guests ? parseInt(String(relaxed.guests), 10) : undefined,
    page: 1,
    perPage: 36,
    locale: locale || 'tr',
    from: relaxed.from,
    to: relaxed.to,
    drop_off: relaxed.drop_off,
  })

  if (apiResult) {
    let rows = apiResult.listings.map(mapPublicListingItemToListingBase)
    rows = applyHolidayListingQueryFilters(rows, relaxed)
    setCachedFlexibleHolidayListings(cacheKey, rows)
    return rows.filter((l) => !excludeIds.has(l.id)).slice(0, maxItems)
  }

  const loader = MOCK_LOADERS.holiday_home
  let mock = await loader()
  mock = filterMockByRegion(mock, region)
  mock = filterMockByLocationQuery(mock, query.location)
  mock = applyHolidayListingQueryFilters(mock, relaxed)
  setCachedFlexibleHolidayListings(cacheKey, mock)
  return mock.filter((l) => !excludeIds.has(l.id)).slice(0, maxItems)
}

/**
 * Kategori slug ve URL search params'ından ilan listesi döner.
 */
export async function fetchCategoryListings(
  categorySlug: string,
  query: SearchQuery = {},
  opts: FetchCategoryListingsOpts = {},
  locale = 'tr',
): Promise<ListingsResult> {
  const ttlMs = resolveCategoryListingsTtlMs(categorySlug)
  const cacheKey = buildCategoryListingsCacheKey(categorySlug, query, opts, locale)
  const cached = getCachedCategoryListings(cacheKey)
  if (cached) return cached

  const categoryCode = SLUG_TO_CODE[categorySlug]
  const page = Math.max(1, parseInt(query.page ?? '1', 10) || 1)
  const perPage = 12

  const region = opts.regionHandle
  const regionAsLocation =
    region && region !== 'all' ? region.replace(/-/g, ' ') : undefined
  const apiLocation =
    query.location?.trim() || regionAsLocation || undefined

  const apiResult = await searchPublicListings({
    categoryCode,
    location: apiLocation,
    checkin: query.checkin,
    checkout: query.checkout,
    guests: query.guests ? parseInt(query.guests, 10) : undefined,
    page,
    perPage,
    locale: locale || 'tr',
    from: query.from,
    to: query.to,
    drop_off: query.drop_off,
    theme: query.theme,
  })

  if (apiResult) {
    let rows = apiResult.listings.map(mapPublicListingItemToListingBase)
    if (categoryCode === 'holiday_home') {
      rows = applyHolidayListingQueryFilters(rows, query)
    }
    const result: ListingsResult = {
      listings: rows,
      total: apiResult.total,
      page,
      perPage: apiResult.per_page,
      fromApi: true,
    }
    setCachedCategoryListings(cacheKey, result, ttlMs)
    return result
  }

  const loader = MOCK_LOADERS[categoryCode ?? ''] ?? MOCK_LOADERS['hotel']
  let mock = await loader()
  mock = filterMockByRegion(mock, region)
  mock = filterMockByLocationQuery(mock, query.location)
  if (categoryCode === 'holiday_home') {
    mock = applyHolidayListingQueryFilters(mock, query)
  }

  const result: ListingsResult = {
    listings: mock,
    total: mock.length,
    page: 1,
    perPage: mock.length,
    fromApi: false,
  }
  setCachedCategoryListings(cacheKey, result, ttlMs)
  return result
}
