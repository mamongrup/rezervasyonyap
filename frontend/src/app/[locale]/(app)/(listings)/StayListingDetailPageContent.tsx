import { Bathtub02Icon, BedSingle01Icon, MeetingRoomIcon } from '@/components/Icons'
import { getListingReviews } from '@/data/data'
import { getCachedSiteConfig } from '@/lib/site-config-cache'
import { getStayListingByHandle } from '@/data/listings'
import { fetchCategoryListings } from '@/lib/listings-fetcher'
import { getSitePublicConfig as getSitePublicConfigSync, mergeBrandingIntoEnvContact } from '@/lib/site-public-config'
import { buildListingOgImageUrl } from '@/lib/social-share/listing-og-image-url'
import { sanitizeRichCmsHtml } from '@/lib/sanitize-cms-html'
import { stripHtml } from '@/lib/social-share/strip-html'
import { normalizeCatalogVertical } from '@/lib/catalog-listing-vertical'
import {
  buildSeasonalPricingTableRows,
  maxNightlyFromListingPriceRules,
  minNightlyFromListingPriceRules,
} from '@/lib/listing-price-rules-public'
import { holidayHomeRulePriceRangeEnabled } from '@/lib/holiday-home-rule-price-range'
import {
  applyChildFriendlyThemeToPools,
  getPoolHeatingReservationOption,
  hasAnyEnabledPool,
} from '@/lib/listing-pools'
import { resolveRegionPlacesForListingPage } from '@/lib/region-places-from-location-page'
import {
  regionBrowseSlugFromLocationPin,
  regionPlacesSlugFromCity,
  shortRegionLabelFromLocationPin,
} from '@/lib/region-places-slug'
import {
  HOLIDAY_HOME_DETAIL_PATH,
  STAY_DETAIL_HOTEL_PATH,
  STAY_DETAIL_YACHT_PATH,
  stayDetailPathForVertical,
  type StayDetailLinkBase,
} from '@/lib/listing-detail-routes'
import { stayRentalCapacitySummary } from '@/lib/holiday-home-capacity-summary'
import { isStayRentalCategory } from '@/lib/stay-rental-categories'
import {
  HOLIDAY_THEME_CODES_EXCLUDED_FROM_LISTING_CARDS,
  parseHolidayThemeCodes,
} from '@/lib/holiday-theme-codes'
import {
  getHolidayThemeLabelMap,
} from '@/lib/holiday-theme-labels'
import {
  buildAttributeLabelMap,
  buildVitrinAmenityRows,
} from '@/lib/listing-attribute-display'
import { galleryUrlsForStayDetailHeader } from '@/lib/listing-gallery-hero-order'
import { buildStayListingDetailJsonLd } from '@/lib/seo/listing-detail-jsonld'
import { vitrinHref } from '@/lib/vitrin-href'
import {
  fetchPublicHotelValidCampaigns,
  fetchPublicListingAvailabilityDaysSafe,
  fetchPublicListingBedroomsSafe,
  fetchPublicListingContractSafe,
  fetchPublicVerticalMetaSafe,
  fetchPublicVerticalYachtSafe,
  getBlogSlugsByTitles,
  getComputedServicePois,
  getListingNearbyPois,
  getPublicHotelRooms,
  fetchPublicListingAttributesSafe,
  getPublicMealPlans,
  getPublicHotelPromotions,
  getPublicHotelActivities,
  getPublicListingPriceRules,
  getPublicListingPriceLines,
  getPublicListingAccommodationRules,
  getVerticalMeta,
  isAttributeValueTrue,
  listPublicThemeItems,
  resolvePublishedListingIdForStayPage,
  type ListingPriceRuleRow,
} from '@/lib/travel-api'
import type { TListingHolidayHome } from '@/types/listing-types'
import { guessCalendarMonthsShownFromRequest } from '@/lib/calendar-months-shown-server'
import { getMessages } from '@/utils/getT'
import { interpolate } from '@/utils/interpolate'
import { DescriptionDetails, DescriptionList, DescriptionTerm } from '@/shared/description-list'
import { Divider } from '@/shared/divider'
import {
  AlertCircleIcon,
  ArrowRight02Icon,
  CheckmarkCircle01Icon,
  UserMultiple02Icon,
} from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import clsx from 'clsx'
import HeaderGallery from './components/HeaderGallery'
import { buildHotelFaqItems } from './hotel-faq-items'
import {
  buildHotelListingDistanceColumns,
  HOTEL_DEMO_AMENITY_ROWS,
  HOTEL_DEMO_CONTRACT,
  HOTEL_DEMO_INTRO_HTML,
  HOTEL_DEMO_LISTING_HANDLE,
  HOTEL_DEMO_MINISTRY_LICENSE_REF,
  HOTEL_DEMO_REVIEW_CRITERIA,
  buildHotelDemoActivities,
} from '@/lib/hotel-detail-demo-content'
import { fetchListingReviewCriteriaSummarySafe } from '@/lib/listing-review-criteria'
import { applyHotelRoomDemoContent } from '@/lib/hotel-room-demo-content'
import {
  buildBoardTypeLabelsFromMessages,
  collectHotelHeaderBoardTypeLabels,
} from '@/lib/hotel-room-board-type'
import { parseHotelVitrinMeta } from '@/lib/hotel-vitrin-meta'
import HotelFAQSection, { AccordionFaqSection } from './HotelFAQSection'
import HotelFacilityAccordionSections from './HotelFacilityAccordionSections'
import { buildHotelFacilityAccordionContent } from '@/lib/hotel-facility-sections'
import HotelListingPromotionsSection from './HotelListingPromotionsSection'
import HotelListingActivitiesSection from './HotelListingActivitiesSection'
import HotelHighlightsSection from './HotelHighlightsSection'
import HotelImportantNotesSection from './HotelImportantNotesSection'
import HotelPropertyInfoGrid from './HotelPropertyInfoGrid'
import HotelRoomShowcase, { type HotelRoomShowcaseItem } from './HotelRoomShowcase'
import HotelListingMainShell from './HotelListingMainShell'
import VillaStayBookingShell from './VillaStayBookingShell'
import ListingAmenitiesSection from './ListingAmenitiesSection'
import ListingSleepingSection from './ListingSleepingSection'
import ListingPoolInfoSection from './ListingPoolInfoSection'
import { extraChargesHasContent, type ListingExtraChargesModel } from '@/lib/listing-extra-charges-model'
import ListingSeasonalPricingSection from './ListingSeasonalPricingSection'
import YachtCharterSpecsSection from './YachtCharterSpecsSection'
import { parseYachtCharterSpecs } from '@/lib/yacht-charter-specs'
import StayListingReservationCard from './StayListingReservationCard'
import StayListingMobileStickyBar from './StayListingMobileStickyBar'
import StayListingCalendarBookingBlock from './StayListingCalendarBookingBlock'
import { HotelStayBookingCalendar, HotelStayBookingSidebar } from './HotelStayBookingPanel'
import { normalizeHotelRoomOptions } from '@/lib/hotel-room-availability-public'
import ListingPriceInclusionsSection from './ListingPriceInclusionsSection'
import SectionHeader from './components/SectionHeader'
import { SectionHeading, SectionSubheading } from './components/SectionHeading'
import SocialProofBadge from '@/components/listing/SocialProofBadge'
import ListingDescriptionExpandable from '@/components/listing/ListingDescriptionExpandable'
import ListingPerksBadges from '@/components/listing/ListingPerksBadges'
import ReportListingButton from '@/components/listing/ReportListingButton'
import WhatsAppListingCTA from '@/components/WhatsAppListingCTA'
import SectionHost from './components/SectionHost'
import SectionListingReviews from './components/SectionListingReviews'
import SectionMap from './components/SectionMap'
import ListingDetailOurFeatures from './components/ListingDetailOurFeatures'
import SimilarListings from './components/SimilarListings'
import NearbyPlacesSection from '@/components/travel/NearbyPlacesSection'
import ListingNearbyPoisSection from '@/components/travel/ListingNearbyPoisSection'
import ListingServicePoisSection from '@/components/travel/ListingServicePoisSection'
import HotelListingDistancesSection from '@/components/travel/HotelListingDistancesSection'
import SectionMealPlans from '@/components/listing/SectionMealPlans'
import {
  buildListingAccommodationRuleLines,
  findAccommodationRuleText,
  formatListingCheckInOutLines,
} from '@/lib/listing-accommodation-rules'
import {
  siteCampaignsToPromotionCards,
  splitHotelValidCampaignsForListing,
} from '@/lib/hotel-valid-campaigns'
import { pickLocalized } from '@/lib/localized-text'
import { safeTrim, safeTrimOrNull } from '@/lib/safe-string'
import { normalizeStayLocationPin } from '@/lib/stay-location-display'
import { resolveListingPrepaymentPercent } from '@/lib/listing-prepayment'

