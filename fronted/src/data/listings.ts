import avatars1 from '@/images/avatars/Image-1.png'
import avatars2 from '@/images/avatars/Image-2.png'
import avatars3 from '@/images/avatars/Image-3.png'
import avatars4 from '@/images/avatars/Image-4.png'
import avatars5 from '@/images/avatars/Image-5.png'
import avatars6 from '@/images/avatars/Image-6.png'
import avatars7 from '@/images/avatars/Image-7.png'
import avatars8 from '@/images/avatars/Image-8.png'
import car1 from '@/images/cars/1.png'
import car2 from '@/images/cars/2.png'
import car3 from '@/images/cars/3.png'
import car4 from '@/images/cars/4.png'
import car5 from '@/images/cars/5.png'
import car6 from '@/images/cars/6.png'
import car7 from '@/images/cars/7.png'
import car8 from '@/images/cars/8.png'
import airlineLogo1 from '@/images/flights/logo1.png'
import airlineLogo2 from '@/images/flights/logo2.png'
import airlineLogo3 from '@/images/flights/logo3.png'
import airlineLogo4 from '@/images/flights/logo4.png'
import { orderGalleryUrlsForHero } from '@/lib/listing-gallery-hero-order'
import {
  extractHolidayHomePoolsFromVerticalMeta,
  getDemoHolidayHomePools,
  hasAnyEnabledPool,
  type HolidayHomePools,
} from '@/lib/listing-pools'
import { mapPublicListingItemToListingBase } from '@/lib/listings-fetcher'
import { normalizeCatalogVertical } from '@/lib/catalog-listing-vertical'
import {
  getPublicListingImages,
  getPublicListingVitrine,
  getVerticalMeta,
  resolvePublishedListingIdForStayPage,
  searchPublicListings,
} from '@/lib/travel-api'
import type { FilterOption, MealPlanSummary, TListingVisa } from '@/types/listing-types'

