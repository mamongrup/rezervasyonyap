/**
 * Merkezi ilan arama yardımcısı.
 *
 * Backend API (`searchPublicListings`) yanıt vermezse boş liste döner — yerel demo/mock yok.
 *
 * Tüm kategori sayfaları bu helper'ı kullanmalı.
 */

import { preferListingGalleryFullAsset } from '@/lib/listing-gallery-display-url'
import { storageKeyToPublicUrl } from '@/lib/listing-gallery-hero-order'
import { holidayHomeRulePriceRangeEnabled } from '@/lib/holiday-home-rule-price-range'
import { parseHolidayThemeCodes } from '@/lib/holiday-theme-codes'
import {
  displayHolidayPropertyTypeLine,
  type HolidayHomePropertyTypeItem,
} from '@/lib/holiday-property-type-options'
import {
  HOLIDAY_TYPE_HANDLE_MAP,
  isStayRentalCategory,
  stayRentalPropertyTypeFromHandle,
  type StayRentalCategoryCode,
} from '@/lib/stay-rental-categories'
import { displayYachtPropertyTypeLine, type YachtCharterPropertyTypeItem } from '@/lib/yacht-property-type-options'
import {
  searchPublicListings,
  fetchPublicHolidayHomePropertyTypes,
  fetchPublicYachtCharterPropertyTypes,
  type PublicListingItem,
} from '@/lib/travel-api'
import { categoryLabelTr } from '@/lib/catalog-category-ui'
import { normalizeCatalogVertical } from '@/lib/catalog-listing-vertical'
import { formatMoneyIntl } from '@/lib/parse-listing-price'
import type { TListingBase } from '@/types/listing-types'
import { normalizeStayLocationPin } from '@/lib/stay-location-display'
import { parseStayBookingRulesFromPublicItem } from '@/lib/stay-booking-rules'
import { normalizeStayRentalAttrsParam } from '@/lib/stay-rental-filter-attrs'
import { isTourSubcategorySlug, tourSubcategoryRoute } from '@/lib/tour-subcategory-routes'

export { HOLIDAY_TYPE_HANDLE_MAP, YACHT_TYPE_HANDLE_MAP } from '@/lib/stay-rental-categories'

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
  'plaj-sezlong': 'beach_lounger',
  'sinema-biletleri': 'cinema_ticket',
  etkinlikler:    'event',
  'restoran-rezervasyon': 'restaurant_table',
}

export interface SearchQuery {
  /** Metin araması — ilan başlığı / slug (katalog `q` parametresi) */
  q?: string
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
  /** Otel filtreleri */
  hotel_type?: string
  hotel_theme?: string
  hotel_accommodation?: string
  hotel_stars?: string
  /** Tur filtreleri */
  tour_travel_type?: string
  tour_accommodation?: string
  tour_duration?: string
}

export interface ListingsResult {
  listings: TListingBase[]
  total: number
  page: number
  perPage: number
  fromApi: boolean
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
    q: g('q'),
    location: g('location'),
    checkin: g('checkin') ?? g('date'),
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
    hotel_type: g('hotel_type'),
    hotel_theme: g('hotel_theme'),
    hotel_accommodation: g('hotel_accommodation'),
    hotel_stars: g('hotel_stars'),
    tour_travel_type: g('tour_travel_type'),
    tour_accommodation: g('tour_accommodation'),
    tour_duration: g('tour_duration'),
  }
}

function parseMetaInt(v: string | null | undefined): number | undefined {
  if (v == null || String(v).trim() === '') return undefined
  const n = parseInt(String(v), 10)
  return Number.isFinite(n) ? n : undefined
}

function parseMetaFloat(v: string | null | undefined): number | undefined {
  if (v == null || String(v).trim() === '') return undefined
  const n = parseFloat(String(v).replace(',', '.'))
  return Number.isFinite(n) ? n : undefined
}

function splitCsvText(v: string | null | undefined): string[] | undefined {
  const arr = String(v ?? '')
    .split(/[,\n]/)
    .map((x) => x.trim())
    .filter(Boolean)
  return arr.length > 0 ? arr : undefined
}

