import avatars1 from '@/images/avatars/Image-1.png'
import { dedupeGalleryUrlsPreserveOrder, orderGalleryUrlsBySortOrder } from '@/lib/listing-gallery-hero-order'
import {
  galleryUrlsWithHolidayHeroPreview,
  parseHeroPreviewKeysFromVertical,
} from '@/lib/holiday-listing-hero-preview'
import { preferListingGalleryFullAsset } from '@/lib/listing-gallery-display-url'
import {
  extractHolidayHomePoolsFromVerticalMeta,
  hasAnyEnabledPool,
  unwrapVerticalMetaPayload,
  type HolidayHomePools,
} from '@/lib/listing-pools'
import {
  mergeHolidayHomeListingFaqs,
  parseHolidayHomeFaqListingOverlay,
  type HolidayHomeFaqTemplatePayload,
} from '@/lib/holiday-home-faq-merge'
import { parseHolidayThemeCodes } from '@/lib/holiday-theme-codes'
import { safeTrim, safeTrimOrNull } from '@/lib/safe-string'
import { mapPublicListingItemToListingBase } from '@/lib/listings-fetcher'
import {
  HOTEL_DEMO_LISTING_HANDLE,
  HOTEL_DEMO_LOCATION_PIN,
} from '@/lib/hotel-detail-demo-content'
import { formatListingLocationHierarchy, normalizeStayLocationPin } from '@/lib/stay-location-display'
import { normalizeCatalogVertical, type CatalogListingVerticalCode } from '@/lib/catalog-listing-vertical'
import {
  getPublicListingImages,
  getPublicListingVitrine,
  getVerticalMeta,
  fetchPublicHolidayHomeFaqTemplate,
  fetchPublicYachtCharterFaqTemplate,
  resolvePublishedListingIdForStayPage,
  searchPublicListings,
} from '@/lib/travel-api'
import type { FilterOption, MealPlanSummary, TListingBase, TListingFerry } from '@/types/listing-types'
import { getMessages } from '@/utils/getT'

/** SectionHost vitrin tipi — konaklama birleştirmesi ve araç / deneyim kısmi host bilgisi */
export type StayListingHost = {
  displayName: string
  avatarUrl: string
  handle: string
  description: string
  listingsCount: number
  reviewsCount: number
  rating: number
  responseRate: number
  responseTime: string
  isSuperhost: boolean
  isVerified: boolean
  joinedDate: string
}

/** Vitrin/host kısmen boş olduğunda `SectionHost` için tam prop seti. */
export function listingHostForSection(
  listingTitle: string,
  partial?: Partial<StayListingHost> | null,
): StayListingHost {
  const t = listingTitle.trim() || 'Host'
  return {
    displayName: partial?.displayName?.trim() || t,
    avatarUrl: partial?.avatarUrl?.trim() || avatars1.src,
    handle: partial?.handle?.trim() || 'host',
    description: partial?.description?.trim() ?? '',
    listingsCount: partial?.listingsCount ?? 0,
    reviewsCount: partial?.reviewsCount ?? 0,
    rating: partial?.rating ?? 0,
    responseRate: partial?.responseRate ?? 0,
    responseTime: partial?.responseTime?.trim() ?? '',
    isSuperhost: partial?.isSuperhost ?? false,
    isVerified: partial?.isVerified ?? false,
    joinedDate: partial?.joinedDate?.trim() ?? '',
  }
}

/** Mock diziler kaldırıldı — vitrin tamamen API. Kart bileşenlerinin ekstra alanları için kısmi genişletme. */
export type TStayListing = TListingBase

export type TCarListing = TListingBase &
  Partial<{
    gearshift: string
    seats: number
    airbags: number
    bags: number
    pickUpAddress: string
    dropOffAddress: string
    dropOffTime: string
    pickUpTime: string
    host: Partial<StayListingHost>
  }>