function formatPrepaymentPercentForDisplay(raw: string): string {
  const n = parseFloat(raw.replace(',', '.'))
  if (Number.isNaN(n)) return raw.trim()
  return Number.isInteger(n) ? String(Math.round(n)) : String(n)
}

export async function generateStayListingMetadata({
  params,
}: {
  params: Promise<{ locale: string; handle: string }>
}): Promise<Metadata> {
  const { handle, locale } = await params
  const listing = await getStayListingByHandle(handle, locale)
  if (!listing) return { title: getMessages(locale).listing.detailPage.notFoundTitle }
  const plainDesc = listing.description ? stripHtml(listing.description) : listing.title
  const ogImage = buildListingOgImageUrl({ kind: 'stay', handle, locale })
  return {
    title: listing.title,
    description: plainDesc.slice(0, 160),
    openGraph: ogImage
      ? {
          title: listing.title,
          description: plainDesc.slice(0, 200),
          images: [{ url: ogImage, width: 1200, height: 630, alt: listing.title }],
        }
      : undefined,
    twitter: ogImage
      ? {
          card: 'summary_large_image',
          title: listing.title,
          description: plainDesc.slice(0, 200),
          images: [ogImage],
        }
      : undefined,
  }
}

export default async function StayListingDetailPageContent({
  params,
  linkBase,
}: {
  params: Promise<{ locale: string; handle: string }>
  linkBase: StayDetailLinkBase | string
}) {
  const { handle, locale } = await params
  const [calendarMonthsShown, sitePubApi] = await Promise.all([
    guessCalendarMonthsShownFromRequest(),
    getCachedSiteConfig(),
  ])
  const listing = await getStayListingByHandle(handle, locale)
  if (!listing?.id) {
    const browse =
      linkBase === HOLIDAY_HOME_DETAIL_PATH
        ? '/tatil-evleri/all'
        : linkBase === STAY_DETAIL_YACHT_PATH
          ? '/yat-kiralama/all'
          : '/oteller/all'
    return redirect(await vitrinHref(locale, browse))
  }

  // `listingVertical` kayıtta varsa onu kullan; demo veride veya eski kayıtlarda
  // boş kalabildiği için URL `linkBase`'inden de güvenli fallback üretiyoruz.
  // Bu sayede otele özel bileşenler (HotelRoomShowcase / HotelPropertyInfoGrid)
  // canonical /otel sayfasında her durumda görünür; yat ve tatil evi yine kendi
  // dallarında kalır.
  const verticalFromListing = normalizeCatalogVertical(listing.listingVertical)
  const verticalFromUrl =
    linkBase === HOLIDAY_HOME_DETAIL_PATH
      ? 'holiday_home'
      : linkBase === STAY_DETAIL_YACHT_PATH
        ? 'yacht_charter'
        : linkBase === STAY_DETAIL_HOTEL_PATH
          ? 'hotel'
          : undefined
  const vertical = verticalFromListing ?? verticalFromUrl
  const canonicalPath = stayDetailPathForVertical(vertical)
  if (linkBase !== canonicalPath) {
    redirect(await vitrinHref(locale, `${canonicalPath}/${handle}`))
  }

  const catalogListingId = await resolvePublishedListingIdForStayPage(handle, locale)
  const localeLang = locale.split('-')[0] ?? 'tr'
  const catalogAccommodationRules =
    catalogListingId != null ? await getPublicListingAccommodationRules(catalogListingId) : null

  let listingContractHref: string | null = null
  let listingContractBody: { title: string; bodyHtml: string } | null = null
  if (catalogListingId) {
    const pubContract = await fetchPublicListingContractSafe(catalogListingId, locale)
    if (pubContract?.contract_id) {
      listingContractBody = {
        title: pubContract.title,
        bodyHtml: sanitizeRichCmsHtml(pubContract.body_text),
      }
      listingContractHref = await vitrinHref(locale, `${canonicalPath}/${handle}/sozlesme`)
    }
  }
  if (
    vertical === 'hotel' &&
    handle === HOTEL_DEMO_LISTING_HANDLE &&
    !listingContractBody
  ) {
    listingContractBody = {
      title: HOTEL_DEMO_CONTRACT.title,
      bodyHtml: sanitizeRichCmsHtml(HOTEL_DEMO_CONTRACT.body_text),
    }
    listingContractHref = await vitrinHref(locale, `${canonicalPath}/${handle}/sozlesme`)
  }

  const mealPlans = await getPublicMealPlans(catalogListingId ?? listing.id)
  const hotelPromotions =
    vertical === 'hotel'
      ? await getPublicHotelPromotions(catalogListingId ?? listing.id)
      : []
  const availabilityCalendarDays = await fetchPublicListingAvailabilityDaysSafe(catalogListingId)
  const listingBedrooms =
    isStayRentalCategory(vertical) && catalogListingId
      ? await fetchPublicListingBedroomsSafe(catalogListingId)
      : []
  const yachtCharterSpecs =
    vertical === 'yacht_charter' && catalogListingId
      ? parseYachtCharterSpecs(
          await fetchPublicVerticalYachtSafe(catalogListingId),
          await fetchPublicVerticalMetaSafe(catalogListingId, 'yacht_extra'),
        )
      : null
  const [rawNearbyPois, servicePois] = await Promise.all([
    getListingNearbyPois(listing.id),
    getComputedServicePois(listing.id),
  ])
  const blogSlugMap = await getBlogSlugsByTitles(rawNearbyPois.map((p) => p.title))
  const nearbyPois = rawNearbyPois.map((p) => ({
    ...p,
    blog_slug: blogSlugMap[p.title] ?? p.blog_slug,
  }))
  const regionSlugForPlaces =
    regionBrowseSlugFromLocationPin(listing.city) ?? regionPlacesSlugFromCity(listing.city)
  const regionPlacesInitialData = await resolveRegionPlacesForListingPage(
    regionSlugForPlaces,
    locale,
    shortRegionLabelFromLocationPin(listing.city) || listing.city || undefined,
  )
  const isHotelDemoListing = vertical === 'hotel' && handle === HOTEL_DEMO_LISTING_HANDLE
  const hotelVitrinMeta =
    vertical === 'hotel' && catalogListingId
      ? parseHotelVitrinMeta(await getVerticalMeta(catalogListingId, 'hotel').catch(() => ({})))
      : null
  const fetchedHotelActivities =
    vertical === 'hotel'
      ? await getPublicHotelActivities(catalogListingId ?? listing.id)
      : []
  const hotelActivities =
    vertical === 'hotel'
      ? fetchedHotelActivities.length > 0
        ? fetchedHotelActivities
        : isHotelDemoListing
          ? buildHotelDemoActivities()
          : []
      : []
  const hotelListingDistances =
    vertical === 'hotel'
      ? buildHotelListingDistanceColumns({
          nearbyPois,
          servicePois,
          useDemoFallback: isHotelDemoListing,
        })
      : null
  const stayListingDistances =
    vertical !== 'hotel' && isStayRentalCategory(vertical)
      ? buildHotelListingDistanceColumns({ nearbyPois, servicePois })
      : null
  const listingDistanceColumns = hotelListingDistances ?? stayListingDistances
  const hasListingDistanceColumns = Boolean(
    listingDistanceColumns &&
      (listingDistanceColumns.historic.length > 0 ||
        listingDistanceColumns.surroundings.length > 0 ||
        listingDistanceColumns.transport.length > 0),
  )
  const hasServicePoiDistances =
    servicePois.amenities.length > 0 || servicePois.transport.length > 0
  const fetchedReviewCriteriaSummary = await fetchListingReviewCriteriaSummarySafe(listing.id)
  const listingReviewCriteriaSummary =
    fetchedReviewCriteriaSummary ??
    (vertical === 'hotel' && isHotelDemoListing ? HOTEL_DEMO_REVIEW_CRITERIA : null)
  const useHotelReviewLayout = vertical === 'hotel' || isStayRentalCategory(vertical)

  // listing_attributes (admin EAV) → vitrin amenity listesi
  let amenityKeys: string[] = []
  let amenityLabels: Record<string, string> = {}
  let amenityIcons: Record<string, string> = {}
  const attrs = await fetchPublicListingAttributesSafe(catalogListingId ?? listing.id)
  const amenityRows = buildVitrinAmenityRows(attrs.values, vertical, isAttributeValueTrue)
  amenityKeys = Array.from(new Set(amenityRows.map((a) => a.key)))
  amenityLabels = buildAttributeLabelMap(amenityRows)
  amenityIcons = attrs.icons
  if (vertical === 'hotel' && handle === HOTEL_DEMO_LISTING_HANDLE && amenityKeys.length === 0) {
    amenityKeys = HOTEL_DEMO_AMENITY_ROWS.map((row) => row.key)
  }

  const hotelValidCampaignsPayload =
    vertical === 'hotel' ? await fetchPublicHotelValidCampaigns({ next: { revalidate: 60 } }) : null
  const hotelValidCampaignSplit =
    hotelValidCampaignsPayload != null
      ? splitHotelValidCampaignsForListing(
          hotelValidCampaignsPayload,
          catalogListingId ?? listing.id,
        )
      : { general: [], listingScoped: [] }
  const hotelListingPromotionCards =
    vertical === 'hotel' ? hotelPromotions.filter((p) => p.is_active) : []

  // hotel_rooms (Tur3) — vitrin oda tablosunda demo verisi yerine gerçek odalar.
  // meta_json içindeki opsiyonel alanlar (beds, bed_type, size_m2, description,
  // amenities, image) Booking/ETStur tarzı kart görünümünde zenginleştirmek için
  // burada parse edilir. Şema esnek; alan yoksa ilgili satır kart üzerinde gizlenir.
  let realHotelRooms: HotelRoomShowcaseItem[] = []
  let hotelBookingRooms = normalizeHotelRoomOptions([])
  try {
    const r = await getPublicHotelRooms(catalogListingId ?? listing.id)
    hotelBookingRooms = normalizeHotelRoomOptions(Array.isArray(r.rooms) ? r.rooms : [])
    realHotelRooms = hotelBookingRooms.map((row): HotelRoomShowcaseItem => {
      const cap = row.capacity ? Number.parseInt(row.capacity, 10) : null
      let meta: Record<string, unknown> = {}
      try {
        const parsed = JSON.parse(row.meta_json || '{}')
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
          meta = parsed as Record<string, unknown>
        }
      } catch {
        /* meta_json geçersiz → sadece temel alanlarla göster */
      }
      const pickNumber = (k: string): number | null => {
        const v = meta[k]
        if (typeof v === 'number' && Number.isFinite(v)) return v
        if (typeof v === 'string' && v.trim()) {
          const n = Number.parseFloat(v.replace(',', '.'))
          return Number.isFinite(n) ? n : null
        }
        return null
      }
      const pickString = (k: string): string | null => {
        const v = meta[k]
        return typeof v === 'string' && v.trim() ? v.trim() : null
      }
      const pickStringArr = (k: string): string[] | null => {
        const v = meta[k]
        if (Array.isArray(v)) {
          const arr = v
            .filter((x): x is string => typeof x === 'string' && x.trim().length > 0)
            .map((x) => x.trim())
          return arr.length > 0 ? arr : null
        }
        if (v && typeof v === 'object') {
          const keys = Object.entries(v as Record<string, unknown>)
            .filter(([, val]) => val === true || val === 'true' || val === 1)
            .map(([k2]) => k2)
          return keys.length > 0 ? keys : null
        }
        return null
      }
      const heroImage = pickString('image') ?? pickString('hero_image')
      const galleryImages = pickStringArr('images')
      return {
        id: row.id,
        name: row.name,
        capacity: Number.isFinite(cap) ? (cap as number) : null,
        boardType: row.board_type,
        beds: pickNumber('beds'),
        bedType: pickString('bed_type') ?? pickString('bedType'),
        sizeM2:
          pickNumber('size_m2') ?? pickNumber('size_sqm') ?? pickNumber('size'),
        description: pickString('description') ?? pickString('summary'),
        amenities: pickStringArr('amenities'),
        paidAmenities: pickStringArr('paid_amenities'),
        roomScore: pickNumber('room_score') ?? pickNumber('score'),
        image: heroImage,
        images: galleryImages ?? (heroImage ? [heroImage] : null),
        unitCount: row.unit_count,
      }
    })
  } catch {
    /* hotel_rooms API yok */
  }
  if (vertical === 'hotel' && realHotelRooms.length > 0) {
    realHotelRooms = applyHotelRoomDemoContent(handle, realHotelRooms)
  }

  const {
    address,
    bathrooms,
    bedrooms,
    description,
    featuredImage,
    galleryImgs,
    listingCategory,
    map,
    maxGuests,
    price,
    priceAmount,
    priceCurrency,
    reviewCount,
    reviewStart,
    saleOff,
    discountPercent,
    title,
    host,
    beds,
  } = listing

  const isHolidayHome = vertical === 'holiday_home'
  const isYachtCharter = vertical === 'yacht_charter'
  const isStayRental = isStayRentalCategory(vertical)
  const priceLines =
    isStayRental && catalogListingId
      ? await getPublicListingPriceLines(catalogListingId, locale)
      : null
  const holidayHomePools = isHolidayHome ? (listing as TListingHolidayHome).pools : undefined
  const poolHeatingOption = isHolidayHome
    ? getPoolHeatingReservationOption(holidayHomePools, (priceCurrency ?? 'TRY').trim())
    : null

  const messages = getMessages(locale)
  const dp = messages.listing.detailPage
  const listingCurrencyUpper = (priceCurrency ?? 'TRY').trim().toUpperCase()
  const prepaymentDisplayPercent = resolveListingPrepaymentPercent(listing.prepaymentPercent)
  const prepaymentNoteText = messages.listing.detailHeader.prepaymentNote.replace(
    '{percent}',
    formatPrepaymentPercentForDisplay(String(prepaymentDisplayPercent)),
  )
  /** API `meal_plan_summary === 'both'` — ücret tablosunda yemekli / yemeksiz sütunları */
  const dualMealPricing = isStayRental && listing.mealPlanSummary === 'both'
  let holidayHomePriceRules: ListingPriceRuleRow[] = []
  let seasonalPricingRows: ReturnType<typeof buildSeasonalPricingTableRows> = []
  if (isStayRental) {
    const seasonalMsg = {
      defaultPeriod: messages.listing.seasonalPricing.defaultPeriod,
      rangeSep: messages.listing.seasonalPricing.rangeSep,
      rangeFromOpen: messages.listing.seasonalPricing.rangeFromOpen,
      rangeUntil: messages.listing.seasonalPricing.rangeUntil,
    }
    holidayHomePriceRules = catalogListingId ? await getPublicListingPriceRules(catalogListingId) : []
    seasonalPricingRows = buildSeasonalPricingTableRows(
      holidayHomePriceRules,
      locale,
      listingCurrencyUpper,
      seasonalMsg,
      { preferDualMealColumns: dualMealPricing },
    )
  }

  const minNightlyFromRules = minNightlyFromListingPriceRules(holidayHomePriceRules)
  const maxNightlyFromRules = isStayRental
    ? maxNightlyFromListingPriceRules(holidayHomePriceRules)
    : undefined

  const ruleNightlyRangeForQuote =
    isStayRental &&
    holidayHomeRulePriceRangeEnabled() &&
    minNightlyFromRules != null &&
    maxNightlyFromRules != null &&
    maxNightlyFromRules > minNightlyFromRules
      ? { min: minNightlyFromRules, max: maxNightlyFromRules }
      : undefined

  const damageDepositAmount =
    listing.firstChargeAmount != null &&
    Number.isFinite(listing.firstChargeAmount) &&
    listing.firstChargeAmount > 0
      ? listing.firstChargeAmount
      : undefined

  const rulesNightlyCandidate =
    minNightlyFromRules != null && Number.isFinite(minNightlyFromRules) && minNightlyFromRules > 0
      ? minNightlyFromRules
      : undefined

  /** Arama `price_from` yemek planı minimumu bazen depozito ile aynı yanlış kayıtla gelir — kuralları önceliklendir */
  const nightlyEscapesDeposit = (n: number | undefined): n is number =>
    n != null &&
    Number.isFinite(n) &&
    n > 0 &&
    !(damageDepositAmount != null && Math.abs(n - damageDepositAmount) < 0.01)

  const reservationPriceAmount = nightlyEscapesDeposit(priceAmount)
    ? priceAmount
    : nightlyEscapesDeposit(rulesNightlyCandidate)
      ? rulesNightlyCandidate
      : priceAmount != null && Number.isFinite(priceAmount) && priceAmount > 0
        ? priceAmount
        : rulesNightlyCandidate

  const ruleFallbackForQuote = isStayRental ? rulesNightlyCandidate : undefined
  const stayPriceRulesForQuote = isStayRental ? holidayHomePriceRules : undefined

  const seasonalExtraCharges: ListingExtraChargesModel | undefined = isStayRental
    ? {
        listingCurrency: listingCurrencyUpper,
        shortStay:
          listing.stayBookingRules?.minShortStayNights != null &&
          listing.stayBookingRules.minShortStayNights > 0 &&
          listing.stayBookingRules?.shortStayFeeAmount != null &&
          listing.stayBookingRules.shortStayFeeAmount > 0
            ? {
                minNights: listing.stayBookingRules.minShortStayNights,
                feeAmount: listing.stayBookingRules.shortStayFeeAmount,
              }
            : undefined,
        cleaningFee:
          listing.cleaningFeeAmount != null && listing.cleaningFeeAmount > 0
            ? { amount: listing.cleaningFeeAmount }
            : undefined,
        damageDeposit:
          damageDepositAmount != null && damageDepositAmount > 0
            ? { amount: damageDepositAmount }
            : undefined,
        customFees: listing.listingExtraFees,
        // prepaymentLine artık politikalar bölümünde tüm kategoriler için
        // tek noktada gösteriliyor (e2). Burada null bırakıyoruz ki tatil
        // evinde çift görünmesin.
        prepaymentLine: null,
      }
    : undefined

  const holidayHomePricingVisible =
    isStayRental &&
    (seasonalPricingRows.length > 0 || extraChargesHasContent(seasonalExtraCharges))

  const mergeHolidayMealsIntoPricing = mealPlans.length > 0 && holidayHomePricingVisible

  const stayThemeCategory: 'holiday_home' | 'yacht_charter' = isYachtCharter
    ? 'yacht_charter'
    : 'holiday_home'
  const stayThemeCodesAll = isStayRental ? parseHolidayThemeCodes(listing.themeCodes ?? []) : []
  const stayThemeCodes = stayThemeCodesAll.filter(
    (code) => !HOLIDAY_THEME_CODES_EXCLUDED_FROM_LISTING_CARDS.has(code),
  )
  let stayThemeHighlightLabels: Record<string, string> = {}
  if (isStayRental && stayThemeCodes.length > 0) {
    const themeLabelMap = await getHolidayThemeLabelMap(locale, stayThemeCategory)
    stayThemeHighlightLabels = Object.fromEntries(
      stayThemeCodes.map((code) => [
        code,
        themeLabelMap.get(code) ?? code.replace(/_/g, ' '),
      ]),
    )
  }
  const childrenPoolTypeLabel =
    (messages.listing.poolInfo?.types as Record<string, string> | undefined)?.children_pool ??
    'Çocuk Havuzu'
  const holidayHomePoolsDisplay = isHolidayHome
    ? applyChildFriendlyThemeToPools(
        holidayHomePools,
        stayThemeCodesAll,
        childrenPoolTypeLabel,
      ) ?? undefined
    : undefined
  const showHolidayPoolInfoDisplay = Boolean(
    holidayHomePoolsDisplay && hasAnyEnabledPool(holidayHomePoolsDisplay),
  )
  const hotelTypeCodeNorm = vertical === 'hotel' ? listing.hotelTypeCode?.trim() : ''
  const listingCategoryBadge =
    vertical === 'hotel' && hotelTypeCodeNorm
      ? (await listPublicThemeItems({ categoryCode: 'hotel', locale }))?.items?.find(
          (i) => i.code === hotelTypeCodeNorm,
        )?.label ?? hotelTypeCodeNorm
      : listingCategory
  const resolvedMinistryLicenseRef =
    safeTrimOrNull(listing.ministryLicenseRef) ??
    (vertical === 'hotel' && handle === HOTEL_DEMO_LISTING_HANDLE
      ? HOTEL_DEMO_MINISTRY_LICENSE_REF
      : null)
  const ministryLicenseLine = resolvedMinistryLicenseRef
    ? messages.listing.detailHeader.ministryLicense.replace('{ref}', resolvedMinistryLicenseRef)
    : null
  const hotelStarRating =
    vertical === 'hotel' && typeof (listing as { stars?: number }).stars === 'number'
      ? ((listing as { stars?: number }).stars ?? null)
      : null
  const hotelStarLine =
    hotelStarRating != null && hotelStarRating > 0
      ? interpolate(messages.listing.propertyInfo?.starsValue ?? '{count} yıldız', {
          count: String(hotelStarRating),
        })
      : null
  const hotelBoardTypeLabels =
    vertical === 'hotel'
      ? collectHotelHeaderBoardTypeLabels({
          mealPlans,
          roomBoardTypes: hotelBookingRooms.map((room) => room.board_type),
          labels: buildBoardTypeLabelsFromMessages(
            (messages.listing.roomShowcase ?? {}) as Record<string, string>,
          ),
        })
      : []
  const hotelBoardTypesLine =
    hotelBoardTypeLabels.length > 0 ? hotelBoardTypeLabels.join(', ') : null
  const cancellationPolicyPlain = safeTrimOrNull(listing.cancellationPolicyText)
  // Ön-ödeme notu artık tüm kategorilerde gösterilebilir; tatil evi/villa
  // gibi tiplerde de prepaymentPercent set edilmişse misafire görünmesi
  // gerekiyor (e2). Mülk sahibi alanı boş bırakırsa prepaymentNoteText null
  // kalır → otomatik gizlenir.
  const hasPoliciesSection = Boolean(cancellationPolicyPlain || prepaymentNoteText?.trim())
  const hd = messages.listing.hotelDetail
  const hotelCampaignGroups =
    vertical === 'hotel'
      ? [
          {
            label: hd?.generalCampaignsLabel ?? 'Genel kampanyalar',
            promotions: siteCampaignsToPromotionCards(hotelValidCampaignSplit.general),
          },
          {
            label: hd?.hotelCampaignsLabel ?? 'Bu otelde geçerli',
            promotions: [
              ...siteCampaignsToPromotionCards(hotelValidCampaignSplit.listingScoped),
              ...hotelListingPromotionCards,
            ].sort((a, b) => a.sort_order - b.sort_order),
          },
        ]
      : []
  const hasHotelCampaigns = hotelCampaignGroups.some((group) => group.promotions.length > 0)
  const hotelFacilityContent =
    vertical === 'hotel'
      ? buildHotelFacilityAccordionContent({
          handle,
          amenityKeys,
          amenityLabels,
          campaignBadges: hotelCampaignGroups.flatMap((group) =>
            group.promotions.map((p) => p.title),
          ),
          generalTermsTitle: hd?.generalTermsTitle ?? 'Genel Şartlar',
          vitrinMeta: hotelVitrinMeta,
          useDemoFallback: isHotelDemoListing,
        })
      : null
  const hotelCheckInOut = formatListingCheckInOutLines(catalogAccommodationRules, {
    checkInRuleTemplate: dp.checkInRuleTemplate ?? dp.checkInRule,
    checkOutRuleTemplate: dp.checkOutRuleTemplate ?? dp.checkOutRule,
  })
  const hotelCheckInLine = hotelCheckInOut.checkInLine ?? dp.checkInRule
  const hotelCheckOutLine = hotelCheckInOut.checkOutLine ?? dp.checkOutRule
  const accommodationRuleLines = buildListingAccommodationRuleLines(catalogAccommodationRules, {
    localeLang,
    messages: {
      checkInRuleTemplate: dp.checkInRuleTemplate,
      checkOutRuleTemplate: dp.checkOutRuleTemplate,
      minStayRule: dp.minStayRule,
      minAdvanceRule: dp.minAdvanceRule,
      shortStayFeeRule: dp.shortStayFeeRule,
    },
    stayBookingRules: listing.stayBookingRules,
    listingCurrency: priceCurrency,
  })
  const hotelPetPolicyText = findAccommodationRuleText(
    catalogAccommodationRules,
    localeLang,
    /pet|evcil|hayvan|köpek|kedi/i,
  )
  const hotelHasBreakfast = mealPlans.some((m) =>
    ['bed_breakfast', 'half_board', 'full_board', 'all_inclusive'].includes(m.plan_code),
  )
  const hotelFaqItems =
    vertical === 'hotel'
      ? buildHotelFaqItems(
          {
            checkInLine: hotelCheckInLine,
            checkOutLine: hotelCheckOutLine,
            prepaymentNote: prepaymentNoteText,
            cancellationText: cancellationPolicyPlain,
            ministryLicenseRef: listing.ministryLicenseRef,
            hasBreakfastIncluded: hotelHasBreakfast,
            petPolicyText: hotelPetPolicyText,
            customFaqItems: hotelVitrinMeta?.faq_items ?? null,
          },
          messages.listing.faq as Record<string, string>,
        )
      : []
  const regionName =
    vertical === 'hotel' || isStayRental
      ? normalizeStayLocationPin(listing.city ?? listing.address) || null
      : null
  const holidayHomeLocationPin = regionName?.trim() ?? ''
  const breadcrumbRegionLabel = holidayHomeLocationPin
    ? holidayHomeLocationPin.split(',')[0]?.trim() ?? ''
    : ''
  const breadcrumbRegionSlug = holidayHomeLocationPin
    ? regionBrowseSlugFromLocationPin(holidayHomeLocationPin)
    : undefined

  const galleryImages = galleryUrlsForStayDetailHeader(featuredImage, galleryImgs)

  const reviews = (await getListingReviews(handle)).slice(0, 3)
  const categorySlug =
    vertical === 'holiday_home'
      ? 'tatil-evleri'
      : vertical === 'yacht_charter'
        ? 'yat-kiralama'
        : 'oteller'
  const similarRes = await fetchCategoryListings(categorySlug, {}, {}, locale)
  const otherStays = similarRes.listings.filter((l) => l.handle !== handle)
  const mapSimilar = (l: (typeof otherStays)[number]) => ({
    id: l.id,
    title: l.title,
    handle: l.handle,
    address: l.address ?? '',
    price: l.price ?? '',
    priceAmount: l.priceAmount,
    priceAmountMax: l.priceAmountMax,
    priceCurrency: l.priceCurrency,
    reviewStart: l.reviewStart ?? 0,
    reviewCount: l.reviewCount ?? 0,
    featuredImage: l.featuredImage ?? '',
    listingCategory: l.listingCategory ?? '',
    linkBase: stayDetailPathForVertical(normalizeCatalogVertical(l.listingVertical)),
    capacityLine: isStayRental
      ? stayRentalCapacitySummary(
          { maxGuests: l.maxGuests, bedrooms: l.bedrooms, bathrooms: l.bathrooms },
          messages.listing.capacitySpec,
          { useCabins: isYachtCharter, alwaysShow: true },
        )
      : undefined,
  })
  const similarListings = (isStayRental ? otherStays.slice(0, 4) : otherStays.slice(0, 8)).map(mapSimilar)
  const nearbyListings = isStayRental ? otherStays.slice(4, 8).map(mapSimilar) : []

  const siteConfig = mergeBrandingIntoEnvContact(getSitePublicConfigSync(), sitePubApi?.branding ?? null)
  const organizationName = siteConfig.orgName?.trim() || siteConfig.orgLegalName?.trim() || 'Travel'

  let detailJsonLd: Awaited<ReturnType<typeof buildStayListingDetailJsonLd>> | null = null
  try {
    detailJsonLd = await buildStayListingDetailJsonLd({
      locale,
      linkBase,
      organizationName,
      listing: {
        id: listing.id,
        title,
        description,
        handle,
        address,
        city: listing.city,
        featuredImage,
        galleryImgs,
        listingCategory,
        listingVertical: normalizeCatalogVertical(listing.listingVertical),
        map,
        maxGuests,
        bedrooms,
        bathrooms,
        beds,
        price,
        reviewCount,
        reviewStart,
        host,
      },
    })
  } catch {
    detailJsonLd = null
  }

  const handleSubmitForm = async (formData: FormData) => {
    'use server'
    redirect('/checkout')
  }

  // ── Sections ────────────────────────────────────────────────────────────────

  const categoryBrowseHref = await vitrinHref(
    locale,
    vertical === 'holiday_home'
      ? '/tatil-evleri/all'
      : vertical === 'yacht_charter'
        ? '/yat-kiralama/all'
        : '/oteller/all',
  )
  const homeHref = await vitrinHref(locale, '/')
  const breadcrumbRegionHref =
    isStayRental && breadcrumbRegionSlug && breadcrumbRegionLabel
      ? await vitrinHref(locale, `/tatil-evleri/${breadcrumbRegionSlug}`)
      : null

  const breadcrumbCategoryLabel =
    vertical === 'hotel'
      ? messages.listing.browseCategory.hotel
      : vertical === 'holiday_home'
        ? messages.listing.browseCategory.holiday_home
        : vertical === 'yacht_charter'
          ? messages.listing.browseCategory.yacht_charter
          : listingCategory

  const renderBreadcrumb = () => (
    <nav className="mb-4 flex items-center gap-1.5 text-sm text-neutral-500 dark:text-neutral-400">
      <Link href={homeHref} className="transition-colors hover:text-primary-500">
        {messages.listing.breadcrumb.home}
      </Link>
      <HugeiconsIcon icon={ArrowRight02Icon} className="h-4 w-4 shrink-0" strokeWidth={1.75} />
      <Link href={categoryBrowseHref} className="transition-colors hover:text-primary-500">
        {breadcrumbCategoryLabel}
      </Link>
      {breadcrumbRegionLabel ? (
        <>
          <HugeiconsIcon icon={ArrowRight02Icon} className="h-4 w-4 shrink-0" strokeWidth={1.75} />
          {breadcrumbRegionHref ? (
            <Link
              href={breadcrumbRegionHref}
              className="line-clamp-2 min-w-0 max-w-[min(100%,14rem)] transition-colors hover:text-primary-500 sm:max-w-[18rem]"
            >
              {breadcrumbRegionLabel}
            </Link>
          ) : (
            <span className="line-clamp-2 min-w-0 max-w-[min(100%,14rem)] text-neutral-600 dark:text-neutral-400 sm:max-w-[18rem]">
              {breadcrumbRegionLabel}
            </span>
          )}
        </>
      ) : null}
      <HugeiconsIcon icon={ArrowRight02Icon} className="h-4 w-4 shrink-0" strokeWidth={1.75} />
      <span className="line-clamp-1 font-medium text-neutral-900 dark:text-neutral-200">{title}</span>
    </nav>
  )

  const galleryForShare = galleryUrlsForStayDetailHeader(featuredImage, galleryImgs).filter((u) => u.trim())

  const renderSectionHeader = () => (
    <SectionHeader
      address={address ?? ''}
      listingCategory={listingCategoryBadge ?? ''}
      reviewCount={reviewCount ?? 0}
      reviewStart={reviewStart ?? 0}
      title={title}
      listingId={listing.id}
      shareGallery={{ galleryUrls: galleryForShare, listingTitle: title, locale }}
      regionName={regionName}
      licenseLine={vertical === 'hotel' || isHolidayHome ? ministryLicenseLine : undefined}
      hotelStarRating={vertical === 'hotel' ? hotelStarRating : undefined}
      hotelStarLine={vertical === 'hotel' ? hotelStarLine : undefined}
      hotelBoardTypesLine={vertical === 'hotel' ? hotelBoardTypesLine : undefined}
    >
      {isStayRental ? (
        <>
          <div className="flex items-center gap-x-3">
            <HugeiconsIcon icon={UserMultiple02Icon} className="mb-0.5 size-5" strokeWidth={1.75} />
            <span>
              {maxGuests} {messages.listing.capacitySpec.guests}
            </span>
          </div>
          <div className="flex items-center gap-x-3">
            <MeetingRoomIcon className="mb-0.5 size-5" />
            <span>
              {bedrooms}{' '}
              {isYachtCharter ? messages.listing.capacitySpec.cabins : messages.listing.capacitySpec.rooms}
            </span>
          </div>
          {bathrooms != null && bathrooms > 0 ? (
            <div className="flex items-center gap-x-3">
              <Bathtub02Icon className="mb-0.5 size-5" />
              <span>
                {bathrooms} {messages.listing.capacitySpec.bathrooms}
              </span>
            </div>
          ) : null}
        </>
      ) : vertical === 'hotel' ? null : (
        <>
          <div className="flex items-center gap-x-3">
            <HugeiconsIcon icon={UserMultiple02Icon} className="mb-0.5 size-5" strokeWidth={1.75} />
            <span>
              {maxGuests} {messages.listing.capacitySpec.guests}
            </span>
          </div>
          <div className="flex items-center gap-x-3">
            <BedSingle01Icon className="mb-0.5 size-5" />
            <span>
              {beds} {messages.listing.capacitySpec.beds}
            </span>
          </div>
          <div className="flex items-center gap-x-3">
            <Bathtub02Icon className="mb-0.5 size-5" />
            <span>
              {bathrooms} {messages.listing.capacitySpec.bathrooms}
            </span>
          </div>
          <div className="flex items-center gap-x-3">
            <MeetingRoomIcon className="mb-0.5 size-5" />
            <span>
              {bedrooms} {messages.listing.capacitySpec.rooms}
            </span>
          </div>
        </>
      )}
    </SectionHeader>
  )

  const renderHotelCampaignsSection = () => {
    if (vertical !== 'hotel' || !hasHotelCampaigns) return null
    return (
      <HotelListingPromotionsSection
        locale={locale}
        title={
          hotelValidCampaignsPayload != null
            ? pickLocalized(
                hotelValidCampaignsPayload.sectionTitle,
                localeLang,
                hd?.promotionsTitle ?? "Otel'de Geçerli Kampanyalar",
              )
            : (hd?.promotionsTitle ?? "Otel'de Geçerli Kampanyalar")
        }
        groups={hotelCampaignGroups}
      />
    )
  }

  const renderHotelActivitiesSection = () => {
    if (vertical !== 'hotel' || hotelActivities.length === 0) return null
    return (
      <HotelListingActivitiesSection
        locale={locale}
        title={hd?.activitiesTitle ?? messages.listing.hotelDetail.activitiesTitle}
        activities={hotelActivities}
      />
    )
  }

  const renderSectionDescription = () => {
    let introHtml = sanitizeRichCmsHtml(description ?? '')
    if (vertical === 'hotel' && handle === HOTEL_DEMO_LISTING_HANDLE && !stripHtml(introHtml).trim()) {
      introHtml = HOTEL_DEMO_INTRO_HTML
    }
    if (!stripHtml(introHtml).trim()) return null

    const heading =
      vertical === 'hotel'
        ? (hd?.aboutTitle ?? 'Otel tanıtımı')
        : isHolidayHome
          ? dp.aboutVacationHome
          : isYachtCharter
            ? dp.aboutYachtCharter
            : dp.aboutStay

    return (
      <div id="stay-section-about" className="listingSection__wrap scroll-mt-28">
        <SectionHeading>{heading}</SectionHeading>
        <Divider className="w-14!" />
        <ListingDescriptionExpandable locale={locale} html={introHtml} />
      </div>
    )
  }

  const renderSectionRoomTypes = () => {
    if (realHotelRooms.length === 0) return null
    const roomTypes = realHotelRooms.map((r) => ({
      name: r.name,
      guests: r.capacity ?? 2,
      beds: 1,
      // Fiyat oda bazlı henüz vitrin paritesinde değil; rezervasyon kartından akar.
      price: '—',
      weekend: r.boardType ? r.boardType : '—',
    }))
    return (
      <div className="listingSection__wrap">
        <div>
          <SectionHeading>{dp.roomTypesTitle}</SectionHeading>
          <SectionSubheading>{dp.roomTypesSubtitle}</SectionSubheading>
        </div>
        <Divider className="w-14!" />
        <div className="overflow-x-auto">
          <table className="w-full min-w-[480px] text-sm">
            <thead>
              <tr className="border-b border-neutral-200 dark:border-neutral-700">
                <th className="pb-3 text-left font-semibold text-neutral-900 dark:text-white">{dp.roomColType}</th>
                <th className="pb-3 text-center font-semibold text-neutral-900 dark:text-white">{dp.roomColCapacity}</th>
                <th className="pb-3 text-center font-semibold text-neutral-900 dark:text-white">{dp.roomColBed}</th>
                <th className="pb-3 text-right font-semibold text-neutral-900 dark:text-white">{dp.roomColWeekday}</th>
                <th className="pb-3 text-right font-semibold text-neutral-900 dark:text-white">{dp.roomColWeekend}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
              {roomTypes.map((room, i) => (
                <tr key={i} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors">
                  <td className="py-3.5 font-medium text-neutral-900 dark:text-white">{room.name}</td>
                  <td className="py-3.5 text-center text-neutral-600 dark:text-neutral-400">
                    <div className="flex items-center justify-center gap-1">
                      <HugeiconsIcon icon={UserMultiple02Icon} className="h-4 w-4" strokeWidth={1.75} />
                      {interpolate(dp.guestsShort, { count: String(room.guests) })}
                    </div>
                  </td>
                  <td className="py-3.5 text-center text-neutral-600 dark:text-neutral-400">
                    <div className="flex items-center justify-center gap-1">
                      <BedSingle01Icon className="h-4 w-4" />
                      {room.beds}
                    </div>
                  </td>
                  <td className="py-3.5 text-right font-semibold text-primary-600">{room.price}</td>
                  <td className="py-3.5 text-right font-semibold text-primary-600">{room.weekend}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-2 text-xs text-neutral-400 dark:text-neutral-500">{dp.roomRatesFootnote}</div>
      </div>
    )
  }

  const renderSectionPriceRates = () => null

  const renderSectionRules = () => {
    if (vertical === 'hotel') return null
    const contractHtml = listingContractBody?.bodyHtml?.trim()
    if (accommodationRuleLines.length === 0 && !contractHtml) return null
    const pi = messages.listing.propertyInfo ?? {}
    return (
      <div id="stay-section-rules" className="listingSection__wrap scroll-mt-28">
        <div>
          <SectionHeading>{dp.rulesTitle}</SectionHeading>
          <SectionSubheading>{dp.rulesSubtitle}</SectionSubheading>
        </div>
        <Divider className="w-14!" />
        {accommodationRuleLines.length > 0 ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {accommodationRuleLines.map((rule, i) => (
              <div key={i} className="flex items-start gap-2.5 text-sm text-neutral-700 dark:text-neutral-300">
                {rule.type === 'ok' ? (
                  <HugeiconsIcon
                    icon={CheckmarkCircle01Icon}
                    className="mt-0.5 h-4 w-4 shrink-0 text-green-500"
                    strokeWidth={1.75}
                  />
                ) : (
                  <HugeiconsIcon
                    icon={AlertCircleIcon}
                    className="mt-0.5 h-4 w-4 shrink-0 text-orange-400"
                    strokeWidth={1.75}
                  />
                )}
                <span>{rule.text}</span>
              </div>
            ))}
          </div>
        ) : null}
        {contractHtml ? (
          <div
            className={clsx(
              accommodationRuleLines.length > 0 &&
                'mt-6 border-t border-neutral-100 pt-6 dark:border-neutral-800',
            )}
          >
            <h3 className="text-sm font-semibold text-neutral-900 dark:text-white">
              {listingContractBody?.title?.trim() ||
                pi.contractSectionTitle ||
                messages.listing.policies.contractLink}
            </h3>
            <div
              className="prose prose-sm mt-3 max-w-none leading-relaxed text-neutral-800 dark:prose-invert dark:text-neutral-200"
              dangerouslySetInnerHTML={{ __html: contractHtml }}
            />
            {listingContractHref ? (
              <p className="mt-4">
                <Link href={listingContractHref} className="text-sm text-link-inline">
                  {pi.contractFullLink ?? messages.listing.policies.contractLink}
                </Link>
              </p>
            ) : null}
          </div>
        ) : null}
      </div>
    )
  }

  const renderSectionPolicies = () => {
    if (vertical === 'hotel' || !hasPoliciesSection) return null
    return (
      <div id="stay-section-policies" className="listingSection__wrap scroll-mt-28">
        <SectionHeading>{messages.listing.policies.title}</SectionHeading>
        <Divider className="w-14!" />
        <div className="flex flex-col gap-4 text-sm leading-relaxed text-neutral-700 dark:text-neutral-300">
          {prepaymentNoteText?.trim() ? (
            <p className="text-neutral-700 dark:text-neutral-300">{prepaymentNoteText.trim()}</p>
          ) : null}
          {cancellationPolicyPlain ? (
            <p>
              <span className="font-medium text-neutral-900 dark:text-neutral-200">
                {messages.listing.policies.cancellationHeading}:
              </span>{' '}
              {cancellationPolicyPlain}
            </p>
          ) : null}
        </div>
      </div>
    )
  }

  const stayListingId = catalogListingId ?? listing.id
  const hasHotelRoomBooking = vertical === 'hotel' && hotelBookingRooms.length > 0
  const hotelBookingQuoteProps = {
    mealPlans,
    price: price ?? '',
    priceAmount: reservationPriceAmount,
    priceCurrency,
    saleOff,
    discountPercent,
    stayBookingRules: listing.stayBookingRules,
    cleaningFeeAmount: listing.cleaningFeeAmount,
    damageDepositAmount,
    ruleFallbackNightly: ruleFallbackForQuote,
    ruleNightlyRange: ruleNightlyRangeForQuote,
  }

  const renderSidebarPriceAndForm = () =>
    hasHotelRoomBooking ? (
      <HotelStayBookingSidebar
        locale={locale}
        listingId={stayListingId}
        rooms={hotelBookingRooms}
        mealPlans={mealPlans}
        price={price ?? ''}
        priceAmount={reservationPriceAmount}
        priceCurrency={priceCurrency}
        saleOff={saleOff}
        discountPercent={discountPercent}
        stayBookingRules={listing.stayBookingRules}
        cleaningFeeAmount={listing.cleaningFeeAmount}
        damageDepositAmount={damageDepositAmount}
        ruleFallbackNightly={ruleFallbackForQuote}
        ruleNightlyRange={ruleNightlyRangeForQuote}
      />
    ) : (
      <StayListingReservationCard
        locale={locale}
        isStayRental={isStayRental}
        mealPlans={mealPlans}
        price={price ?? ''}
        priceAmount={reservationPriceAmount}
        priceCurrency={priceCurrency}
        saleOff={saleOff}
        discountPercent={discountPercent}
        handleSubmitForm={handleSubmitForm}
        poolHeating={poolHeatingOption}
        stayBookingRules={listing.stayBookingRules}
        cleaningFeeAmount={listing.cleaningFeeAmount}
        damageDepositAmount={damageDepositAmount}
        ruleFallbackNightly={ruleFallbackForQuote}
        ruleNightlyRange={ruleNightlyRangeForQuote}
        listingId={stayListingId}
        priceRules={stayPriceRulesForQuote}
      />
    )

  const perksBadges = (
    <ListingPerksBadges
      listingId={listing.id}
      basePrice={typeof reservationPriceAmount === 'number' ? reservationPriceAmount : undefined}
      currencySymbol={priceCurrency === 'USD' ? '$' : priceCurrency === 'EUR' ? '€' : '₺'}
      hideInstantBook
      className="px-1"
    />
  )

  const socialProof = <SocialProofBadge listingId={listing.id} className="px-1" />

  const renderListingLocationSection = () => (
    <div id="stay-section-location" className="scroll-mt-28 space-y-5">
      <SectionMap locale={locale} lat={map?.lat} lng={map?.lng} address={address} heading={dp.location} />
      {hasListingDistanceColumns && listingDistanceColumns ? (
        <HotelListingDistancesSection
          locale={locale}
          historicPlaces={listingDistanceColumns.historic}
          surroundings={listingDistanceColumns.surroundings}
          transport={listingDistanceColumns.transport}
        />
      ) : hasServicePoiDistances && isStayRental ? (
        <ListingServicePoisSection
          locale={locale}
          amenities={servicePois.amenities}
          transport={servicePois.transport}
          variant="embedded"
        />
      ) : null}
    </div>
  )

  const renderCalendarBlock = () => (
    <div id="stay-section-calendar" className="scroll-mt-28">
      {hasHotelRoomBooking ? (
        <HotelStayBookingCalendar
          locale={locale}
          listingId={stayListingId}
          rooms={hotelBookingRooms}
          initialMonthsShown={calendarMonthsShown}
          stayBookingRules={listing.stayBookingRules}
          mealPlans={mealPlans}
          price={price ?? ''}
          priceAmount={reservationPriceAmount}
          priceCurrency={priceCurrency}
          saleOff={saleOff}
          discountPercent={discountPercent}
          cleaningFeeAmount={listing.cleaningFeeAmount}
          damageDepositAmount={damageDepositAmount}
          ruleFallbackNightly={ruleFallbackForQuote}
          ruleNightlyRange={ruleNightlyRangeForQuote}
        />
      ) : (
        <StayListingCalendarBookingBlock
          locale={locale}
          listingId={stayListingId}
          initialDays={availabilityCalendarDays}
          initialMonthsShown={calendarMonthsShown}
          stayBookingRules={listing.stayBookingRules}
          mealPlans={mealPlans}
          price={price ?? ''}
          priceAmount={reservationPriceAmount}
          priceCurrency={priceCurrency}
          saleOff={saleOff}
          discountPercent={discountPercent}
          poolHeating={poolHeatingOption}
          isStayRental={isStayRental}
          cleaningFeeAmount={listing.cleaningFeeAmount}
          damageDepositAmount={damageDepositAmount}
          ruleFallbackNightly={ruleFallbackForQuote}
          ruleNightlyRange={ruleNightlyRangeForQuote}
          priceRules={stayPriceRulesForQuote}
        />
      )}
    </div>
  )

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div>
      {detailJsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(detailJsonLd) }}
        />
      )}
      {/* Galeri — tatil evi: büyük görsel + 2×2 ızgara (grid1) */}
      <div
        className={clsx(
          isStayRental && 'overflow-hidden rounded-2xl sm:rounded-3xl ring-1 ring-black/5 dark:ring-white/10',
        )}
      >
        <HeaderGallery images={galleryImages} gridType="grid1" />
      </div>

      {/* BREADCRUMB — galeri altı ile ana içerik arası tek ritim */}
      <div className="mt-4">
        {renderBreadcrumb()}
      </div>

      <VillaStayBookingShell enabled={isStayRental && !hasHotelRoomBooking}>
      {/* MAIN */}
      <HotelListingMainShell
        enabled={hasHotelRoomBooking}
        listingId={stayListingId}
        rooms={hotelBookingRooms}
        activities={hotelActivities}
        quoteProps={hotelBookingQuoteProps}
      >
      <main className="relative z-[1] flex flex-col gap-6 lg:flex-row lg:items-start xl:gap-8">
        {/* LEFT COLUMN */}
        <div className="flex min-w-0 w-full flex-col gap-y-5 lg:w-3/5 xl:w-[62%] xl:gap-y-7">
          {renderSectionHeader()}
          {renderHotelCampaignsSection()}
          {renderHotelActivitiesSection()}
          {perksBadges}
          {socialProof}
          {vertical === 'hotel' ? (
            <>
              {renderSectionDescription()}
              {realHotelRooms.length > 0 ? (
                <div id="stay-section-rooms" className="scroll-mt-28">
                  <HotelRoomShowcase
                    locale={locale}
                    rooms={realHotelRooms}
                    bookingRooms={hotelBookingRooms}
                    initialCalendarMonthsShown={calendarMonthsShown}
                  />
                </div>
              ) : null}
              {hotelFacilityContent ? (
                <HotelFacilityAccordionSections content={hotelFacilityContent} />
              ) : null}
              <HotelPropertyInfoGrid
                locale={locale}
                source={{
                  checkInLine: hotelCheckInLine,
                  checkOutLine: hotelCheckOutLine,
                  starRating:
                    typeof (listing as { stars?: number }).stars === 'number'
                      ? ((listing as { stars?: number }).stars ?? null)
                      : null,
                  hasBreakfast: hotelHasBreakfast,
                  prepaymentLine: prepaymentNoteText?.trim() ?? null,
                }}
                contract={
                  listingContractBody
                    ? {
                        title: listingContractBody.title,
                        bodyHtml: listingContractBody.bodyHtml,
                        fullPageHref: listingContractHref,
                      }
                    : null
                }
              />
              {mealPlans.length > 0 && !mergeHolidayMealsIntoPricing && !mealPlans.every((m) => m.plan_code === 'room_only') ? (
                <div id="stay-section-meal-plans" className="scroll-mt-28">
                  <SectionMealPlans
                    mealPlans={mealPlans}
                    locale={locale}
                    holidayHome={false}
                    maxGuests={maxGuests}
                  />
                </div>
              ) : null}
              {hotelFaqItems.length > 0 ? (
                <div id="stay-section-faq" className="scroll-mt-28">
                  <HotelFAQSection
                    locale={locale}
                    source={{
                      checkInLine: hotelCheckInLine,
                      checkOutLine: hotelCheckOutLine,
                      prepaymentNote: prepaymentNoteText,
                      cancellationText: cancellationPolicyPlain,
                      ministryLicenseRef: listing.ministryLicenseRef,
                      hasBreakfastIncluded: hotelHasBreakfast,
                      petPolicyText: hotelPetPolicyText,
                    }}
                  />
                </div>
              ) : null}
              <HotelImportantNotesSection
                locale={locale}
                ruleLines={accommodationRuleLines}
                ministryLicenseLine={null}
                prepaymentNoteText={prepaymentNoteText}
                listingContractHref={null}
                cancellationPolicyPlain={cancellationPolicyPlain}
              />
            </>
          ) : (
            <>
          {isStayRental && stayThemeCodes.length >= 2 ? (
            <HotelHighlightsSection
              locale={locale}
              amenityKeys={stayThemeCodes}
              customLabels={stayThemeHighlightLabels}
              variant={isYachtCharter ? 'yacht_charter' : 'holiday_home'}
              minToShow={2}
            />
          ) : null}
          {renderSectionDescription()}
          {isYachtCharter && yachtCharterSpecs ? (
            <YachtCharterSpecsSection
              locale={locale}
              specs={{ ...yachtCharterSpecs, includes: [], excludes: [] }}
            />
          ) : null}
          {(amenityKeys.length > 0 || showHolidayPoolInfoDisplay) && (
            <div id="stay-section-amenities" className="scroll-mt-28">
              {amenityKeys.length > 0 ? (
                <ListingAmenitiesSection
                  locale={locale}
                  variant={isStayRental ? 'villa' : 'hotel'}
                  customSelectedIds={amenityKeys}
                  customLabels={amenityLabels}
                  customIcons={amenityIcons}
                  footer={
                    showHolidayPoolInfoDisplay ? (
                      <ListingPoolInfoSection
                        locale={locale}
                        pools={holidayHomePoolsDisplay}
                        demo={Boolean((listing as TListingHolidayHome).poolsDemo)}
                        variant="embedded"
                      />
                    ) : null
                  }
                />
              ) : (
                <ListingPoolInfoSection
                  locale={locale}
                  pools={holidayHomePoolsDisplay}
                  demo={Boolean((listing as TListingHolidayHome).poolsDemo)}
                />
              )}
            </div>
          )}
          {isStayRental && listingBedrooms.length > 0 ? (
            <div id="stay-section-bedrooms" className="scroll-mt-28">
              <ListingSleepingSection locale={locale} bedrooms={listingBedrooms} />
            </div>
          ) : null}
          {holidayHomePricingVisible && (
            <div id="stay-section-pricing" className="scroll-mt-28">
            <ListingSeasonalPricingSection
              locale={locale}
              rows={seasonalPricingRows}
              demo={false}
              extraCharges={seasonalExtraCharges}
              dualMealPricing={dualMealPricing}
              holidayMeals={
                mergeHolidayMealsIntoPricing
                  ? {
                      plans: mealPlans,
                      maxGuests: maxGuests ?? null,
                      summary: listing.mealPlanSummary ?? null,
                    }
                  : undefined
              }
            />
            </div>
          )}
          {!isStayRental && renderSectionRoomTypes()}
          {mealPlans.length > 0 && !mergeHolidayMealsIntoPricing && !(isHolidayHome && mealPlans.every((m) => m.plan_code === 'room_only')) && (
            <div className="scroll-mt-28">
              <SectionMealPlans
                mealPlans={mealPlans}
                locale={locale}
                holidayHome={isHolidayHome}
                maxGuests={maxGuests}
              />
            </div>
          )}
          {renderCalendarBlock()}
          {isStayRental &&
          (() => {
            const apiIncluded = priceLines?.included ?? []
            const apiExcluded = priceLines?.excluded ?? []
            const metaIncluded =
              apiIncluded.length === 0 && yachtCharterSpecs?.includes.length
                ? yachtCharterSpecs.includes.map((label) => ({ label }))
                : []
            const metaExcluded =
              apiExcluded.length === 0 && yachtCharterSpecs?.excludes.length
                ? yachtCharterSpecs.excludes.map((label) => ({ label }))
                : []
            const included = apiIncluded.length > 0 ? apiIncluded : metaIncluded
            const excluded = apiExcluded.length > 0 ? apiExcluded : metaExcluded
            if (included.length === 0 && excluded.length === 0) return null
            return (
              <ListingPriceInclusionsSection locale={locale} included={included} excluded={excluded} />
            )
          })()}
          {renderSectionRules()}
          {renderSectionPolicies()}
          {isStayRental &&
            Array.isArray(listing.holidayHomeFaqItems) &&
            listing.holidayHomeFaqItems.length > 0 && (
              <div id="stay-section-faq" className="scroll-mt-28">
              <AccordionFaqSection
                locale={locale}
                items={listing.holidayHomeFaqItems}
                title={messages.listing.faq.title}
                subtitle={
                  isYachtCharter
                    ? (messages.listing.faq.subtitleYachtCharter ?? messages.listing.faq.subtitle)
                    : (messages.listing.faq.subtitleHolidayHome ?? messages.listing.faq.subtitle)
                }
              />
              </div>
            )}
            </>
          )}
          <NearbyPlacesSection
            locale={locale}
            regionSlug={regionSlugForPlaces}
            initialData={regionPlacesInitialData}
            title={dp.nearbyPlaces}
            variant="flat"
            maxPlaces={12}
            overrideLat={map?.lat}
            overrideLng={map?.lng}
          />
          <ListingNearbyPoisSection pois={nearbyPois} locale={locale} />
        </div>

        {/* RIGHT SIDEBAR — lg:self-stretch: main lg:items-start iken sağ kolon sol kadar uzar, sticky takip eder */}
        <div className="flex grow flex-col overflow-visible lg:min-w-[min(100%,320px)] lg:max-w-md lg:self-stretch">
          <div
            id="stay-reservation-card"
            className="sticky top-1 overflow-visible scroll-mt-24"
          >
            {renderSidebarPriceAndForm()}
            <div className="mt-3 px-1">
              <WhatsAppListingCTA listingTitle={title} />
            </div>
          </div>
        </div>
      </main>
      </HotelListingMainShell>

      <div className="mt-8 w-full">{renderListingLocationSection()}</div>

      {(similarListings.length > 0 || (isStayRental && nearbyListings.length > 0)) && (
        <div className="mt-8 flex w-full flex-col gap-y-8">
          {similarListings.length > 0 ? (
            <SimilarListings
              listings={similarListings}
              title={dp.similarListings}
              perNightSuffix={dp.perNight}
            />
          ) : null}
          {isStayRental && nearbyListings.length > 0 ? (
            <SimilarListings
              listings={nearbyListings}
              title={dp.nearbyListings}
              perNightSuffix={dp.perNight}
            />
          ) : null}
        </div>
      )}

      <div className="mt-8">
        <ListingDetailOurFeatures locale={locale} city={listing.city} />
      </div>

      <Divider className="my-12" />

      {/* HOST + REVIEWS */}
      <div
        className={clsx(
          'flex flex-col gap-y-8 pb-16 lg:pb-24',
          (isStayRental || vertical === 'hotel') && 'max-lg:pb-28',
        )}
      >
        <div className="flex flex-col gap-6 lg:flex-row lg:gap-8">
          <div className="w-full lg:w-4/9 xl:w-1/3">
            <SectionHost {...host} locale={locale} labelVariant="listingOwner" />
          </div>
          <div className="w-full scroll-mt-28 lg:w-2/3" id="stay-section-reviews">
            <SectionListingReviews
              listingId={listing.id}
              reviewCount={reviewCount ?? 0}
              reviewStart={reviewStart ?? 0}
              criteriaSummary={listingReviewCriteriaSummary}
              reviewLayout={useHotelReviewLayout ? 'hotel' : 'default'}
            />
            <div className="mt-6 flex justify-center lg:justify-start">
              <ReportListingButton listingId={listing.id} />
            </div>
          </div>
        </div>
      </div>

      {isStayRental || vertical === 'hotel' ? (
        <StayListingMobileStickyBar
          locale={locale}
          listingId={stayListingId}
          mealPlans={mealPlans}
          price={price ?? ''}
          priceAmount={reservationPriceAmount}
          priceCurrency={priceCurrency}
          saleOff={saleOff}
          discountPercent={discountPercent}
          poolHeating={poolHeatingOption}
          stayBookingRules={listing.stayBookingRules}
          cleaningFeeAmount={listing.cleaningFeeAmount}
          damageDepositAmount={damageDepositAmount}
          ruleFallbackNightly={ruleFallbackForQuote}
          ruleNightlyRange={ruleNightlyRangeForQuote}
          priceRules={stayPriceRulesForQuote}
        />
      ) : null}
      </VillaStayBookingShell>
    </div>
  )
}