/** «Oda» kutusu: önce `room_count`, boşsa `bed_count` (eski / eksik meta uyumu). */
function metaRoomCountForDisplay(item: PublicListingItem): string | undefined {
  const rc = item.room_count != null ? String(item.room_count).trim() : ''
  const bc = item.bed_count != null ? String(item.bed_count).trim() : ''
  const pick = rc || bc
  return pick !== '' ? pick : undefined
}

function parseFirstChargeAmount(raw: string | null | undefined): number | undefined {
  if (raw == null || String(raw).trim() === '') return undefined
  const n = parseFloat(String(raw).replace(/\s/g, '').replace(',', '.'))
  return Number.isFinite(n) && n > 0 ? n : undefined
}

function parsePubListingRuleNightly(raw: string | null | undefined): number | undefined {
  if (raw == null || String(raw).trim() === '') return undefined
  const n = parseFloat(String(raw).replace(/\s/g, '').replace(/,/g, '.'))
  return Number.isFinite(n) && n > 0 ? n : undefined
}

function coercePositiveDiscountPercent(v: unknown): number | undefined {
  if (v == null) return undefined
  const n = typeof v === 'number' ? v : parseFloat(String(v).replace(/\s/g, '').replace(',', '.'))
  return Number.isFinite(n) && n > 0 ? n : undefined
}

function normalizeListingCoverUrl(raw: string | null | undefined): string {
  const url = storageKeyToPublicUrl(String(raw ?? '').trim())
  return url ? preferListingGalleryFullAsset(url) : ''
}

function normalizePublicListingGallery(paths: string[] | null | undefined): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const p of paths ?? []) {
    const u = normalizeListingCoverUrl(p)
    if (u === '' || seen.has(u)) continue
    seen.add(u)
    out.push(u)
  }
  return out
}

function listingCreatedWithinDays(createdAt: string | undefined | null, days: number): boolean {
  const s = createdAt?.trim()
  if (!s) return false
  const t = Date.parse(s)
  if (Number.isNaN(t)) return false
  return (Date.now() - t) / 86_400_000 <= days
}

export type MapPublicListingItemOpts = {
  locale?: string
  holidayPropertyTypeItems?: HolidayHomePropertyTypeItem[]
  yachtPropertyTypeItems?: YachtCharterPropertyTypeItem[]
}