export type TExperienceListing = TListingBase &
  Partial<{
    host: Partial<StayListingHost>
    durationTime: string
    languages: string[]
    date: string
    galleryImgs: string[]
  }>

/** Uçuş kartı — liste API’ye geçtikçe kesin şekilde netleştirilir */
export type TFlightListing = TListingBase &
  Partial<{
    name: string
    departure: string
    arrival: string
    duration: string
    href: string
    airlines: { logo?: string; name?: string }
    departureTime: string | number | Date
    arrivalTime: string | number | Date
    layover?: string | null
    stopAirport?: string | null
    stopNumber?: number | null
    id: string
  }>

//  STAY LISTING  //
export async function getStayListings(): Promise<TStayListing[]> {
  return []
}

export type TStayListingResolved = TStayListing & {
  host: StayListingHost
  /** API / arama — otel `hotel_type_code` → vitrin tema öğesi etiketi */
  hotelTypeCode?: string
  /** Tatil evi tema kodları — API `theme_codes` veya mock */
  themeCodes?: string[]
  /** API `meal_plan_summary` — detayda çift sütun fiyat tablosu (`'both'`) */
  mealPlanSummary?: MealPlanSummary | null
  /** `vertical_holiday_home` meta — yalnızca tatil evi dikeyinde */
  pools?: HolidayHomePools
  poolsDemo?: boolean
  /** Tatil evi şablon + ilan SSS birleşimi (vitrin) */
  holidayHomeFaqItems?: { q: string; a: string }[]
}