//  STAY LISTING  //
export async function getStayListings() {
  return [
    {
      id: 'stay-listing://1',
      date: 'May 20, 2021',
      listingCategory: 'Entire cabin',
      listingVertical: 'hotel',
      title: 'Best Western Cedars Hotel',
      handle: 'best-western-cedars-hotel',
      description: 'Located in the heart of the city',
      featuredImage:
        'https://images.pexels.com/photos/6129967/pexels-photo-6129967.jpeg?auto=compress&cs=tinysrgb&dpr=3&h=750&w=1260',

      galleryImgs: [
        'https://images.pexels.com/photos/6129967/pexels-photo-6129967.jpeg?auto=compress&cs=tinysrgb&dpr=3&h=750&w=1260',
        'https://images.pexels.com/photos/261394/pexels-photo-261394.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=750&w=1260',
        'https://images.pexels.com/photos/6969831/pexels-photo-6969831.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=750&w=1260',
        'https://images.pexels.com/photos/6527036/pexels-photo-6527036.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=750&w=1260',
      ],
      like: false,
      address: '1 Anzinger Court',
      city: 'İstanbul',
      reviewStart: 4.8,
      reviewCount: 28,
      price: '$260',
      maxGuests: 6,
      bedrooms: 10,
      bathrooms: 3,
      beds: 5,
      saleOff: '-10% today',
      discountPercent: 10,
      isCampaign: true,
      isNew: false,
      createdAt: '2024-08-15T10:00:00Z',
      isAds: null,
      map: { lat: 41.0132, lng: 29.0048 },
    },
    {
      id: 'stay-listing://2',
      date: 'May 20, 2021',
      listingCategory: 'Entire cabin',
      title: 'Bell by Greene King Inns ',
      handle: 'bell-by-greene-king-inns',
      description: 'Located in the heart of the city',
      featuredImage:
        'https://images.pexels.com/photos/261394/pexels-photo-261394.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=750&w=1260',

      galleryImgs: [
        'https://images.pexels.com/photos/261394/pexels-photo-261394.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=750&w=1260',
        'https://images.pexels.com/photos/1320686/pexels-photo-1320686.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=750&w=1260',
        'https://images.pexels.com/photos/2861361/pexels-photo-2861361.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=750&w=1260',
        'https://images.pexels.com/photos/2677398/pexels-photo-2677398.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=750&w=1260',
      ],
      like: false,
      address: '32923 Judy Hill',
      city: 'Antalya',
      reviewStart: 4.4,
      reviewCount: 198,
      price: '$250',
      maxGuests: 10,
      beds: 5,
      bedrooms: 6,
      bathrooms: 7,
      saleOff: '-15% today',
      discountPercent: 15,
      isNew: false,
      isCampaign: false,
      createdAt: '2024-09-01T08:00:00Z',
      isAds: null,
      map: { lat: 41.008, lng: 29.0086 },
    },
    {
      id: 'stay-listing://3',
      date: 'May 20, 2021',
      listingCategory: 'Entire cabin',
      title: "Half Moon, Sherborne by Marston's Inns ",
      handle: 'half-moon-sherborne-by-marstons-inns',
      description: 'Located in the heart of the city',
      featuredImage:
        'https://images.pexels.com/photos/2861361/pexels-photo-2861361.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=750&w=1260',

      galleryImgs: [
        'https://images.pexels.com/photos/2861361/pexels-photo-2861361.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=750&w=1260',
        'https://images.pexels.com/photos/261394/pexels-photo-261394.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=750&w=1260',
        'https://images.pexels.com/photos/1320686/pexels-photo-1320686.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=750&w=1260',
        'https://images.pexels.com/photos/2677398/pexels-photo-2677398.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=750&w=1260',
      ],
      like: true,
      address: '6731 Killdeer Park',
      city: 'Bodrum',
      reviewStart: 3.6,
      reviewCount: 16,
      price: '$278',
      maxGuests: 9,
      beds: 5,
      bedrooms: 9,
      bathrooms: 8,
      saleOff: null,
      isNew: true,
      isCampaign: false,
      createdAt: '2026-03-20T12:00:00Z',
      isAds: null,
      map: { lat: 41.0017, lng: 29.0105 },
    },
    {
      id: 'stay-listing://4',
      date: 'May 20, 2021',
      listingCategory: 'Entire cabin',
      title: 'White Horse Hotel by Greene King Inns ',
      handle: 'white-horse-hotel-by-greene-king-inns',
      description: 'Located in the heart of the city',
      featuredImage:
        'https://images.pexels.com/photos/2677398/pexels-photo-2677398.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=750&w=1260',

      galleryImgs: [
        'https://images.pexels.com/photos/2677398/pexels-photo-2677398.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=750&w=1260',
        'https://images.pexels.com/photos/261394/pexels-photo-261394.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=750&w=1260',
        'https://images.pexels.com/photos/1320686/pexels-photo-1320686.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=750&w=1260',
        'https://images.pexels.com/photos/2677398/pexels-photo-2677398.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=750&w=1260',
      ],
      like: false,
      address: '35 Sherman Park',
      city: 'İstanbul',
      reviewStart: 4.8,
      reviewCount: 34,
      price: '$240',
      beds: 5,
      maxGuests: 6,
      bedrooms: 7,
      bathrooms: 5,
      saleOff: null,
      isNew: true,
      isCampaign: true,
      createdAt: '2026-03-28T09:00:00Z',
      isAds: null,
      map: { lat: 40.9947, lng: 29.01 },
    },
    {
      id: 'stay-listing://5',
      date: 'May 20, 2021',
      listingCategory: 'Holiday home',
      listingVertical: 'holiday_home',
      themeCodes: ['sea_view', 'honeymoon', 'conservative'],
      ministryLicenseRef: '07-8961',
      prepaymentPercent: '20',
      cancellationPolicyText:
        'Girişten 14 gün öncesine kadar ücretsiz iptal. Daha sonra girişe 7 güne kadar %50 kesinti.',
      title: 'Ship and Castle Hotel ',
      handle: 'ship-and-castle-hotel',
      /** Demo: hesaplama / ücretlendirme denemeleri için (API yokken veya handle overlay) */
      priceAmount: 3500,
      priceCurrency: 'TRY',
      description: 'Located in the heart of the city',
      featuredImage:
        'https://images.pexels.com/photos/1320686/pexels-photo-1320686.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=750&w=1260',

      galleryImgs: [
        'https://images.pexels.com/photos/1320686/pexels-photo-1320686.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=750&w=1260',
        'https://images.pexels.com/photos/7163619/pexels-photo-7163619.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=750&w=1260',
        'https://images.pexels.com/photos/6527036/pexels-photo-6527036.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=750&w=1260',
        'https://images.pexels.com/photos/6969831/pexels-photo-6969831.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=750&w=1260',
      ],
      like: false,
      address: '3 Crest Line Park',
      city: 'Kapadokya',
      reviewStart: 3.4,
      reviewCount: 340,
      price: '₺3.500',
      beds: 5,
      maxGuests: 8,
      bedrooms: 3,
      bathrooms: 2,
      saleOff: '-20% indirim',
      discountPercent: 20,
      isNew: false,
      isCampaign: true,
      createdAt: '2024-11-10T14:00:00Z',
      isAds: null,
      map: { lat: 40.9876, lng: 29.0068 },
      stayBookingRules: {
        minStayNights: 2,
        minShortStayNights: 5,
        shortStayFeeAmount: 750,
        minAdvanceBookingDays: 0,
      },
      firstChargeAmount: 5000,
      listingExtraFees: [
        { label: 'Temizlik ücreti', amount: '450', unit: 'per_stay' },
        { label: 'Evcil hayvan', amount: '150', unit: 'per_night' },
      ],
    },
    {
      id: 'stay-listing://6',
      date: 'May 20, 2021',
      listingCategory: 'Home stay',
      title: 'The Windmill Family & Commercial Hotel ',
      handle: 'the-windmill-family-commercial-hotel',
      description: 'Located in the heart of the city',
      featuredImage:
        'https://images.pexels.com/photos/7163619/pexels-photo-7163619.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=750&w=1260',

      galleryImgs: [
        'https://images.pexels.com/photos/7163619/pexels-photo-7163619.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=750&w=1260',
        'https://images.pexels.com/photos/6129967/pexels-photo-6129967.jpeg?auto=compress&cs=tinysrgb&dpr=3&h=750&w=1260',
        'https://images.pexels.com/photos/6527036/pexels-photo-6527036.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=750&w=1260',
        'https://images.pexels.com/photos/6969831/pexels-photo-6969831.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=750&w=1260',
      ],
      like: true,
      address: '55974 Waxwing Junction',
      city: 'İzmir',
      reviewStart: 3.8,
      reviewCount: 508,
      price: '$190',
      maxGuests: 8,
      beds: 5,
      bedrooms: 7,
      bathrooms: 7,
      saleOff: null,
      isNew: true,
      isCampaign: false,
      createdAt: '2026-04-01T10:00:00Z',
      isAds: null,
      map: { lat: 40.981, lng: 29.0008 },
    },
    {
      id: 'stay-listing://7',
      date: 'May 20, 2021',
      listingCategory: 'Hotel room',
      title: "Unicorn, Gunthorpe by Marston's Inns ",
      handle: 'unicorn-gunthorpe-by-marstons-inns',
      description: 'Located in the heart of the city',
      featuredImage:
        'https://images.pexels.com/photos/6527036/pexels-photo-6527036.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=750&w=1260',

      galleryImgs: [
        'https://images.pexels.com/photos/6527036/pexels-photo-6527036.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=750&w=1260',
        'https://images.pexels.com/photos/7163619/pexels-photo-7163619.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=750&w=1260',
        'https://images.pexels.com/photos/6129967/pexels-photo-6129967.jpeg?auto=compress&cs=tinysrgb&dpr=3&h=750&w=1260',
        'https://images.pexels.com/photos/6969831/pexels-photo-6969831.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=750&w=1260',
      ],
      like: false,
      address: '79361 Chinook Place',
      city: 'Antalya',
      reviewStart: 3.0,
      reviewCount: 481,
      price: '$282',
      maxGuests: 9,
      beds: 5,
      bedrooms: 2,
      bathrooms: 5,
      saleOff: '-10% today',
      discountPercent: 10,
      isNew: false,
      isCampaign: true,
      createdAt: '2025-12-05T11:00:00Z',
      isAds: null,
      map: { lat: 40.9754, lng: 28.9922 },
    },
    {
      id: 'stay-listing://8',
      date: 'May 20, 2021',
      listingCategory: 'Hotel room',
      title: 'Holiday Inn Express Ramsgate Minster, an IHG Hotel ',
      handle: 'holiday-inn-express-ramsgate-minster-an-ihg-hotel',
      description: 'Located in the heart of the city',
      featuredImage:
        'https://images.pexels.com/photos/6969831/pexels-photo-6969831.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=750&w=1260',

      galleryImgs: [
        'https://images.pexels.com/photos/6969831/pexels-photo-6969831.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=750&w=1260',
        'https://images.pexels.com/photos/6527036/pexels-photo-6527036.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=750&w=1260',
        'https://images.pexels.com/photos/7163619/pexels-photo-7163619.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=750&w=1260',
        'https://images.pexels.com/photos/6129967/pexels-photo-6129967.jpeg?auto=compress&cs=tinysrgb&dpr=3&h=750&w=1260',
      ],
      like: true,
      address: '6 Chive Avenue',
      city: 'İstanbul',
      reviewStart: 3.9,
      reviewCount: 188,
      price: '$179',
      maxGuests: 6,
      beds: 5,
      bedrooms: 7,
      bathrooms: 4,
      saleOff: null,
      isNew: true,
      isCampaign: false,
      createdAt: '2026-03-31T07:00:00Z',
      isAds: null,
      map: { lat: 40.9715, lng: 28.9813 },
    },
  ]
}