export function mapPublicListingItemToListingBase(
  item: PublicListingItem,
  opts?: MapPublicListingItemOpts,
): TListingBase {
  const stayBookingRules = parseStayBookingRulesFromPublicItem(item)
  const cur = (item.currency_code?.trim() || 'TRY').toUpperCase()
  const raw = item.price_from
  const num =
    raw != null && String(raw).trim() !== ''
      ? parseFloat(String(raw).replace(/\s/g, '').replace(/,/g, '.'))
      : NaN
  let priceAmount = Number.isFinite(num) ? num : undefined
  let priceAmountMax: number | undefined
  let price =
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
  const isStayRental =
    cat === 'holiday_home' ||
    cat === 'yacht_charter' ||
    vertical === 'holiday_home' ||
    vertical === 'yacht_charter'

  const loc = (opts?.locale ?? 'tr').trim().toLowerCase() || 'tr'
  const ptItems =
    cat === 'yacht_charter' || vertical === 'yacht_charter'
      ? opts?.yachtPropertyTypeItems
      : opts?.holidayPropertyTypeItems

  if (holidayHomeRulePriceRangeEnabled() && isStayRental) {
    const rMin = parsePubListingRuleNightly(item.price_rules_nightly_min)
    const rMax = parsePubListingRuleNightly(item.price_rules_nightly_max)
    if (rMin != null && rMax != null && rMax > rMin) {
      priceAmount = rMin
      priceAmountMax = rMax
      price = formatMoneyIntl(rMin, cur)
    }
  }

  const displayPropertyTypeLine =
    cat === 'yacht_charter' || vertical === 'yacht_charter'
      ? displayYachtPropertyTypeLine
      : displayHolidayPropertyTypeLine

  const typeLine =
    isStayRental && item.property_type?.trim()
      ? displayPropertyTypeLine(item.property_type, ptItems, loc)
      : isStayRental
        ? categoryLabelTr(cat === 'yacht_charter' || vertical === 'yacht_charter' ? 'yacht_charter' : 'holiday_home')
        : categoryLabelTr(cat || 'hotel')

  const rawRev = item.review_avg
  let reviewStart: number | undefined
  if (rawRev != null && String(rawRev).trim() !== '') {
    const n =
      typeof rawRev === 'number' ? rawRev : parseFloat(String(rawRev).replace(',', '.'))
    reviewStart = Number.isFinite(n) ? n : undefined
  }

  const firstChargeAmount = parseFirstChargeAmount(item.first_charge_amount ?? undefined)
  const cleaningFeeAmount = parseFirstChargeAmount(item.cleaning_fee_amount ?? undefined)

  const coverRaw = normalizeListingCoverUrl(item.featured_image_url ?? item.thumbnail_url)
  let imgs = normalizePublicListingGallery(
    Array.isArray(item.gallery_urls) ? item.gallery_urls : undefined,
  )
  if (coverRaw !== '' && !imgs.includes(coverRaw)) imgs.unshift(coverRaw)
  const galleryImgs = imgs.length > 0 ? imgs : undefined

  const discountPct = coercePositiveDiscountPercent(item.discount_percent)

  const locationPin = isStayRental
    ? normalizeStayLocationPin(item.location ?? '') || undefined
    : (item.location ?? undefined)

  const base: TListingBase = {
    id: item.id,
    handle: item.slug,
    title: item.title,
    listingCategory: typeLine,
    listingVertical: vertical,
    address: locationPin,
    city: locationPin,
    price,
    priceAmount,
    ...(priceAmountMax != null ? { priceAmountMax } : {}),
    priceCurrency: cur,
    reviewStart,
    reviewCount: item.review_count ?? 0,
    featuredImage: imgs[0] ?? (coverRaw !== '' ? coverRaw : undefined),
    ...(galleryImgs ? { galleryImgs } : {}),
    isNew: Boolean(item.is_new) || listingCreatedWithinDays(item.created_at, 30),
    discountPercent: discountPct,
    isCampaign: item.is_campaign ?? false,
    createdAt: item.created_at?.trim() ? item.created_at.trim() : '',
    like: false,
    saleOff: discountPct != null ? `%${discountPct}` : null,
    ...(item.instant_book === true ? { instantBook: true } : {}),
    isAds: null,
    mealPlanSummary,
    ...(map != null ? { map } : {}),
    ...(stayBookingRules != null ? { stayBookingRules } : {}),
    ...(firstChargeAmount != null ? { firstChargeAmount } : {}),
    ...(cleaningFeeAmount != null ? { cleaningFeeAmount } : {}),
  }

  if (!isStayRental) {
    const hotelTypeTrim = item.hotel_type_code?.trim()
    const hotelStars = parseMetaFloat(item.hotel_star_rating ?? undefined)
    const tourDurationDays = parseMetaInt(item.tour_duration_days ?? undefined)
    const tourMaxPeople = parseMetaInt(item.tour_max_people ?? undefined)
    const tourNights = parseMetaInt(item.tour_nights ?? undefined)
    const tourTravelType = item.tour_travel_type?.trim()
    const tourTransportType = item.tour_transport_type?.trim()
    const tourMealType = item.tour_meal_type?.trim()
    const tourAccommodationType = item.tour_accommodation_type?.trim()
    const tourLanguages = splitCsvText(item.tour_languages)
    const tourVisaRaw = item.tour_visa_required?.trim().toLowerCase()
    const tourVisaRequired =
      tourVisaRaw === 'true' ? true : tourVisaRaw === 'false' ? false : undefined
    const tourDeparturePlace = item.tour_departure_place?.trim()
    const resolvedDurationDays =
      tourDurationDays ?? (tourNights != null && tourNights > 0 ? tourNights + 1 : undefined)

    if (vertical === 'flight' || vertical === 'ferry') {
      const routeRaw = (item.location ?? item.title ?? '').trim()
      const routeSep = routeRaw.includes('→')
        ? '→'
        : routeRaw.includes('->')
          ? '->'
          : routeRaw.includes('—')
            ? '—'
            : routeRaw.includes('-')
              ? '-'
              : null
      let departure: string | undefined
      let arrival: string | undefined
      if (routeSep) {
        const parts = routeRaw.split(routeSep).map((s) => s.trim())
        departure = parts[0] || undefined
        arrival = parts[1] || undefined
      }
      if (vertical === 'ferry') {
        return {
          ...base,
          ...(departure ? { fromPort: departure } : {}),
          ...(arrival ? { toPort: arrival } : {}),
        } as TListingBase
      }
      return {
        ...base,
        ...(departure ? { departure } : {}),
        ...(arrival ? { arrival } : {}),
      } as TListingBase
    }

    return {
      ...base,
      maxGuests: parseMetaInt(item.max_guests ?? undefined),
      bedrooms: parseMetaInt(metaRoomCountForDisplay(item)),
      bathrooms: parseMetaInt(item.bath_count ?? undefined),
      beds: parseMetaInt(metaRoomCountForDisplay(item)),
      ...(vertical === 'hotel' && hotelTypeTrim ? { hotelTypeCode: hotelTypeTrim } : {}),
      ...(vertical === 'hotel' && hotelStars != null ? { stars: hotelStars } : {}),
      ...(vertical === 'tour' && resolvedDurationDays != null ? { durationDays: resolvedDurationDays } : {}),
      ...(vertical === 'tour' && tourNights != null ? { durationNights: tourNights } : {}),
      ...(vertical === 'tour' && tourMaxPeople != null ? { maxGroupSize: tourMaxPeople } : {}),
      ...(vertical === 'tour' && tourTravelType ? { travelType: tourTravelType } : {}),
      ...(vertical === 'tour' && tourTransportType ? { transportType: tourTransportType } : {}),
      ...(vertical === 'tour' && tourMealType ? { mealType: tourMealType } : {}),
      ...(vertical === 'tour' && tourVisaRequired != null ? { visaRequired: tourVisaRequired } : {}),
      ...(vertical === 'tour' && tourDeparturePlace ? { departureCity: tourDeparturePlace } : {}),
      ...(vertical === 'tour' && tourAccommodationType ? { accommodationType: tourAccommodationType } : {}),
      ...(vertical === 'tour' && tourLanguages ? { languages: tourLanguages } : {}),
    } as TListingBase
  }

  const themeCodes = parseHolidayThemeCodes(item.theme_codes ?? undefined)

  const cpt = item.cancellation_policy_text?.trim()

  const resolvedVertical: TListingBase['listingVertical'] =
    cat === 'yacht_charter' || vertical === 'yacht_charter' ? 'yacht_charter' : 'holiday_home'

  return {
    ...base,
    listingVertical: resolvedVertical,
    maxGuests: parseMetaInt(item.max_guests ?? undefined),
    bedrooms: parseMetaInt(metaRoomCountForDisplay(item)),
    bathrooms: parseMetaInt(item.bath_count ?? undefined),
    themeCodes: themeCodes.length ? themeCodes : undefined,
    ...(cpt ? { cancellationPolicyText: cpt } : {}),
  } as TListingBase
}