export const getStayListingByHandle = async (
  handle: string,
  locale?: string,
): Promise<TStayListingResolved | null> => {
  const catalogId = await resolvePublishedListingIdForStayPage(handle, locale)
  if (!catalogId) return null

  const pub = await searchPublicListings(
    { listingIds: [catalogId], perPage: 1, locale },
    { cache: 'no-store' },
  )
  const item = pub?.listings?.[0]
  if (!item) return null

  const vitrine = await getPublicListingVitrine(catalogId, locale, { cache: 'no-store' })

  const api = mapPublicListingItemToListingBase(item)
  const pinFromSearch = (api.city ?? api.address ?? '').trim()
  const pinFromVitrine = vitrine?.location_label?.trim() ?? ''
  const pinFromHierarchy = formatListingLocationHierarchy({
    area: vitrine?.location_area,
    district: vitrine?.location_district,
    province: vitrine?.location_province,
  })
  let displayPin =
    pinFromHierarchy ||
    normalizeStayLocationPin(pinFromSearch || pinFromVitrine) ||
    pinFromSearch ||
    pinFromVitrine
  if (
    !pinFromHierarchy &&
    handle === HOTEL_DEMO_LISTING_HANDLE &&
    (!displayPin || !displayPin.includes(','))
  ) {
    displayPin = HOTEL_DEMO_LOCATION_PIN
  }
  let listing: TStayListing = {
    ...api,
    ...(displayPin ? { city: displayPin, address: displayPin } : {}),
    title: vitrine?.title?.trim() || api.title?.trim() || handle,
    description: vitrine?.description?.trim() || '',
    galleryImgs: api.galleryImgs,
  } as TStayListing

  let galleryImgs: string[] = [...(listing.galleryImgs ?? [])]
  let themeCodes: string[] | undefined = listing.themeCodes
  const listingExtras = listing as {
    ministryLicenseRef?: string
    prepaymentPercent?: string
    cancellationPolicyText?: string
  }
  let ministryLicenseRef: string | undefined = listingExtras.ministryLicenseRef
  let prepaymentPercent: string | undefined = listingExtras.prepaymentPercent
  let cancellationPolicyText: string | undefined = listingExtras.cancellationPolicyText

  let pools: HolidayHomePools | undefined
  let poolsDemo = false
  let listingExtraFees: Array<{ label: string; amount: string; unit: string }> | undefined
  let holidayHomeFaqItems: { q: string; a: string }[] | undefined

  const listingVertical = normalizeCatalogVertical(listing.listingVertical)
  const isHolidayHome = Boolean(catalogId && listingVertical === 'holiday_home')
  const isYachtCharter = Boolean(catalogId && listingVertical === 'yacht_charter')
  const isStayRental = isHolidayHome || isYachtCharter

  if (isStayRental) {
    try {
      const emptyFaqTemplate: HolidayHomeFaqTemplatePayload = { items: [] }
      const metaGroup = isYachtCharter ? 'yacht_extra' : 'holiday_home'
      const fetchFaqTemplate = isYachtCharter
        ? fetchPublicYachtCharterFaqTemplate
        : fetchPublicHolidayHomeFaqTemplate
      const [remote, meta, faqTemplate] = await Promise.all([
        getPublicListingImages(catalogId),
        getVerticalMeta<Record<string, unknown>>(catalogId, metaGroup).catch(() => ({})),
        fetchFaqTemplate().catch(() => emptyFaqTemplate),
      ])
      if (remote?.images?.length) {
        const previewKeys = parseHeroPreviewKeysFromVertical(unwrapVerticalMetaPayload(meta))
        galleryImgs = galleryUrlsWithHolidayHeroPreview(previewKeys ?? undefined, remote.images)
      }
      if (isHolidayHome) {
        const p = extractHolidayHomePoolsFromVerticalMeta(meta)
        if (p && hasAnyEnabledPool(p)) pools = p
      }
      const rawEf = unwrapVerticalMetaPayload(meta).extra_fees
      if (Array.isArray(rawEf)) {
        const cleaned = rawEf
          .filter(
            (x): x is { label: string; amount: string; unit: string } =>
              x != null &&
              typeof x === 'object' &&
              'label' in x &&
              'amount' in x &&
              String((x as { label: unknown }).label).trim() !== '' &&
              String((x as { amount: unknown }).amount).trim() !== '',
          )
          .map((x) => ({
            label: String((x as { label: string }).label).trim(),
            amount: String((x as { amount: string }).amount).trim(),
            unit: String((x as { unit?: string }).unit ?? 'per_stay').trim() || 'per_stay',
          }))
        if (cleaned.length > 0) listingExtraFees = cleaned
      }
      const overlay = parseHolidayHomeFaqListingOverlay(unwrapVerticalMetaPayload(meta).faq)
      const mergedFaq = mergeHolidayHomeListingFaqs(faqTemplate, overlay, locale ?? 'tr')
      if (mergedFaq.length > 0) holidayHomeFaqItems = mergedFaq
    } catch {
      pools = undefined
    }
  } else {
    const remote = await getPublicListingImages(catalogId)
    if (remote?.images?.length) {
      galleryImgs = dedupeGalleryUrlsPreserveOrder(
        orderGalleryUrlsBySortOrder(
          remote.images.map((im) => ({
            storage_key: im.storage_key,
            sort_order: im.sort_order,
            scene_code: im.scene_code ?? null,
            created_at: im.created_at,
          })),
        ),
      )
    }
  }

  if (item) {
    if (safeTrim(item.theme_codes)) {
      themeCodes = parseHolidayThemeCodes(item.theme_codes)
    }
    const mlr = safeTrimOrNull(item.ministry_license_ref)
    if (mlr) ministryLicenseRef = mlr
    const pp = safeTrimOrNull(item.prepayment_percent)
    if (pp) prepaymentPercent = pp
    const cpt = safeTrimOrNull(item.cancellation_policy_text)
    if (cpt) cancellationPolicyText = cpt
  }

  const contactName = vitrine?.contact_name?.trim()
  const contactBio = vitrine?.contact_bio?.trim()
  const externalListingRef = vitrine?.external_listing_ref?.trim() || undefined

  const featuredNorm = listing.featuredImage?.trim()
    ? preferListingGalleryFullAsset(listing.featuredImage.trim())
    : listing.featuredImage
  const galleryNorm = galleryImgs.map(preferListingGalleryFullAsset)

  const merged = {
    ...listing,
    ...(featuredNorm !== listing.featuredImage ? { featuredImage: featuredNorm } : {}),
    galleryImgs: galleryNorm,
    ...(themeCodes?.length ? { themeCodes } : {}),
    ...(ministryLicenseRef ? { ministryLicenseRef } : {}),
    ...(prepaymentPercent ? { prepaymentPercent } : {}),
    ...(cancellationPolicyText ? { cancellationPolicyText } : {}),
    ...(pools ? { pools, ...(poolsDemo ? { poolsDemo: true } : {}) } : {}),
    ...(listingExtraFees?.length ? { listingExtraFees } : {}),
    ...(holidayHomeFaqItems?.length ? { holidayHomeFaqItems } : {}),
    ...(externalListingRef ? { externalListingRef } : {}),
    host: {
      displayName: contactName?.trim() || listing.title?.trim() || 'Host',
      avatarUrl: avatars1.src,
      handle: listing.handle || 'host',
      description: contactBio ?? '',
      listingsCount: 0,
      reviewsCount: listing.reviewCount ?? 0,
      rating: listing.reviewStart ?? 0,
      responseRate: 0,
      responseTime: '',
      isSuperhost: false,
      isVerified: Boolean(contactName),
      joinedDate: '',
    },
  } as unknown as TStayListingResolved

  return merged
}