export type TStayListing = Awaited<ReturnType<typeof getStayListings>>[number]

/** SectionHost — `getStayListingByHandle` birleşik çıktıda her zaman ekler */
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
  const listings = await getStayListings()
  const mockMatch = listings.find((l) => l.handle === handle)

  const demoPexelsExtras = [
    'https://images.pexels.com/photos/6438752/pexels-photo-6438752.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=750&w=1260',
    'https://images.pexels.com/photos/7163619/pexels-photo-7163619.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=750&w=1260',
    'https://images.pexels.com/photos/6527036/pexels-photo-6527036.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=750&w=1260',
    'https://images.pexels.com/photos/1320686/pexels-photo-1320686.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=750&w=1260',
    'https://images.pexels.com/photos/6969831/pexels-photo-6969831.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=750&w=1260',
    'https://images.pexels.com/photos/261394/pexels-photo-261394.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=750&w=1260',
    'https://images.pexels.com/photos/2861361/pexels-photo-2861361.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=750&w=1260',
    'https://images.pexels.com/photos/2677398/pexels-photo-2677398.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=750&w=1260',
    'https://images.pexels.com/photos/6129967/pexels-photo-6129967.jpeg?auto=compress&cs=tinysrgb&dpr=3&h=750&w=1260',
    'https://images.pexels.com/photos/6129967/pexels-photo-6129967.jpeg?auto=compress&cs=tinysrgb&dpr=3&h=750&w=1260',
    'https://images.pexels.com/photos/7163619/pexels-photo-7163619.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=750&w=1260',
    'https://images.pexels.com/photos/6527036/pexels-photo-6527036.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=750&w=1260',
    'https://images.pexels.com/photos/6969831/pexels-photo-6969831.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=750&w=1260',
  ]

  const catalogId = await resolvePublishedListingIdForStayPage(handle, locale)
  const pub = catalogId
    ? await searchPublicListings({ listingIds: [catalogId], perPage: 1, locale })
    : null
  const item = pub?.listings?.[0]
  const vitrine = catalogId ? await getPublicListingVitrine(catalogId, locale) : null

  let listing: TStayListing

  if (catalogId && item) {
    const api = mapPublicListingItemToListingBase(item)
    listing = {
      ...(mockMatch ?? {}),
      ...api,
      title: vitrine?.title?.trim() || api.title,
      description: vitrine?.description?.trim() || mockMatch?.description || '',
      date: mockMatch?.date ?? '',
      galleryImgs: mockMatch?.galleryImgs,
    } as TStayListing
  } else if (mockMatch) {
    listing = mockMatch
  } else {
    return null
  }

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

  if (catalogId) {
    const remote = await getPublicListingImages(catalogId)
    if (remote?.images?.length) {
      galleryImgs = orderGalleryUrlsForHero(
        remote.images.map((im) => ({
          storage_key: im.storage_key,
          sort_order: im.sort_order,
          scene_code: im.scene_code ?? null,
        })),
      )
    } else {
      galleryImgs = [...galleryImgs, ...demoPexelsExtras]
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
  } else {
    galleryImgs = [...galleryImgs, ...demoPexelsExtras]
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
  if (!pools && normalizeCatalogVertical(listing.listingVertical) === 'holiday_home') {
    pools = getDemoHolidayHomePools(locale)
    poolsDemo = true
  }

  const merged: TStayListingResolved = {
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
      description:
        'Providing lake views, The Symphony 9 Tam Coc in Ninh Binh provides accommodation, an outdoor swimming pool, a bar, a shared lounge, a garden and barbecue facilities.',
      listingsCount: 5,
      reviewsCount: 120,
      rating: 4.8,
      responseRate: 95,
      responseTime: 'within an hour',
      isSuperhost: true,
      isVerified: Boolean(contactName),
      joinedDate: 'March 2024',
    },
  }

  /** Demo ekstralar — yalnızca `NEXT_PUBLIC_ENABLE_DEMO_LISTING_EXTRAS=true` (katalog verisini ezmesin) */
  const demoListingExtrasEnabled =
    typeof process !== 'undefined' &&
    process.env.NEXT_PUBLIC_ENABLE_DEMO_LISTING_EXTRAS === 'true'

  if (demoListingExtrasEnabled && handle.trim().toLowerCase() === 'ship-and-castle-hotel') {
    const m = merged as TStayListing & {
      priceAmount?: number
      priceCurrency?: string
      firstChargeAmount?: number
      listingExtraFees?: Array<{ label: string; amount: string; unit: string }>
      stayBookingRules?: import('@/types/listing-types').StayBookingRules
    }
    return {
      ...merged,
      priceAmount: m.priceAmount ?? 3500,
      priceCurrency: m.priceCurrency?.trim() || 'TRY',
      price: m.price ?? '₺3.500',
      stayBookingRules: {
        minStayNights: m.stayBookingRules?.minStayNights ?? 2,
        minShortStayNights: 5,
        shortStayFeeAmount: 750,
        minAdvanceBookingDays: m.stayBookingRules?.minAdvanceBookingDays ?? 0,
        allowSubMinStayGapBooking: m.stayBookingRules?.allowSubMinStayGapBooking,
      },
      firstChargeAmount: m.firstChargeAmount ?? 5000,
      listingExtraFees:
        m.listingExtraFees && m.listingExtraFees.length > 0
          ? m.listingExtraFees
          : [
              { label: 'Temizlik ücreti', amount: '450', unit: 'per_stay' },
              { label: 'Evcil hayvan', amount: '150', unit: 'per_night' },
            ],
    } as TStayListingResolved
  }

  return merged
}

