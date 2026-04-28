import avatars1 from '@/images/avatars/Image-1.png'
import { orderGalleryUrlsForHero } from '@/lib/listing-gallery-hero-order'
import {
  extractHolidayHomePoolsFromVerticalMeta,
  hasAnyEnabledPool,
  type HolidayHomePools,
} from '@/lib/listing-pools'
import { mapPublicListingItemToListingBase } from '@/lib/listings-fetcher'
import { normalizeCatalogVertical } from '@/lib/catalog-listing-vertical'
import { stripHtml } from '@/lib/social-share/strip-html'
import {
  getPublicListingImages,
  getPublicListingVitrine,
  getVerticalMeta,
  resolvePublishedListingIdForStayPage,
  searchPublicListings,
} from '@/lib/travel-api'
import type { FilterOption, MealPlanSummary, TListingBase, TListingVisa } from '@/types/listing-types'

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
}

export const getStayListingByHandle = async (
  handle: string,
  locale?: string,
): Promise<TStayListingResolved | null> => {
  const catalogId = await resolvePublishedListingIdForStayPage(handle, locale)
  if (!catalogId) return null

  const pub = await searchPublicListings({ listingIds: [catalogId], perPage: 1, locale })
  const item = pub?.listings?.[0]
  if (!item) return null

  const vitrine = await getPublicListingVitrine(catalogId, locale)

  const api = mapPublicListingItemToListingBase(item)
  let listing: TStayListing = {
    ...api,
    title: vitrine?.title?.trim() || api.title,
    description: vitrine?.description?.trim() || '',
    galleryImgs: api.galleryImgs,
  } as TStayListing

  let galleryImgs: string[] = [...(listing.galleryImgs ?? [])]
  let themeCodes: string[] | undefined =
    listing.listingVertical === 'holiday_home' ? listing.themeCodes : undefined
  const listingExtras = listing as {
    ministryLicenseRef?: string
    prepaymentPercent?: string
    cancellationPolicyText?: string
  }
  let ministryLicenseRef: string | undefined = listingExtras.ministryLicenseRef
  let prepaymentPercent: string | undefined = listingExtras.prepaymentPercent
  let cancellationPolicyText: string | undefined = listingExtras.cancellationPolicyText

  const remote = await getPublicListingImages(catalogId)
  if (remote?.images?.length) {
    galleryImgs = orderGalleryUrlsForHero(
      remote.images.map((im) => ({
        storage_key: im.storage_key,
        sort_order: im.sort_order,
        scene_code: im.scene_code ?? null,
      })),
    )
  }

  if (item) {
    if (item.theme_codes?.trim()) {
      themeCodes = item.theme_codes
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
    }
    if (item.ministry_license_ref?.trim()) {
      ministryLicenseRef = item.ministry_license_ref.trim()
    }
    const pp = item.prepayment_percent?.trim()
    if (pp) prepaymentPercent = pp
    const cpt = item.cancellation_policy_text?.trim()
    if (cpt) cancellationPolicyText = cpt
  }

  const contactName = vitrine?.contact_name?.trim()

  let pools: HolidayHomePools | undefined
  let poolsDemo = false
  let listingExtraFees: Array<{ label: string; amount: string; unit: string }> | undefined
  if (catalogId && normalizeCatalogVertical(listing.listingVertical) === 'holiday_home') {
    try {
      const meta = await getVerticalMeta<Record<string, unknown>>(catalogId, 'holiday_home')
      const p = extractHolidayHomePoolsFromVerticalMeta(meta)
      if (p && hasAnyEnabledPool(p)) pools = p
      const rawEf = meta.extra_fees
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
    } catch {
      pools = undefined
    }
  }
  const merged = {
    ...listing,
    galleryImgs,
    ...(themeCodes?.length ? { themeCodes } : {}),
    ...(ministryLicenseRef ? { ministryLicenseRef } : {}),
    ...(prepaymentPercent ? { prepaymentPercent } : {}),
    ...(cancellationPolicyText ? { cancellationPolicyText } : {}),
    ...(pools ? { pools, ...(poolsDemo ? { poolsDemo: true } : {}) } : {}),
    ...(listingExtraFees?.length ? { listingExtraFees } : {}),
    host: {
      displayName: contactName?.trim() || listing.title?.trim() || 'Host',
      avatarUrl: avatars1.src,
      handle: listing.handle || 'host',
      description: stripHtml(listing.description ?? '')
        .trim()
        .slice(0, 800),
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

export const getCarListingByHandle = async (_handle: string): Promise<TCarListing | null> => null

//  EXPERIENCE LISTING  //
export async function getExperienceListings(): Promise<TExperienceListing[]> {
  return []
}

export const getExperienceListingByHandle = async (
  _handle: string,
): Promise<TExperienceListing | null> => null

// FLIGHT LISTING //
export async function getFlightListings(): Promise<TFlightListing[]> {
  return []
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
export async function getExperienceListingFilterOptions(): Promise<FilterOption[]> {
  return [
    {
      label: 'Exprience type',
      name: 'experienceType',
      tabUIType: 'checkbox',
      options: [
        {
          name: 'Food & drink',
          value: 'food_drink',
          description: 'Try local cooking classes, and more.',
          defaultChecked: true,
        },
        {
          name: 'Outdoor',
          value: 'outdoor',
          description: 'Explore nature, and outdoor activities.',
          defaultChecked: true,
        },
        {
          name: 'Arts & culture',
          value: 'arts_culture',
          description: 'Discover local art experiences.',
        },

        {
          name: 'Adventure',
          value: 'adventure',
          description: 'Experience thrilling activities.',
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
      label: 'Duration',
      name: 'duration',
      tabUIType: 'checkbox',
      options: [
        {
          name: 'Less than 1 hour',
          value: 'less_than_1_hour',
          description: 'Experience activities that last less than 1 hour.',
          defaultChecked: true,
        },
        {
          name: '1-2 hours',
          value: '1_2_hours',
          description: 'Experience activities that last 1-2 hours.',
          defaultChecked: true,
        },
        {
          name: '2-4 hours',
          value: '2_4_hours',
          description: 'Experience activities that last 2-4 hours.',
        },
        {
          name: 'More than 4 hours',
          value: 'more_than_4_hours',
          description: 'Experience activities that last more than 4 hours.',
        },
      ],
    },
    {
      label: 'Time of day',
      name: 'timeOfDay',
      tabUIType: 'checkbox',
      options: [
        {
          name: 'Morning',
          value: 'morning',
          description: 'Experience activities in the morning.',
          defaultChecked: true,
        },
        {
          name: 'Afternoon',
          value: 'afternoon',
          description: 'Experience activities in the afternoon.',
          defaultChecked: true,
        },
        {
          name: 'Evening',
          value: 'evening',
          description: 'Experience activities in the evening.',
        },
        {
          name: 'Night',
          value: 'night',
          description: 'Experience activities at night.',
        },
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
      label: 'Airlines',
      name: 'airlines',
      tabUIType: 'checkbox',
      options: [
        {
          name: 'Korean Air',
          value: 'korean_air',
          description: 'Flag carrier and largest airline of South Korea.',
          defaultChecked: true,
        },
        {
          name: 'Singapore Airlines',
          value: 'singapore_airlines',
          description: 'Flag carrier of Singapore, known for its service.',
          defaultChecked: true,
        },
        {
          name: 'Philippine Airlines',
          value: 'philippine_airlines',
          description: 'Flag carrier of the Philippines.',
        },
      ],
    },
    {
      label: 'Guests',
      name: 'guests',
      tabUIType: 'select-number',
      options: [
        { name: 'Adults', max: 10 },
        { name: 'Children', max: 10 },
        { name: 'Infants', max: 10 },
      ],
    },
    {
      label: 'Price range',
      name: 'priceRange',
      tabUIType: 'price-range',
      min: 0,
      max: 10000,
    },
    {
      label: 'Number of stops',
      name: 'numberOfStops',
      tabUIType: 'checkbox',
      options: [
        {
          name: 'Any number of stops',
          value: 'any_stops',
          description: 'Include flights with any number of stops.',
          defaultChecked: true,
        },
        {
          name: 'Non-stop',
          value: 'non_stop',
          description: 'Direct flights with no layovers.',
        },
        {
          name: '1 stop',
          value: '1_stop',
          description: 'Flights with one layover.',
        },
        {
          name: '2+ stops',
          value: '2_plus_stops',
          description: 'Flights with two or more layovers.',
        },
      ],
    },
    {
      label: 'Flight duration',
      name: 'flightDuration',
      tabUIType: 'checkbox',
      options: [
        {
          name: 'Less than 5 hours',
          value: 'less_than_5_hours',
          description: 'Short flights for quick trips.',
          defaultChecked: true,
        },
        {
          name: '5-10 hours',
          value: '5_10_hours',
          description: 'Medium-haul flights for regional travel.',
          defaultChecked: true,
        },
        {
          name: 'More than 10 hours',
          value: 'more_than_10_hours',
          description: 'Long-haul flights for international travel.',
        },
      ],
    },
    {
      label: 'Class type',
      name: 'classType',
      tabUIType: 'checkbox',
      options: [
        {
          name: 'Economy Class',
          value: 'economy_class',
          description: 'Affordable and comfortable seating.',
          defaultChecked: true,
        },
        {
          name: 'Business Class',
          value: 'business_class',
          description: 'Premium seating with extra amenities.',
          defaultChecked: true,
        },
        {
          name: 'First Class',
          value: 'first_class',
          description: 'Luxury seating with top-notch service.',
        },
        {
          name: 'Premium Economy',
          value: 'premium_economy',
          description: 'Enhanced comfort and service in economy.',
        },
      ],
    },
    {
      label: 'Amenities',
      name: 'amenities',
      tabUIType: 'checkbox',
      options: [
        {
          name: 'In-flight entertainment',
          value: 'in_flight_entertainment',
          description: 'Enjoy movies, music, and games during your flight.',
          defaultChecked: true,
        },
        {
          name: 'Wi-Fi',
          value: 'wifi',
          description: 'Stay connected with in-flight Wi-Fi.',
          defaultChecked: true,
        },
        {
          name: 'Meal service',
          value: 'meal_service',
          description: 'Enjoy complimentary meals and snacks.',
        },
        {
          name: 'Extra legroom',
          value: 'extra_legroom',
          description: 'More space for a comfortable journey.',
        },
      ],
    },
  ]
}

export async function getVisaMockListings(): Promise<TListingVisa[]> {
  return []
}