//  CAR LISTING  //
export async function getCarListings(): Promise<TCarListing[]> {
  return []
}

const EXPERIENCE_DETAIL_VERTICALS = new Set<CatalogListingVerticalCode>([
  'tour',
  'activity',
  'cruise',
  'hajj',
  'visa',
  'event',
  'cinema_ticket',
  'beach_lounger',
  'restaurant_table',
])

const TRANSPORT_DETAIL_VERTICALS = new Set<CatalogListingVerticalCode>([
  'car_rental',
  'ferry',
  'transfer',
])

export const getCarListingByHandle = async (
  handle: string,
  locale?: string,
): Promise<TCarListing | null> => {
  const row = await getStayListingByHandle(handle, locale)
  if (!row) return null
  const v = normalizeCatalogVertical(row.listingVertical)
  if (!v || !TRANSPORT_DETAIL_VERTICALS.has(v)) return null
  if (v === 'ferry') return null
  return row as TCarListing
}

export const getFerryListingByHandle = async (
  handle: string,
  locale?: string,
): Promise<TListingFerry | null> => {
  const row = await getStayListingByHandle(handle, locale)
  if (!row) return null
  const v = normalizeCatalogVertical(row.listingVertical)
  if (v !== 'ferry') return null
  return row as TListingFerry
}

//  EXPERIENCE LISTING  //
export async function getExperienceListings(): Promise<TExperienceListing[]> {
  return []
}

export const getExperienceListingByHandle = async (
  handle: string,
  locale?: string,
): Promise<TExperienceListing | null> => {
  const row = await getStayListingByHandle(handle, locale)
  if (!row) return null
  const v = normalizeCatalogVertical(row.listingVertical)
  if (!v || !EXPERIENCE_DETAIL_VERTICALS.has(v)) return null
  return row as TExperienceListing
}

// FLIGHT LISTING //
export async function getFlightListings(): Promise<TFlightListing[]> {
  return []
}

export const getFlightListingByHandle = async (
  handle: string,
  locale?: string,
): Promise<TFlightListing | null> => {
  const row = await getStayListingByHandle(handle, locale)
  if (!row) return null
  const v = normalizeCatalogVertical(row.listingVertical)
  if (v !== 'flight') return null
  return row as TFlightListing
}