//  CAR LISTING  //
export async function getCarListings() {
  return [
    {
      id: 'car-listing://1',
      title: 'Peugeot 108',
      handle: 'peugeot-108',
      listingVertical: 'car_rental',
      listingCategory: 'Peugeot group',
      description: 'A compact and efficient hatchback, perfect for city driving.',
      featuredImage: car1.src,
      galleryImgs: [],
      address: '8953 Golf Course Terrace',
      reviewStart: 5.0,
      reviewCount: 126,
      price: '$124',
      gearshift: 'Auto gearbox',
      seats: 4,
      airbags: 6,
      like: true,
      saleOff: null,
      isAds: null,
      map: { lat: 40.9699, lng: 28.9688 },
    },
    {
      id: 'car-listing://2',
      title: 'KONA Electric',
      handle: 'kona-electric',
      listingVertical: 'car_rental',
      listingCategory: 'Hyundai group',
      description: 'A compact SUV with a stylish design and advanced features.',
      featuredImage: car2.src,
      galleryImgs: [],
      like: true,
      address: '2606 Straubel Crossing',
      reviewStart: 4.6,
      reviewCount: 217,
      price: '$382',
      gearshift: 'Auto gearbox',
      airbags: 6,
      seats: 4,
      saleOff: null,
      isAds: null,
      map: { lat: 40.9709, lng: 28.9554 },
    },
    {
      id: 'car-listing://3',
      title: 'Nissan Micra',
      handle: 'nissan-micra',
      listingVertical: 'car_rental',
      listingCategory: 'Nissan group',
      description: 'A compact and efficient hatchback, perfect for city driving.',
      featuredImage: car3.src,
      galleryImgs: [],
      like: false,
      address: '14 Petterle Trail',
      reviewStart: 3.8,
      reviewCount: 534,
      airbags: 6,
      price: '$105',
      gearshift: 'Auto gearbox',
      seats: 4,
      saleOff: null,
      isAds: null,
      map: { lat: 40.9746, lng: 28.9421 },
    },
    {
      id: 'car-listing://4',
      title: 'Hyundai i30',
      handle: 'hyundai-i30',
      listingVertical: 'car_rental',
      description: 'A compact car with a spacious interior and advanced safety features.',
      listingCategory: 'Hyundai group',
      featuredImage: car4.src,
      galleryImgs: [],
      airbags: 6,
      like: true,
      address: '34591 Dawn Park',
      reviewStart: 3.1,
      reviewCount: 527,
      price: '$266',
      gearshift: 'Auto gearbox',
      seats: 4,
      saleOff: null,
      isAds: null,
      map: { lat: 40.9812, lng: 28.9299 },
    },
    {
      id: 'car-listing://5',
      title: 'Nissan NV 300',
      handle: 'nissan-nv-300',
      listingVertical: 'car_rental',
      listingCategory: 'Nissan group',
      description: 'A reliable and spacious van, perfect for transporting goods or people.',
      featuredImage: car5.src,
      galleryImgs: [],
      airbags: 6,
      like: false,
      address: '5970 Manley Terrace',
      reviewStart: 3.6,
      reviewCount: 169,
      price: '$268',
      gearshift: 'Auto gearbox',
      seats: 4,
      saleOff: '-10% today',
      isAds: null,
      map: { lat: 40.9904, lng: 28.92 },
    },
    {
      id: 'car-listing://6',
      title: 'Nissan Qashqai',
      handle: 'nissan-qashqai',
      listingVertical: 'car_rental',
      description: 'A versatile SUV with a spacious interior and advanced safety features.',
      listingCategory: 'Nissan group',
      featuredImage: car6.src,
      galleryImgs: [],
      airbags: 6,
      like: false,
      address: '3 Buhler Point',
      reviewStart: 3.5,
      reviewCount: 33,
      price: '$321',
      gearshift: 'Auto gearbox',
      seats: 4,
      saleOff: null,
      isAds: null,
      map: { lat: 41.0055, lng: 28.9514 },
    },
    {
      id: 'car-listing://7',
      title: 'Hyundai Kona',
      handle: 'hyundai-kona',
      listingVertical: 'ferry',
      description: 'A compact SUV with a stylish design and advanced features.',
      listingCategory: 'Hyundai group',
      featuredImage: car7.src,
      galleryImgs: [],
      airbags: 6,
      like: true,
      address: '35 Kedzie Parkway',
      reviewStart: 4.2,
      reviewCount: 468,
      price: '$127',
      gearshift: 'Auto gearbox',
      seats: 4,
      saleOff: null,
      isAds: null,
      map: { lat: 41.011, lng: 28.9485 },
    },
    {
      id: 'car-listing://8',
      title: 'Mitsubishi Mirage',
      handle: 'mitsubishi-mirage',
      listingVertical: 'transfer',
      description: 'A compact and efficient hatchback, perfect for city driving.',
      listingCategory: 'Mitsubishi group',
      featuredImage: car8.src,
      galleryImgs: [],
      airbags: 6,
      like: true,
      address: '466 Glendale Place',
      reviewStart: 4.5,
      reviewCount: 524,
      price: '$46',
      gearshift: 'Auto gearbox',
      seats: 4,
      saleOff: null,
      isAds: null,
      map: { lat: 41.0174, lng: 28.9475 },
    },
  ]
}
export const getCarListingByHandle = async (handle: string) => {
  const listings = await getCarListings()
  let listing = listings.find((listing) => listing.handle === handle)
  if (!listing?.id) {
    // return null

    // for demo porpose, we will return the first listing if not found
    listing = listings[0]
  }

  return {
    ...(listing || {}),
    /** Bölge / gezi fikirleri (`ListingDetailOurFeatures`) — demo; gerçek veride API’den gelir */
    city: 'İstanbul',
    bags: 3,
    pickUpAddress: '2 Warner Alley, Neverland',
    pickUpTime: 'Monday, August 12 · 10:00',
    dropOffAddress: '123 Main Street, Neverland',
    dropOffTime: 'Monday, August 16 · 10:00',

    galleryImgs: [
      'https://images.pexels.com/photos/381292/pexels-photo-381292.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=750&w=1260',
      'https://images.pexels.com/photos/2526128/pexels-photo-2526128.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=750&w=1260',
      'https://images.pexels.com/photos/2827753/pexels-photo-2827753.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=750&w=1260',
      'https://images.pexels.com/photos/1637859/pexels-photo-1637859.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=750&w=1260',
      'https://images.pexels.com/photos/257851/pexels-photo-257851.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=750&w=1260',
      'https://images.pexels.com/photos/457418/pexels-photo-457418.jpeg?auto=compress&cs=tinysrgb&w=1600',
      'https://images.pexels.com/photos/1707820/pexels-photo-1707820.jpeg?auto=compress&cs=tinysrgb&w=1600',
      'https://images.pexels.com/photos/712618/pexels-photo-712618.jpeg?auto=compress&cs=tinysrgb&w=1600',
      'https://images.pexels.com/photos/752615/pexels-photo-752615.jpeg?auto=compress&cs=tinysrgb&w=1600',
      'https://images.pexels.com/photos/1210622/pexels-photo-1210622.jpeg?auto=compress&cs=tinysrgb&w=1600',
      'https://images.pexels.com/photos/303316/pexels-photo-303316.jpeg?auto=compress&cs=tinysrgb&w=1600',
      'https://images.pexels.com/photos/136872/pexels-photo-136872.jpeg?auto=compress&cs=tinysrgb&w=1600',
    ],
    host: {
      displayName: 'John Doe',
      avatarUrl: avatars1.src,
      handle: 'john-doe',
      description: 'Experienced car owner with a passion for sharing my vehicles with others.',
      listingsCount: 3,
      reviewsCount: 150,
      rating: 4.9,
      responseRate: 98,
      responseTime: 'within an hour',
      isSuperhost: true,
      isVerified: true,
      joinedDate: 'January 2023',
    },
  }
}
export type TCarListing = Awaited<ReturnType<typeof getCarListings>>[number]