function listingNumericPrice(l: TListingBase): number {
  if (l.priceAmount != null && Number.isFinite(l.priceAmount)) return l.priceAmount
  const raw = l.price?.replace(/[^\d.,]/g, '').replace(',', '.') ?? ''
  const n = parseFloat(raw)
  return Number.isFinite(n) ? n : 0
}

/** Konaklama kiralama URL filtreleri — API yanıtı sonrası istemci tarafı sıralama/fiyat */
export function applyStayRentalListingQueryFilters(
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

  // `attrs` — API `listing_attributes` üzerinden filtreler (`searchPublicListings`); istemci tekrar filtrelemez.

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

/** @deprecated `applyStayRentalListingQueryFilters` */
export const applyHolidayListingQueryFilters = applyStayRentalListingQueryFilters

/** @deprecated `relaxedStayRentalSearchQuery` */
export const relaxedHolidaySearchQuery = relaxedStayRentalSearchQuery

export interface FetchCategoryListingsOpts {
  /** URL segmenti: `antalya` gibi — API sorgusunda kullanılır */
  regionHandle?: string
  /** Varsayılan kategori limiti yerine (admin arama vb.) — API üst sınırı 100 */
  perPage?: number
}

/** Konaklama kiralama: fiyat, tema, oda vb. sıkı filtreleri kaldırarak “esnek” havuz sorgusu */
export function relaxedStayRentalSearchQuery(query: SearchQuery): SearchQuery {
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
export async function fetchFlexibleStayRentalListings(
  categoryCode: StayRentalCategoryCode,
  excludeIds: Set<string>,
  query: SearchQuery,
  opts: FetchCategoryListingsOpts,
  locale: string,
  maxItems = 8,
): Promise<TListingBase[]> {
  const relaxed = relaxedStayRentalSearchQuery(query)
  const region = opts.regionHandle
  const regionPropertyType = stayRentalPropertyTypeFromHandle(categoryCode, region)
  const regionAsLocation =
    region && region !== 'all' && !regionPropertyType ? region.replace(/-/g, ' ') : undefined
  const apiLocation = query.location?.trim() || regionAsLocation || undefined

  const [apiResult, holidayPtItems, yachtPtItems] = await Promise.all([
    searchPublicListings(
      {
        categoryCode,
        location: apiLocation,
        propertyType: regionPropertyType || undefined,
        checkin: relaxed.checkin,
        checkout: relaxed.checkout,
        guests: relaxed.guests ? parseInt(String(relaxed.guests), 10) : undefined,
        page: 1,
        perPage: 36,
        locale: locale || 'tr',
        from: relaxed.from,
        to: relaxed.to,
        drop_off: relaxed.drop_off,
      },
      { cache: 'no-store' },
    ),
    categoryCode === 'holiday_home'
      ? fetchPublicHolidayHomePropertyTypes({ cache: 'no-store' }).catch(
          (): HolidayHomePropertyTypeItem[] => [],
        )
      : Promise.resolve([] as HolidayHomePropertyTypeItem[]),
    categoryCode === 'yacht_charter'
      ? fetchPublicYachtCharterPropertyTypes({ cache: 'no-store' }).catch(
          (): YachtCharterPropertyTypeItem[] => [],
        )
      : Promise.resolve([] as YachtCharterPropertyTypeItem[]),
  ])

  const mapOpts: MapPublicListingItemOpts = {
    locale: locale || 'tr',
    holidayPropertyTypeItems: holidayPtItems.length > 0 ? holidayPtItems : undefined,
    yachtPropertyTypeItems: yachtPtItems.length > 0 ? yachtPtItems : undefined,
  }

  if (apiResult) {
    let rows = apiResult.listings.map((it) => mapPublicListingItemToListingBase(it, mapOpts))
    rows = applyStayRentalListingQueryFilters(rows, relaxed)
    return rows.filter((l) => !excludeIds.has(l.id)).slice(0, maxItems)
  }

  return []
}

/** @deprecated `fetchFlexibleStayRentalListings('holiday_home', …)` kullanın */
export async function fetchFlexibleHolidayListings(
  excludeIds: Set<string>,
  query: SearchQuery,
  opts: FetchCategoryListingsOpts,
  locale: string,
  maxItems = 8,
): Promise<TListingBase[]> {
  return fetchFlexibleStayRentalListings('holiday_home', excludeIds, query, opts, locale, maxItems)
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
  const categoryCode = SLUG_TO_CODE[categorySlug]
  const page = Math.max(1, parseInt(query.page ?? '1', 10) || 1)
  const defaultPerPage = isStayRentalCategory(categoryCode) ? 48 : 12
  const perPage = Math.min(100, Math.max(1, opts.perPage ?? defaultPerPage))

  const region = opts.regionHandle
  /** `/turlar/yurtici-turlar` gibi eski slug URL — bölge değil, tur alt kategori filtresi */
  const tourSubRoute =
    categorySlug === 'turlar' && region && region !== 'all' && isTourSubcategorySlug(region)
      ? tourSubcategoryRoute(region)
      : undefined
  const effectiveQuery: SearchQuery = tourSubRoute
    ? { ...query, ...tourSubRoute.query }
    : query

  const regionPropertyType =
    categoryCode && isStayRentalCategory(categoryCode)
      ? stayRentalPropertyTypeFromHandle(categoryCode, region)
      : undefined
  const regionAsLocation =
    !tourSubRoute &&
    region &&
    region !== 'all' &&
    !regionPropertyType
      ? region.replace(/-/g, ' ')
      : undefined
  const apiLocation =
    effectiveQuery.location?.trim() || regionAsLocation || undefined

  const apiResult = await searchPublicListings(
    {
      categoryCode,
      q: effectiveQuery.q?.trim() || undefined,
      location: apiLocation,
      propertyType: regionPropertyType || undefined,
      checkin: effectiveQuery.checkin,
      checkout: effectiveQuery.checkout,
      guests: effectiveQuery.guests ? parseInt(effectiveQuery.guests, 10) : undefined,
      page,
      perPage,
      locale: locale || 'tr',
      from: effectiveQuery.from,
      to: effectiveQuery.to,
      drop_off: effectiveQuery.drop_off,
      theme: effectiveQuery.theme,
      sort: effectiveQuery.sort?.trim() || undefined,
      attrs: normalizeStayRentalAttrsParam(effectiveQuery.attrs) || undefined,
      priceMin: effectiveQuery.price_min?.trim() || undefined,
      priceMax: effectiveQuery.price_max?.trim() || undefined,
      hotelType: effectiveQuery.hotel_type?.trim() || undefined,
      hotelTheme: effectiveQuery.hotel_theme?.trim() || undefined,
      hotelAccommodation: effectiveQuery.hotel_accommodation?.trim() || undefined,
      hotelStars: effectiveQuery.hotel_stars?.trim() || undefined,
      tourTravelType: effectiveQuery.tour_travel_type?.trim() || undefined,
      tourAccommodation: effectiveQuery.tour_accommodation?.trim() || undefined,
      tourDuration: effectiveQuery.tour_duration?.trim() || undefined,
    },
    { cache: 'no-store' },
  )

  if (apiResult) {
    let holidayPtItems: HolidayHomePropertyTypeItem[] | undefined
    let yachtPtItems: YachtCharterPropertyTypeItem[] | undefined
    if (categoryCode === 'holiday_home') {
      holidayPtItems = await fetchPublicHolidayHomePropertyTypes({ cache: 'no-store' }).catch(
        (): HolidayHomePropertyTypeItem[] => [],
      )
    } else if (categoryCode === 'yacht_charter') {
      yachtPtItems = await fetchPublicYachtCharterPropertyTypes({ cache: 'no-store' }).catch(
        (): YachtCharterPropertyTypeItem[] => [],
      )
    }
    const mapOpts: MapPublicListingItemOpts = {
      locale: locale || 'tr',
      holidayPropertyTypeItems: holidayPtItems?.length ? holidayPtItems : undefined,
      yachtPropertyTypeItems: yachtPtItems?.length ? yachtPtItems : undefined,
    }
    let rows = apiResult.listings.map((it) => mapPublicListingItemToListingBase(it, mapOpts))
    if (isStayRentalCategory(categoryCode)) {
      rows = applyStayRentalListingQueryFilters(rows, effectiveQuery)
    }
    return {
      listings: rows,
      total: apiResult.total,
      page,
      perPage: apiResult.per_page ?? perPage,
      fromApi: true,
    }
  }

  return {
    listings: [],
    total: 0,
    page,
    perPage,
    fromApi: false,
  }
}