// get Filter Options
export async function getStayListingFilterOptions(): Promise<FilterOption[]> {
  return [
    {
      label: 'Property type',
      name: 'propertyType',
      tabUIType: 'checkbox',
      options: [
        {
          name: 'Entire place',
          value: 'entire_place',
          description: 'Have a place to yourself',
          defaultChecked: true,
        },
        {
          name: 'Private room',
          value: 'private_room',
          description: 'Have your own room and share some common spaces',
          defaultChecked: true,
        },
        {
          name: 'Hotel room',
          value: 'hotel_room',
          description: 'Have a private or shared room in a boutique hotel, hostel, and more',
        },
        {
          name: 'Shared room',
          value: 'shared_room',
          description: 'Stay in a shared space, like a common room',
        },
      ],
    },
    {
      label: 'Price range',
      name: 'priceRange',
      tabUIType: 'price-range',
      min: 0,
      max: 1000,
    },
    {
      label: 'Rooms & Beds',
      name: 'roomsAndBeds',
      tabUIType: 'select-number',
      options: [
        { name: 'Beds', max: 10 },
        { name: 'Bedrooms', max: 10 },
        { name: 'Bathrooms', max: 10 },
      ],
    },
    {
      label: 'Amenities',
      name: 'amenities',
      tabUIType: 'checkbox',
      options: [
        {
          name: 'Kitchen',
          value: 'kitchen',
          description: 'Have a place to yourself',
          defaultChecked: true,
        },
        {
          name: 'Air conditioning',
          value: 'air_conditioning',
          description: 'Have your own room and share some common spaces',
          defaultChecked: true,
        },
        {
          name: 'Heating',
          value: 'heating',
          description: 'Have a private or shared room in a boutique hotel, hostel, and more',
        },
        {
          name: 'Dryer',
          value: 'dryer',
          description: 'Stay in a shared space, like a common room',
        },
        {
          name: 'Washer',
          value: 'washer',
          description: 'Stay in a shared space, like a common room',
        },
      ],
    },
    {
      label: 'Facilities',
      name: 'facilities',
      tabUIType: 'checkbox',
      options: [
        {
          name: 'Free parking on premise',
          value: 'free_parking_on_premise',
          description: 'Have a place to yourself',
        },
        {
          name: 'Hot tub',
          value: 'hot_tub',
          description: 'Have your own room and share some common spaces',
        },
        {
          name: 'Gym',
          value: 'gym',
          description: 'Have a private or shared room in a boutique hotel, hostel, and more',
        },
        {
          name: 'Pool',
          value: 'pool',
          description: 'Stay in a shared space, like a common room',
        },
        {
          name: 'EV charger',
          value: 'ev_charger',
          description: 'Stay in a shared space, like a common room',
        },
      ],
    },
    {
      label: 'Property type',
      name: 'listingCategory',
      tabUIType: 'checkbox',
      options: [
        {
          name: 'House',
          value: 'house',
          description: 'Have a place to yourself',
        },
        {
          name: 'Bed and breakfast',
          value: 'bed_and_breakfast',
          description: 'Have your own room and share some common spaces',
        },
        {
          name: 'Apartment',
          defaultChecked: true,
          value: 'apartment',
          description: 'Have a private or shared room in a boutique hotel, hostel, and more',
        },
        {
          name: 'Boutique hotel',
          value: 'boutique_hotel',
          description: 'Have a private or shared room in a boutique hotel, hostel, and more',
        },
        {
          name: 'Bungalow',
          value: 'bungalow',
          description: 'Have a private or shared room in a boutique hotel, hostel, and more',
        },
        {
          name: 'Chalet',
          defaultChecked: true,
          value: 'chalet',
          description: 'Have a private or shared room in a boutique hotel, hostel, and more',
        },
        {
          name: 'Condominium',
          defaultChecked: true,
          value: 'condominium',
          description: 'Have a private or shared room in a boutique hotel, hostel, and more',
        },
        {
          name: 'Cottage',
          value: 'cottage',
          description: 'Have a private or shared room in a boutique hotel, hostel, and more',
        },
        {
          name: 'Guest suite',
          value: 'guest_suite',
          description: 'Have a private or shared room in a boutique hotel, hostel, and more',
        },
        {
          name: 'Guesthouse',
          value: 'guesthouse',
          description: 'Have a private or shared room in a boutique hotel, hostel, and more',
        },
      ],
    },
    {
      label: 'House rules',
      name: 'houseRules',
      tabUIType: 'checkbox',
      options: [
        {
          name: 'Pets allowed',
          value: 'pets_allowed',
          description: 'Have a place to yourself',
        },
        {
          name: 'Smoking allowed',
          value: 'smoking_allowed',
          description: 'Have your own room and share some common spaces',
        },
      ],
    },
  ]
}
export async function getExperienceListingFilterOptions(locale?: string): Promise<FilterOption[]> {
  const m = getMessages(locale)
  const filters = m.categoryPage.listingFilters
  return [
    {
      label: filters.experienceTypeLabel,
      name: 'experienceType',
      tabUIType: 'checkbox',
      options: [
        {
          name: filters.expFoodDrink,
          value: 'food_drink',
          description: filters.expFoodDrinkDesc,
          defaultChecked: true,
        },
        {
          name: filters.expOutdoor,
          value: 'outdoor',
          description: filters.expOutdoorDesc,
          defaultChecked: true,
        },
        {
          name: filters.expArtsCulture,
          value: 'arts_culture',
          description: filters.expArtsCultureDesc,
        },
        {
          name: filters.expAdventure,
          value: 'adventure',
          description: filters.expAdventureDesc,
        },
      ],
    },
    {
      label: filters.priceRangeLabel,
      name: 'priceRange',
      tabUIType: 'price-range',
      min: 0,
      max: 1000,
    },
    {
      label: filters.durationLabel,
      name: 'duration',
      tabUIType: 'checkbox',
      options: [
        {
          name: filters.expLess1Hour,
          value: 'less_than_1_hour',
          description: filters.expLess1HourDesc,
          defaultChecked: true,
        },
        {
          name: filters.exp1_2Hours,
          value: '1_2_hours',
          description: filters.exp1_2HoursDesc,
          defaultChecked: true,
        },
        {
          name: filters.exp2_4Hours,
          value: '2_4_hours',
          description: filters.exp2_4HoursDesc,
        },
        {
          name: filters.expMore4Hours,
          value: 'more_than_4_hours',
          description: filters.expMore4HoursDesc,
        },
      ],
    },
    {
      label: filters.timeOfDayLabel,
      name: 'timeOfDay',
      tabUIType: 'checkbox',
      options: [
        {
          name: filters.timeMorning,
          value: 'morning',
          description: filters.timeMorningDesc,
          defaultChecked: true,
        },
        {
          name: filters.timeAfternoon,
          value: 'afternoon',
          description: filters.timeAfternoonDesc,
          defaultChecked: true,
        },
        {
          name: filters.timeEvening,
          value: 'evening',
          description: filters.timeEveningDesc,
        },
        {
          name: filters.timeNight,
          value: 'night',
          description: filters.timeNightDesc,
        },
      ],
    },
    {
      label: filters.amenitiesLabel,
      name: 'amenities',
      tabUIType: 'checkbox',
      options: [
        {
          name: filters.amenityKitchen,
          value: 'kitchen',
          description: filters.amenityKitchenDesc,
          defaultChecked: true,
        },
        {
          name: filters.amenityAc,
          value: 'air_conditioning',
          description: filters.amenityAcDesc,
          defaultChecked: true,
        },
        {
          name: filters.amenityHeating,
          value: 'heating',
          description: filters.amenityHeatingDesc,
        },
        {
          name: filters.amenityDryer,
          value: 'dryer',
          description: filters.amenityDryerDesc,
        },
        {
          name: filters.amenityWasher,
          value: 'washer',
          description: filters.amenityWasherDesc,
        },
      ],
    },
    {
      label: filters.facilitiesLabel,
      name: 'facilities',
      tabUIType: 'checkbox',
      options: [
        {
          name: filters.facilityParking,
          value: 'free_parking_on_premise',
          description: filters.facilityParkingDesc,
        },
        {
          name: filters.facilityHotTub,
          value: 'hot_tub',
          description: filters.facilityHotTubDesc,
        },
        {
          name: filters.facilityGym,
          value: 'gym',
          description: filters.facilityGymDesc,
        },
        {
          name: filters.facilityPool,
          value: 'pool',
          description: filters.facilityPoolDesc,
        },
        {
          name: filters.facilityEvCharger,
          value: 'ev_charger',
          description: filters.facilityEvChargerDesc,
        },
      ],
    },
  ]
}
export async function getCarListingFilterOptions(): Promise<FilterOption[]> {
  return [
    {
      label: 'Car type',
      name: 'Car-type',
      tabUIType: 'checkbox',
      options: [
        {
          name: 'Sedan',
          value: 'sedan',
          description: 'Comfortable and spacious for city driving.',
          defaultChecked: true,
        },
        {
          name: 'SUV',
          value: 'suv',
          description: 'Perfect for off-road adventures and family trips.',
          defaultChecked: true,
        },
        {
          name: 'Truck',
          value: 'truck',
          description: 'Ideal for heavy loads and rugged terrain.',
        },
        {
          name: 'Convertible',
          value: 'convertible',
          description: 'Enjoy the open air with a stylish ride.',
        },
      ],
    },
    {
      label: 'Price range',
      name: 'Price-range',
      tabUIType: 'price-range',
      min: 0,
      max: 1000,
    },
    {
      label: 'Fuel type',
      name: 'Fuel-type',
      tabUIType: 'checkbox',
      options: [
        {
          name: 'Petrol',
          value: 'petrol',
          description: 'Standard fuel type for most vehicles.',
          defaultChecked: true,
        },
        {
          name: 'Diesel',
          value: 'diesel',
          description: 'More fuel-efficient for long distances.',
          defaultChecked: true,
        },
        {
          name: 'Electric',
          value: 'electric',
          description: 'Eco-friendly and cost-effective.',
        },
        {
          name: 'Hybrid',
          value: 'hybrid',
          description: 'Combines petrol and electric for efficiency.',
        },
      ],
    },
    {
      label: 'Transmission type',
      name: 'Transmission-type',
      tabUIType: 'checkbox',
      options: [
        {
          name: 'Automatic',
          value: 'automatic',
          description: 'Easy to drive with no manual shifting.',
          defaultChecked: true,
        },
        {
          name: 'Manual',
          value: 'manual',
          description: 'For those who prefer more control.',
        },
      ],
    },
    {
      label: 'Amenities',
      name: 'Amenities',
      tabUIType: 'checkbox',
      options: [
        {
          name: 'Air conditioning',
          value: 'air_conditioning',
          description: 'Stay cool during your drive.',
          defaultChecked: true,
        },
        {
          name: 'GPS',
          value: 'gps',
          description: 'Never get lost with built-in navigation.',
          defaultChecked: true,
        },
        {
          name: 'Bluetooth',
          value: 'bluetooth',
          description: 'Connect your devices for hands-free calls and music.',
        },
        {
          name: 'Sunroof',
          value: 'sunroof',
          description: 'Enjoy the sunshine and fresh air.',
        },
      ],
    },
  ]
}
export async function getFlightFilterOptions(): Promise<FilterOption[]> {
  return [
    {
      label: 'Price range',
      name: 'priceRange',
      tabUIType: 'price-range',
      min: 0,
      max: 50000,
    },
  ]
}