//  EXPERIENCE LISTING  //
export async function getExperienceListings() {
  return [
    {
      id: 'experience-listing://1',
      title: 'Generate interactive markets',
      listingVertical: 'activity',
      handle: 'generate-interactive-markets',
      host: {
        displayName: 'John Doe',
        avatarUrl: avatars1.src,
        handle: 'john-doe',
      },
      listingCategory: 'Cooking Class',
      date: 'May 20, 2021',
      description: 'Located in the heart of the city',
      durationTime: '2 hours',
      languages: ['English', 'Spanish'],
      featuredImage:
        'https://images.pexels.com/photos/4348078/pexels-photo-4348078.jpeg?auto=compress&cs=tinysrgb&w=1600',
      galleryImgs: [
        'https://images.pexels.com/photos/4348078/pexels-photo-4348078.jpeg?auto=compress&cs=tinysrgb&w=1600',
        'https://images.pexels.com/photos/3825527/pexels-photo-3825527.jpeg?auto=compress&cs=tinysrgb&w=1600',
        'https://images.pexels.com/photos/4706134/pexels-photo-4706134.jpeg?auto=compress&cs=tinysrgb&w=1600',
        'https://images.pexels.com/photos/3825578/pexels-photo-3825578.jpeg?auto=compress&cs=tinysrgb&w=1600',
      ],
      like: true,
      address: '2 Warner Alley, Neverland',
      reviewStart: 4.4,
      reviewCount: 478,
      price: '$200',
      maxGuests: 6,
      saleOff: null,
      isAds: null,
      map: { lat: 41.0243, lng: 28.9491 },
    },
    {
      id: 'experience-listing://2',
      title: 'Deliver dynamic e-services',
      listingVertical: 'tour',
      host: {
        displayName: 'Alex Johnson',
        avatarUrl: avatars2.src,
        handle: 'alex-johnson',
      },
      listingCategory: 'Photography Tour',
      date: 'May 20, 2021',
      handle: 'deliver-dynamic-e-services',
      description: 'Located in the heart of the city',
      durationTime: '3 hours',
      languages: ['English', 'French'],
      featuredImage:
        'https://images.pexels.com/photos/3825527/pexels-photo-3825527.jpeg?auto=compress&cs=tinysrgb&w=1600',
      galleryImgs: [
        'https://images.pexels.com/photos/4706139/pexels-photo-4706139.jpeg?auto=compress&cs=tinysrgb&w=1600',
        'https://images.pexels.com/photos/3825578/pexels-photo-3825578.jpeg?auto=compress&cs=tinysrgb&w=1600',
        'https://images.pexels.com/photos/4706134/pexels-photo-4706134.jpeg?auto=compress&cs=tinysrgb&w=1600',
        'https://images.pexels.com/photos/123335/pexels-photo-123335.jpeg?auto=compress&cs=tinysrgb&w=1600',
      ],
      like: false,
      address: '620 Clove Park, Toronto',
      reviewStart: 3.2,
      reviewCount: 566,
      price: '$249',
      maxGuests: 6,
      saleOff: null,
      isAds: null,
      map: { lat: 41.0311, lng: 28.9533 },
    },
    {
      id: 'experience-listing://3',
      title: 'Productize holistic deliverables',
      listingVertical: 'cruise',
      host: {
        displayName: 'Kedzie Parkway',
        avatarUrl: avatars3.src,
        handle: 'kedzie-parkway',
      },
      listingCategory: 'Art Workshop',
      date: 'May 20, 2021',
      handle: 'productize-holistic-deliverables',
      description: 'Located in the heart of the city',
      durationTime: '15 hour',
      languages: ['English', 'German'],
      featuredImage:
        'https://images.pexels.com/photos/4706134/pexels-photo-4706134.jpeg?auto=compress&cs=tinysrgb&w=1600',

      galleryImgs: [
        'https://images.pexels.com/photos/4706134/pexels-photo-4706134.jpeg?auto=compress&cs=tinysrgb&w=1600',
        'https://images.pexels.com/photos/123335/pexels-photo-123335.jpeg?auto=compress&cs=tinysrgb&w=1600',
        'https://images.pexels.com/photos/3825578/pexels-photo-3825578.jpeg?auto=compress&cs=tinysrgb&w=1600',
        'https://images.pexels.com/photos/3761124/pexels-photo-3761124.jpeg?auto=compress&cs=tinysrgb&w=1600',
      ],
      like: false,
      address: '5 Butterfield Avenue, Chicago',
      reviewStart: 3.5,
      reviewCount: 147,
      price: '$88',
      maxGuests: 6,
      saleOff: null,
      isAds: null,
      map: { lat: 41.0372, lng: 28.9602 },
    },
    {
      id: 'experience-listing://4',
      title: 'Deploy integrated solutions',
      listingVertical: 'hajj',
      host: {
        displayName: 'North Park',
        avatarUrl: avatars4.src,
        handle: 'north-park',
      },
      listingCategory: 'Adventure Tour',
      date: 'May 20, 2021',
      handle: 'deploy-integrated-solutions',
      description: 'Located in the heart of the city',
      durationTime: '10 hour',
      languages: ['English', 'Italian'],
      featuredImage:
        'https://images.pexels.com/photos/3019019/pexels-photo-3019019.jpeg?auto=compress&cs=tinysrgb&dpr=3&h=750&w=1260',

      galleryImgs: [
        'https://images.pexels.com/photos/3019019/pexels-photo-3019019.jpeg?auto=compress&cs=tinysrgb&dpr=3&h=750&w=1260',
        'https://images.pexels.com/photos/3761124/pexels-photo-3761124.jpeg?auto=compress&cs=tinysrgb&w=1600',
        'https://images.pexels.com/photos/123335/pexels-photo-123335.jpeg?auto=compress&cs=tinysrgb&w=1600',
        'https://images.pexels.com/photos/8926846/pexels-photo-8926846.jpeg?auto=compress&cs=tinysrgb&w=1600',
      ],
      like: true,
      address: '11204 Lawn Court, Springfield',
      reviewStart: 3.0,
      reviewCount: 257,
      price: '$47',
      maxGuests: 9,
      saleOff: null,
      isAds: null,
      map: { lat: 41.042, lng: 28.9696 },
    },
    {
      id: 'experience-listing://5',
      title: 'Evolve virtual models',
      handle: 'evolve-virtual-models',
      listingVertical: 'visa',
      host: {
        displayName: 'John Doe',
        avatarUrl: avatars5.src,
        handle: 'john-doe',
      },
      listingCategory: 'Virtual Reality Experience',
      date: 'May 20, 2021',
      description: 'Located in the heart of the city',
      durationTime: '5 hours',
      languages: ['English', 'Japanese'],
      featuredImage:
        'https://images.pexels.com/photos/123335/pexels-photo-123335.jpeg?auto=compress&cs=tinysrgb&w=1600',

      galleryImgs: [
        'https://images.pexels.com/photos/123335/pexels-photo-123335.jpeg?auto=compress&cs=tinysrgb&w=1600',
        'https://images.pexels.com/photos/3761124/pexels-photo-3761124.jpeg?auto=compress&cs=tinysrgb&w=1600',
        'https://images.pexels.com/photos/8926846/pexels-photo-8926846.jpeg?auto=compress&cs=tinysrgb&w=1600',
        'https://images.pexels.com/photos/4706139/pexels-photo-4706139.jpeg?auto=compress&cs=tinysrgb&w=1600',
      ],
      like: false,
      address: '39 Del Sol Lane, Springfield',
      reviewStart: 4.4,
      reviewCount: 132,
      price: '$187',
      maxGuests: 10,
      saleOff: null,
      isAds: null,
      map: { lat: 41.0449, lng: 28.981 },
    },
    {
      id: 'experience-listing://6',
      title: 'Seize killer e-commerce',
      handle: 'seize-killer-e-commerce',
      listingVertical: 'tour',
      host: {
        displayName: 'Brandon',
        avatarUrl: avatars6.src,
        handle: 'brandon',
      },
      listingCategory: 'Wine Tasting',
      date: 'May 20, 2021',
      description: 'Located in the heart of the city',
      durationTime: '1.5 hour',
      languages: ['English', 'Chinese'],
      featuredImage:
        'https://images.pexels.com/photos/1637451/pexels-photo-1637451.jpeg?auto=compress&cs=tinysrgb&dpr=3&h=750&w=1260',

      galleryImgs: [
        'https://images.pexels.com/photos/1637451/pexels-photo-1637451.jpeg?auto=compress&cs=tinysrgb&dpr=3&h=750&w=1260',
        'https://images.pexels.com/photos/1154638/pexels-photo-1154638.jpeg?auto=compress&cs=tinysrgb&dpr=3&h=750&w=1260',
        'https://images.pexels.com/photos/3851949/pexels-photo-3851949.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
        'https://images.pexels.com/photos/1637451/pexels-photo-1637451.jpeg?auto=compress&cs=tinysrgb&dpr=3&h=750&w=1260',
      ],
      like: false,
      address: '45539 Kensington Drive, Springfield',
      reviewStart: 4.6,
      reviewCount: 275,
      price: '$179',
      maxGuests: 9,
      saleOff: null,
      isAds: null,
      map: { lat: 41.0454, lng: 28.9937 },
    },
    {
      id: 'experience-listing://7',
      title: 'Generate proactive ROI',
      handle: 'generate-proactive-roi',
      listingVertical: 'activity',
      host: {
        displayName: 'Dawn',
        avatarUrl: avatars7.src,
        handle: 'dawn',
      },
      listingCategory: 'Cultural Tour',
      date: 'May 20, 2021',

      description: 'Located in the heart of the city',
      durationTime: '3 hours',
      languages: ['English', 'Russian'],
      featuredImage:
        'https://images.pexels.com/photos/2385654/pexels-photo-2385654.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',

      galleryImgs: [
        'https://images.pexels.com/photos/2385654/pexels-photo-2385654.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
        'https://images.pexels.com/photos/3225531/pexels-photo-3225531.jpeg?auto=compress&cs=tinysrgb&dpr=3&h=750&w=1260',
        'https://images.pexels.com/photos/1154638/pexels-photo-1154638.jpeg?auto=compress&cs=tinysrgb&dpr=3&h=750&w=1260',
        'https://images.pexels.com/photos/2385654/pexels-photo-2385654.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
      ],
      like: true,
      address: '9 Jenifer Way, Spanish Fork',
      reviewStart: 3.4,
      reviewCount: 20,
      price: '$275',
      maxGuests: 10,
      saleOff: null,
      isAds: null,
      map: { lat: 41.0433, lng: 29.0069 },
    },
    {
      id: 'experience-listing://8',
      title: 'Aggregate out-of-the-box channels',
      handle: 'aggregate-out-of-the-box-channels',
      listingVertical: 'activity',
      host: {
        displayName: 'Alex',
        avatarUrl: avatars8.src,
        handle: 'alex',
      },
      listingCategory: 'Outdoor Adventure',
      date: 'May 20, 2021',
      description: 'Located in the heart of the city',
      durationTime: '4 hours',
      languages: ['English', 'Portuguese'],
      featuredImage:
        'https://images.pexels.com/photos/4253300/pexels-photo-4253300.jpeg?auto=compress&cs=tinysrgb&dpr=3&h=750&w=1260',

      galleryImgs: [
        'https://images.pexels.com/photos/4253300/pexels-photo-4253300.jpeg?auto=compress&cs=tinysrgb&dpr=3&h=750&w=1260',
        'https://images.pexels.com/photos/2385654/pexels-photo-2385654.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
        'https://images.pexels.com/photos/3225531/pexels-photo-3225531.jpeg?auto=compress&cs=tinysrgb&dpr=3&h=750&w=1260',
        'https://images.pexels.com/photos/1154638/pexels-photo-1154638.jpeg?auto=compress&cs=tinysrgb&dpr=3&h=750&w=1260',
      ],
      like: true,
      address: '5 Aberg Place, New York',
      reviewStart: 4.9,
      reviewCount: 268,
      price: '$270',
      maxGuests: 9,
      saleOff: null,
      isAds: null,
      map: { lat: 41.0383, lng: 29.0195 },
    },
  ]
}
export const getExperienceListingByHandle = async (handle: string) => {
  const listings = await getExperienceListings()
  let listing = listings.find((listing) => listing.handle === handle)
  if (!listing?.id) {
    // return null

    // for demo porpose, we will return the first listing if not found
    listing = listings[0]
  }

  return {
    ...(listing || {}),
    galleryImgs: [
      ...listing.galleryImgs,
      'https://images.pexels.com/photos/4348078/pexels-photo-4348078.jpeg?auto=compress&cs=tinysrgb&w=1600',
      'https://images.pexels.com/photos/3825527/pexels-photo-3825527.jpeg?auto=compress&cs=tinysrgb&w=1600',
      'https://images.pexels.com/photos/4706134/pexels-photo-4706134.jpeg?auto=compress&cs=tinysrgb&w=1600',
      'https://images.pexels.com/photos/3825578/pexels-photo-3825578.jpeg?auto=compress&cs=tinysrgb&w=1600',
      'https://images.pexels.com/photos/123335/pexels-photo-123335.jpeg?auto=compress&cs=tinysrgb&w=1600',
      'https://images.pexels.com/photos/3761124/pexels-photo-3761124.jpeg?auto=compress&cs=tinysrgb&w=1600',
      'https://images.pexels.com/photos/8926846/pexels-photo-8926846.jpeg?auto=compress&cs=tinysrgb&w=1600',
      'https://images.pexels.com/photos/4706139/pexels-photo-4706139.jpeg?auto=compress&cs=tinysrgb&w=1600',
      'https://images.pexels.com/photos/7003624/pexels-photo-7003624.jpeg?auto=compress&cs=tinysrgb&w=1600',
      'https://images.pexels.com/photos/4348078/pexels-photo-4348078.jpeg?auto=compress&cs=tinysrgb&w=1600',
      'https://images.pexels.com/photos/3825527/pexels-photo-3825527.jpeg?auto=compress&cs=tinysrgb&w=1600',
    ],
    host: {
      displayName: 'Jane Smith',
      avatarUrl: avatars1.src,
      handle: 'jane-smith',
      description:
        'Providing lake views, The Symphony 9 Tam Coc in Ninh Binh provides accommodation, an outdoor swimming pool, a bar, a shared lounge, a garden and barbecue facilities.',
      listingsCount: 5,
      reviewsCount: 120,
      rating: 4.8,
      responseRate: 95,
      responseTime: 'within an hour',
      isSuperhost: true,
      isVerified: true,
      joinedDate: 'March 2024',
    },
  }
}
export type TExperienceListing = Awaited<ReturnType<typeof getExperienceListings>>[number]


