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
import { searchPublicListings, fetchPublicHolidayHomePropertyTypes, type PublicListingItem } from '@/lib/travel-api'
import { categoryLabelTr } from '@/lib/catalog-category-ui'
import { normalizeCatalogVertical } from '@/lib/catalog-listing-vertical'
import { formatMoneyIntl } from '@/lib/parse-listing-price'
import type { TListingBase } from '@/types/listing-types'
import { parseStayBookingRulesFromPublicItem } from '@/lib/stay-booking-rules'

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
  const isHoliday = cat === 'holiday_home' || vertical === 'holiday_home'

  const loc = (opts?.locale ?? 'tr').trim().toLowerCase() || 'tr'
  const ptItems = opts?.holidayPropertyTypeItems

  if (holidayHomeRulePriceRangeEnabled() && isHoliday) {
    const rMin = parsePubListingRuleNightly(item.price_rules_nightly_min)
    const rMax = parsePubListingRuleNightly(item.price_rules_nightly_max)
    if (rMin != null && rMax != null && rMax > rMin) {
      priceAmount = rMin
      priceAmountMax = rMax
      price = formatMoneyIntl(rMin, cur)
    }
  }

  const typeLine =
    isHoliday && item.property_type?.trim()
      ? displayHolidayPropertyTypeLine(item.property_type, ptItems, loc)
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
  const cleaningFeeAmount = parseFirstChargeAmount(item.cleaning_fee_amount ?? undefined)

  const coverRaw = normalizeListingCoverUrl(item.featured_image_url ?? item.thumbnail_url)
  let imgs = normalizePublicListingGallery(
    Array.isArray(item.gallery_urls) ? item.gallery_urls : undefined,
  )
  if (coverRaw !== '' && !imgs.includes(coverRaw)) imgs.unshift(coverRaw)
  const galleryImgs = imgs.length > 0 ? imgs : undefined

  const discountPct = coercePositiveDiscountPercent(item.discount_percent)

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

  if (!isHoliday) {
    const hotelTypeTrim = item.hotel_type_code?.trim()
    const hotelStars = parseMetaFloat(item.hotel_star_rating ?? undefined)
    const tourDurationDays = parseMetaInt(item.tour_duration_days ?? undefined)
    const tourMaxPeople = parseMetaInt(item.tour_max_people ?? undefined)
    const tourTravelType = item.tour_travel_type?.trim()
    const tourAccommodationType = item.tour_accommodation_type?.trim()
    const tourLanguages = splitCsvText(item.tour_languages)
    return {
      ...base,
      maxGuests: parseMetaInt(item.max_guests ?? undefined),
      bedrooms: parseMetaInt(metaRoomCountForDisplay(item)),
      bathrooms: parseMetaInt(item.bath_count ?? undefined),
      beds: parseMetaInt(metaRoomCountForDisplay(item)),
      ...(vertical === 'hotel' && hotelTypeTrim ? { hotelTypeCode: hotelTypeTrim } : {}),
      ...(vertical === 'hotel' && hotelStars != null ? { stars: hotelStars } : {}),
      ...(vertical === 'tour' && tourDurationDays != null ? { durationDays: tourDurationDays } : {}),
      ...(vertical === 'tour' && tourMaxPeople != null ? { maxGroupSize: tourMaxPeople } : {}),
      ...(vertical === 'tour' && tourTravelType ? { travelType: tourTravelType } : {}),
      ...(vertical === 'tour' && tourAccommodationType ? { accommodationType: tourAccommodationType } : {}),
      ...(vertical === 'tour' && tourLanguages ? { languages: tourLanguages } : {}),
    } as TListingBase
  }

  const themeCodes = parseHolidayThemeCodes(item.theme_codes ?? undefined)

  const cpt = item.cancellation_policy_text?.trim()

  return {
    ...base,
    listingVertical: 'holiday_home',
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

export interface FetchCategoryListingsOpts {
  /** URL segmenti: `antalya` gibi — API sorgusunda kullanılır */
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
  const relaxed = relaxedHolidaySearchQuery(query)
  const region = opts.regionHandle
  const regionAsLocation =
    region && region !== 'all' ? region.replace(/-/g, ' ') : undefined
  const apiLocation = query.location?.trim() || regionAsLocation || undefined

  const [apiResult, ptItems] = await Promise.all([
    searchPublicListings(
      {
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
      },
      { cache: 'no-store' },
    ),
    fetchPublicHolidayHomePropertyTypes({ cache: 'no-store' }).catch(
      (): HolidayHomePropertyTypeItem[] => [],
    ),
  ])

  const mapOpts: MapPublicListingItemOpts = {
    locale: locale || 'tr',
    holidayPropertyTypeItems: ptItems.length > 0 ? ptItems : undefined,
  }

  if (apiResult) {
    let rows = apiResult.listings.map((it) => mapPublicListingItemToListingBase(it, mapOpts))
    rows = applyHolidayListingQueryFilters(rows, relaxed)
    return rows.filter((l) => !excludeIds.has(l.id)).slice(0, maxItems)
  }

  return []
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
  const perPage = 12

  const region = opts.regionHandle
  const regionAsLocation =
    region && region !== 'all' ? region.replace(/-/g, ' ') : undefined
  const apiLocation =
    query.location?.trim() || regionAsLocation || undefined

  const apiResult = await searchPublicListings(
    {
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
      sort: query.sort?.trim() || undefined,
      attrs: query.attrs?.trim() || undefined,
      priceMin: query.price_min?.trim() || undefined,
      priceMax: query.price_max?.trim() || undefined,
      hotelType: query.hotel_type?.trim() || undefined,
      hotelTheme: query.hotel_theme?.trim() || undefined,
      hotelAccommodation: query.hotel_accommodation?.trim() || undefined,
      hotelStars: query.hotel_stars?.trim() || undefined,
      tourTravelType: query.tour_travel_type?.trim() || undefined,
      tourAccommodation: query.tour_accommodation?.trim() || undefined,
      tourDuration: query.tour_duration?.trim() || undefined,
    },
    { cache: 'no-store' },
  )

  if (apiResult) {
    let ptItems: HolidayHomePropertyTypeItem[] | undefined
    if (categoryCode === 'holiday_home') {
      ptItems = await fetchPublicHolidayHomePropertyTypes({ cache: 'no-store' }).catch(
        (): HolidayHomePropertyTypeItem[] => [],
      )
    }
    const mapOpts: MapPublicListingItemOpts = {
      locale: locale || 'tr',
      holidayPropertyTypeItems: ptItems?.length ? ptItems : undefined,
    }
    let rows = apiResult.listings.map((it) => mapPublicListingItemToListingBase(it, mapOpts))
    if (categoryCode === 'holiday_home') {
      rows = applyHolidayListingQueryFilters(rows, query)
    }
    return {
      listings: rows,
      total: apiResult.total,
      page,
      perPage: apiResult.per_page,
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