// FLIGHT LISTING //
export async function getFlightListings() {
  const rows = [
    {
      id: 'flight-listing://1',
      name: 'AKL - ICN',
      departure: 'Auckland (AKL)',
      departureTime: '2025-10-01T10:00:00Z',
      arrivalTime: '2025-10-01T21:30:00Z',
      arrival: 'Incheon (ICN)',
      duration: '11h 30m',
      stopNumber: 1,
      stopAirport: 'SGN',
      layover: '2h 30m',
      // This is a placeholder link, replace with actual flight details
      href: '#',
      price: '$4,100',
      airlines: {
        logo: airlineLogo1.src,
        name: 'Korean Air',
      },
    },
    {
      id: 'flight-listing://2',
      name: 'AKL - ICN',
      departure: 'Auckland (AKL)',
      departureTime: '2025-10-01T10:00:00Z',
      arrivalTime: '2025-10-01T21:30:00Z',
      arrival: 'Incheon (ICN)',
      duration: '15h 30m',
      stopNumber: 1,
      stopAirport: 'Ho Chi Minh City (SGN)',
      layover: '2h 30m',
      price: '$3,380',
      // This is a placeholder link, replace with actual flight details
      href: '#',
      airlines: {
        logo: airlineLogo2.src,
        name: 'Singapore Airlines',
      },
    },
    {
      id: 'flight-listing://3',
      name: 'SGN - AKl',
      departure: 'Ho Chi Minh City (SGN)',
      arrival: 'Auckland (AKL)',
      departureTime: '2025-10-01T10:00:00Z',
      arrivalTime: '2025-10-02T07:40:00Z',
      duration: '21h 40m',
      stopNumber: 1,
      stopAirport: 'Sydney (SYD)',
      layover: '2h 30m',
      price: '$2,380',
      // This is a placeholder link, replace with actual flight details
      href: '#',
      airlines: {
        logo: airlineLogo3.src,
        name: 'Philippine Airlines',
      },
    },
    {
      id: 'flight-listing://4',
      name: 'HAN - NRT',
      departure: 'Hanoi (HAN)',
      arrival: 'Tokyo (NRT)',
      departureTime: '2025-10-01T10:00:00Z',
      arrivalTime: '2025-10-01T21:30:00Z',
      duration: '5h 30m',
      stopNumber: 1,
      stopAirport: 'Sydney (SYD)',
      layover: '2h 30m',
      // This is a placeholder link, replace with actual flight details
      price: '$4,100',
      href: '#',
      airlines: {
        logo: airlineLogo4.src,
        name: 'Korean Air',
      },
    },
    {
      id: 'flight-listing://5',
      name: 'AKL - ICN',
      departure: 'Auckland (AKL)',
      arrival: 'Incheon (ICN)',
      departureTime: '2025-10-01T10:00:00Z',
      arrivalTime: '2025-10-01T21:30:00Z',
      duration: '11h 30m',
      stopNumber: 1,
      stopAirport: 'Singapore (SIN)',
      layover: '2h 30m',
      price: '$2,380',
      // This is a placeholder link, replace with actual flight details
      href: '#',
      airlines: {
        logo: airlineLogo1.src,
        name: 'Singapore Airlines',
      },
    },
    {
      id: 'flight-listing://6',
      name: 'AKL - ICN',
      departure: 'Auckland (AKL)',
      arrival: 'Incheon (ICN)',
      departureTime: '2025-10-01T10:00:00Z',
      arrivalTime: '2025-10-01T21:30:00Z',
      duration: '19h 30m',
      stopNumber: 1,
      stopAirport: 'Auckland (AKL)',
      layover: '2h 30m',
      // This is a placeholder link, replace with actual flight details
      href: '#',
      price: '$4,100',
      airlines: {
        logo: airlineLogo3.src,
        name: 'Korean Air',
      },
    },
  ]
  return rows.map((row, i) => ({
    ...row,
    title: row.name,
    handle: `flight-${i + 1}`,
  }))
}
export type TFlightListing = Awaited<ReturnType<typeof getFlightListings>>[number]

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

/** Mock vize ilanları — kategori sayfası ve `fetchCategoryListings` ortak kullanır */
export async function getVisaMockListings(): Promise<TListingVisa[]> {
  return [
    { id: 'visa-1', title: 'Schengen Vizesi', handle: 'schengen', country: 'Avrupa (Schengen)', countryCode: 'eu', visaType: 'Turistik', processingDays: 10, maxStayDays: 90, price: '₺1.200', isOnlineApplicable: false },
    { id: 'visa-2', title: 'Amerika Birleşik Devletleri', handle: 'usa', country: 'ABD', countryCode: 'us', visaType: 'Turistik (B-1/B-2)', processingDays: 15, maxStayDays: 90, price: '₺4.500', isOnlineApplicable: false },
    { id: 'visa-3', title: 'İngiltere Vizesi', handle: 'uk', country: 'İngiltere', countryCode: 'gb', visaType: 'Turistik', processingDays: 8, maxStayDays: 180, price: '₺2.800', isOnlineApplicable: false },
    { id: 'visa-4', title: 'Japonya Vizesi', handle: 'japan', country: 'Japonya', countryCode: 'jp', visaType: 'Turistik', processingDays: 5, maxStayDays: 15, price: '₺800', isOnlineApplicable: false },
    { id: 'visa-5', title: 'Hindistan e-Vize', handle: 'india', country: 'Hindistan', countryCode: 'in', visaType: 'e-Vize', processingDays: 3, maxStayDays: 30, price: '₺600', isOnlineApplicable: true },
    { id: 'visa-6', title: 'Suudi Arabistan Vizesi', handle: 'saudi', country: 'Suudi Arabistan', countryCode: 'sa', visaType: 'Turistik', processingDays: 7, maxStayDays: 90, price: '₺1.800', isOnlineApplicable: true },
    { id: 'visa-7', title: 'Dubai Vizesi', handle: 'dubai', country: 'BAE / Dubai', countryCode: 'ae', visaType: 'Turistik', processingDays: 3, maxStayDays: 30, price: '₺1.200', isOnlineApplicable: true },
    { id: 'visa-8', title: 'Kanada Vizesi', handle: 'canada', country: 'Kanada', countryCode: 'ca', visaType: 'Turistik', processingDays: 20, maxStayDays: 180, price: '₺3.200', isOnlineApplicable: false },
  ]
}
