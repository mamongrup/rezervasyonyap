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
import { getPoolHeatingReservationOption } from '@/lib/listing-pools'
import {
  regionBrowseSlugFromLocationPin,
  regionPlacesSlugFromCity,
} from '@/lib/region-places-slug'
import {
  HOLIDAY_HOME_DETAIL_PATH,
  STAY_DETAIL_HOTEL_PATH,
  STAY_DETAIL_YACHT_PATH,
  stayDetailPathForVertical,
  type StayDetailLinkBase,
} from '@/lib/listing-detail-routes'
import { holidayHomeCapacitySummary } from '@/lib/holiday-home-capacity-summary'
import { resolveHolidayThemeLabels } from '@/lib/holiday-theme-labels'
import { galleryUrlsForStayDetailHeader } from '@/lib/listing-gallery-hero-order'
import { buildStayListingDetailJsonLd } from '@/lib/seo/listing-detail-jsonld'
import { vitrinHref } from '@/lib/vitrin-href'
import {
  fetchPublicListingAvailabilityDaysSafe,
  fetchPublicListingBedroomsSafe,
  fetchPublicListingContractSafe,
  getBlogSlugsByTitles,
  getComputedServicePois,
  getListingNearbyPois,
  getPublicHotelRooms,
  getPublicListingAttributes,
  getPublicMealPlans,
  getPublicListingPriceRules,
  getPublicListingPriceLines,
  getPublicListingAccommodationRules,
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
import T from '@/utils/getT'
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
import HotelFAQSection, { AccordionFaqSection } from './HotelFAQSection'
import HotelHighlightsSection from './HotelHighlightsSection'
import HotelLocationInfoSection from './HotelLocationInfoSection'
import HotelPropertyInfoGrid from './HotelPropertyInfoGrid'
import HotelRoomShowcase, { type HotelRoomShowcaseItem } from './HotelRoomShowcase'
import HotelSectionNav, { type HotelSectionNavItem } from './HotelSectionNav'
import ListingAmenitiesSection from './ListingAmenitiesSection'
import ListingSleepingSection from './ListingSleepingSection'
import ListingPoolInfoSection from './ListingPoolInfoSection'
import { extraChargesHasContent, type ListingExtraChargesModel } from '@/lib/listing-extra-charges-model'
import ListingSeasonalPricingSection from './ListingSeasonalPricingSection'
import StayListingReservationCard from './StayListingReservationCard'
import StayListingMobileStickyBar from './StayListingMobileStickyBar'
import StayListingCalendarBookingBlock from './StayListingCalendarBookingBlock'
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
import SectionMealPlans from '@/components/listing/SectionMealPlans'

function formatPrepaymentPercentForDisplay(raw: string): string {
  const n = parseFloat(raw.replace(',', '.'))
  if (Number.isNaN(n)) return raw.trim()
  return Number.isInteger(n) ? String(Math.round(n)) : String(n)
}

function normalizeHolidayHomeLocationPin(raw: string | null | undefined): string | null {
  const text = String(raw ?? '').trim()
  if (!text) return null
  const parts = text
    .split(',')
    .map((segment) => segment.trim())
    .filter(Boolean)
    .map((segment) => segment.replace(/\b\d{4,6}\b/g, '').replace(/\s{2,}/g, ' ').trim())
    .flatMap((segment) => segment.split('/').map((piece) => piece.trim()).filter(Boolean))
  if (!parts.length) return null
  const deduped: string[] = []
  for (const part of parts) {
    if (!deduped.some((x) => x.toLocaleLowerCase('tr') === part.toLocaleLowerCase('tr'))) {
      deduped.push(part)
    }
  }
  return deduped.join(', ')
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
  if (catalogListingId) {
    const pubContract = await fetchPublicListingContractSafe(catalogListingId, locale)
    if (pubContract?.contract_id) {
      listingContractHref = await vitrinHref(locale, `${canonicalPath}/${handle}/sozlesme`)
    }
  }

  const mealPlans = await getPublicMealPlans(catalogListingId ?? listing.id)
  const availabilityCalendarDays = await fetchPublicListingAvailabilityDaysSafe(catalogListingId)
  const listingBedrooms =
    vertical === 'holiday_home' && catalogListingId ?
      await fetchPublicListingBedroomsSafe(catalogListingId)
    : []
  const [rawNearbyPois, servicePois] = await Promise.all([
    getListingNearbyPois(listing.id),
    getComputedServicePois(listing.id),
  ])
  const blogSlugMap = await getBlogSlugsByTitles(rawNearbyPois.map((p) => p.title))
  const nearbyPois = rawNearbyPois.map((p) => ({
    ...p,
    blog_slug: blogSlugMap[p.title] ?? p.blog_slug,
  }))

  // listing_attributes (admin EAV) → vitrin amenity listesi
  let amenityKeys: string[] = []
  try {
    const attrs = await getPublicListingAttributes(catalogListingId ?? listing.id)
    amenityKeys = attrs.values
      .filter((a) => isAttributeValueTrue(a.value_json))
      .map((a) => a.key)
    amenityKeys = Array.from(new Set(amenityKeys))
  } catch {
    /* attributes API yok — boş liste */
  }

  // hotel_rooms (Tur3) — vitrin oda tablosunda demo verisi yerine gerçek odalar.
  // meta_json içindeki opsiyonel alanlar (beds, bed_type, size_m2, description,
  // amenities, image) Booking/ETStur tarzı kart görünümünde zenginleştirmek için
  // burada parse edilir. Şema esnek; alan yoksa ilgili satır kart üzerinde gizlenir.
  let realHotelRooms: HotelRoomShowcaseItem[] = []
  try {
    const r = await getPublicHotelRooms(catalogListingId ?? listing.id)
    realHotelRooms = r.rooms.map((row): HotelRoomShowcaseItem => {
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
        image: pickString('image') ?? pickString('hero_image'),
      }
    })
  } catch {
    /* hotel_rooms API yok */
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
  const priceLines =
    isHolidayHome && catalogListingId
      ? await getPublicListingPriceLines(catalogListingId, locale)
      : null
  const poolHeatingOption = isHolidayHome
    ? getPoolHeatingReservationOption(
        (listing as TListingHolidayHome).pools,
        (priceCurrency ?? 'TRY').trim(),
      )
    : null

  const messages = getMessages(locale)
  const dp = messages.listing.detailPage
  const listingCurrencyUpper = (priceCurrency ?? 'TRY').trim().toUpperCase()
  const prepaymentNoteText = listing.prepaymentPercent?.trim()
    ? messages.listing.detailHeader.prepaymentNote.replace(
        '{percent}',
        formatPrepaymentPercentForDisplay(listing.prepaymentPercent.trim()),
      )
    : null
  /** API `meal_plan_summary === 'both'` — ücret tablosunda yemekli / yemeksiz sütunları */
  const dualMealPricing = isHolidayHome && listing.mealPlanSummary === 'both'
  let holidayHomePriceRules: ListingPriceRuleRow[] = []
  let seasonalPricingRows: ReturnType<typeof buildSeasonalPricingTableRows> = []
  if (isHolidayHome) {
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
  const maxNightlyFromRules = isHolidayHome
    ? maxNightlyFromListingPriceRules(holidayHomePriceRules)
    : undefined

  const ruleNightlyRangeForQuote =
    isHolidayHome &&
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

  const ruleFallbackForQuote = isHolidayHome ? rulesNightlyCandidate : undefined

  const seasonalExtraCharges: ListingExtraChargesModel | undefined = isHolidayHome
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
          listing.firstChargeAmount != null && listing.firstChargeAmount > 0
            ? { amount: listing.firstChargeAmount }
            : undefined,
        customFees: listing.listingExtraFees,
        // prepaymentLine artık politikalar bölümünde tüm kategoriler için
        // tek noktada gösteriliyor (e2). Burada null bırakıyoruz ki tatil
        // evinde çift görünmesin.
        prepaymentLine: null,
      }
    : undefined

  const holidayHomePricingVisible =
    isHolidayHome &&
    (seasonalPricingRows.length > 0 || extraChargesHasContent(seasonalExtraCharges))

  const mergeHolidayMealsIntoPricing = mealPlans.length > 0 && holidayHomePricingVisible

  const themePillLabels = isHolidayHome
    ? await resolveHolidayThemeLabels(listing.themeCodes ?? [], locale)
    : []
  const hotelTypeCodeNorm = vertical === 'hotel' ? listing.hotelTypeCode?.trim() : ''
  const listingCategoryBadge =
    vertical === 'hotel' && hotelTypeCodeNorm
      ? (await listPublicThemeItems({ categoryCode: 'hotel', locale }))?.items?.find(
          (i) => i.code === hotelTypeCodeNorm,
        )?.label ?? hotelTypeCodeNorm
      : listingCategory
  const ministryLicenseLine = listing.ministryLicenseRef?.trim()
    ? messages.listing.detailHeader.ministryLicense.replace('{ref}', listing.ministryLicenseRef.trim())
    : null
  const cancellationPolicyPlain = listing.cancellationPolicyText?.trim()
    ? listing.cancellationPolicyText.trim()
    : null
  // Ön-ödeme notu artık tüm kategorilerde gösterilebilir; tatil evi/villa
  // gibi tiplerde de prepaymentPercent set edilmişse misafire görünmesi
  // gerekiyor (e2). Mülk sahibi alanı boş bırakırsa prepaymentNoteText null
  // kalır → otomatik gizlenir.
  const hasPoliciesSection = Boolean(
    ministryLicenseLine?.trim() ||
      cancellationPolicyPlain ||
      prepaymentNoteText?.trim() ||
      listingContractHref,
  )
  const hotelSectionNavItems: HotelSectionNavItem[] =
    vertical === 'hotel'
      ? [
          amenityKeys.length > 0
            ? { id: 'stay-section-amenities', label: 'Tesis Özellikleri' }
            : null,
          realHotelRooms.length > 0
            ? { id: 'stay-section-rooms', label: 'Odalar', eyebrow: String(realHotelRooms.length) }
            : null,
          mealPlans.length > 0 ? { id: 'stay-section-meal-plans', label: 'Konsept' } : null,
          { id: 'stay-section-location', label: 'Konum Bilgileri' },
          hasPoliciesSection ? { id: 'stay-section-policies', label: 'Önemli Notlar' } : null,
        ].filter((item): item is HotelSectionNavItem => item !== null)
      : []
  const regionName = isHolidayHome
    ? normalizeHolidayHomeLocationPin(listing.city ?? listing.address)
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
    reviewStart: l.reviewStart ?? 0,
    reviewCount: l.reviewCount ?? 0,
    featuredImage: l.featuredImage ?? '',
    listingCategory: l.listingCategory ?? '',
    linkBase: stayDetailPathForVertical(normalizeCatalogVertical(l.listingVertical)),
    capacityLine: isHolidayHome
      ? holidayHomeCapacitySummary(
          { maxGuests: l.maxGuests, bedrooms: l.bedrooms, bathrooms: l.bathrooms },
          messages.listing.capacitySpec,
          true,
        )
      : undefined,
  })
  const similarListings = (isHolidayHome ? otherStays.slice(0, 4) : otherStays.slice(0, 8)).map(mapSimilar)
  const nearbyListings = isHolidayHome ? otherStays.slice(4, 8).map(mapSimilar) : []

  const siteConfig = mergeBrandingIntoEnvContact(getSitePublicConfigSync(), sitePubApi?.branding ?? null)
  const organizationName = siteConfig.orgName?.trim() || siteConfig.orgLegalName?.trim() || 'Travel'

  const detailJsonLd = await buildStayListingDetailJsonLd({
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
    isHolidayHome && breadcrumbRegionSlug && breadcrumbRegionLabel
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
      referenceCode={isHolidayHome ? listing.externalListingRef : undefined}
      referenceCodeLabel={messages.listing.detailHeader.referenceCode}
      shareGallery={{ galleryUrls: galleryForShare, listingTitle: title, locale }}
      themePills={isHolidayHome && themePillLabels.length > 0 ? themePillLabels : undefined}
      regionName={regionName}
    >
      {isHolidayHome ? (
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
              {bedrooms} {messages.listing.capacitySpec.rooms}
            </span>
          </div>
          <div className="flex items-center gap-x-3">
            <Bathtub02Icon className="mb-0.5 size-5" />
            <span>
              {bathrooms} {messages.listing.capacitySpec.bathrooms}
            </span>
          </div>
        </>
      ) : (
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

  const renderSectionDescription = () => (
    <div id="stay-section-about" className="listingSection__wrap scroll-mt-28">
      <SectionHeading>{isHolidayHome ? dp.aboutVacationHome : dp.aboutStay}</SectionHeading>
      <Divider className="w-14!" />
      <ListingDescriptionExpandable
        locale={locale}
        html={sanitizeRichCmsHtml(description ?? '')}
      />
    </div>
  )

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
    const checkInOut = [
      { type: 'ok' as const, text: dp.checkInRule },
      { type: 'ok' as const, text: dp.checkOutRule },
    ]
    const fromCatalog: { type: 'ok' | 'warn'; text: string }[] = []
    if (catalogAccommodationRules && catalogAccommodationRules.selectedIds.length > 0) {
      const sel = new Set(catalogAccommodationRules.selectedIds)
      for (const r of catalogAccommodationRules.rules) {
        if (!sel.has(r.id)) continue
        const text =
          r.labels[localeLang]?.trim() ||
          r.labels.tr?.trim() ||
          r.labels.en?.trim() ||
          Object.values(r.labels).find((s) => s.trim()) ||
          ''
        if (!text) continue
        fromCatalog.push({ type: r.severity === 'warn' ? 'warn' : 'ok', text })
      }
    }
    const rules = [...checkInOut, ...fromCatalog]
    return (
      <div id="stay-section-rules" className="listingSection__wrap scroll-mt-28">
        <div>
          <SectionHeading>{dp.rulesTitle}</SectionHeading>
          <SectionSubheading>{dp.rulesSubtitle}</SectionSubheading>
        </div>
        <Divider className="w-14!" />
        <div className="grid gap-3 sm:grid-cols-2">
          {rules.map((rule, i) => (
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
      </div>
    )
  }

  const renderSectionPolicies = () => {
    if (!hasPoliciesSection) return null
    return (
      <div id="stay-section-policies" className="listingSection__wrap scroll-mt-28">
        <SectionHeading>{messages.listing.policies.title}</SectionHeading>
        <Divider className="w-14!" />
        <div className="flex flex-col gap-4 text-sm leading-relaxed text-neutral-700 dark:text-neutral-300">
          {ministryLicenseLine?.trim() ? (
            <p className="text-neutral-700 dark:text-neutral-300">{ministryLicenseLine.trim()}</p>
          ) : null}
          {prepaymentNoteText?.trim() ? (
            <p className="text-neutral-700 dark:text-neutral-300">{prepaymentNoteText.trim()}</p>
          ) : null}
          {listingContractHref ? (
            <p>
              <Link
                href={listingContractHref}
                className="font-medium text-primary-600 underline decoration-primary-600/30 underline-offset-2 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300"
              >
                {messages.listing.policies.contractLink}
              </Link>
            </p>
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

  const renderSidebarPriceAndForm = () => (
    <StayListingReservationCard
      locale={locale}
      isHolidayHome={isHolidayHome}
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
      listingId={listing.id}
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
          isHolidayHome && 'overflow-hidden rounded-2xl sm:rounded-3xl ring-1 ring-black/5 dark:ring-white/10',
        )}
      >
        <HeaderGallery images={galleryImages} gridType="grid1" />
      </div>

      {/* BREADCRUMB — galeri altı ile ana içerik arası tek ritim */}
      <div className="mt-4">
        {renderBreadcrumb()}
      </div>

      {/* MAIN */}
      <main className="relative z-[1] flex flex-col gap-6 lg:flex-row lg:items-start xl:gap-8">
        {/* LEFT COLUMN */}
        <div className="flex min-w-0 w-full flex-col gap-y-5 lg:w-3/5 xl:w-[62%] xl:gap-y-7">
          {renderSectionHeader()}
          {vertical === 'hotel' ? <HotelSectionNav items={hotelSectionNavItems} /> : null}
          {perksBadges}
          {socialProof}
          {/* Booking/ETStur'daki "Property highlights" şeridi — sadece otelde,
              tatil evinde havuz/tema bölümleri zaten benzer işlevi görüyor. */}
          {!isHolidayHome ? (
            <HotelHighlightsSection locale={locale} amenityKeys={amenityKeys} />
          ) : null}
          {/* Booking "Property info at a glance" tarzı hızlı bilgi kutusu —
              yalnızca otel; yat ve villa gösterimi korunur. */}
          {vertical === 'hotel' ? (
            <HotelPropertyInfoGrid
              locale={locale}
              source={{
                checkInLine: dp.checkInRule,
                checkOutLine: dp.checkOutRule,
                starRating:
                  typeof (listing as { stars?: number }).stars === 'number'
                    ? ((listing as { stars?: number }).stars ?? null)
                    : null,
                roomTypeCount: realHotelRooms.length > 0 ? realHotelRooms.length : null,
                hasBreakfast: mealPlans.some((m) =>
                  ['bed_breakfast', 'half_board', 'full_board', 'all_inclusive'].includes(
                    m.plan_code,
                  ),
                ),
                prepaymentLine: prepaymentNoteText?.trim() ?? null,
                city: listing.city ?? null,
                regionLabel: null,
              }}
            />
          ) : null}
          {renderSectionDescription()}
          {amenityKeys.length > 0 && (
            <div id="stay-section-amenities" className="scroll-mt-28">
              <ListingAmenitiesSection
                locale={locale}
                variant={isHolidayHome ? 'villa' : 'hotel'}
                customSelectedIds={amenityKeys}
              />
            </div>
          )}
          {isHolidayHome && (
            <div id="stay-section-pool" className="scroll-mt-28">
              <ListingPoolInfoSection
                locale={locale}
                pools={(listing as TListingHolidayHome).pools}
                demo={Boolean((listing as TListingHolidayHome).poolsDemo)}
              />
            </div>
          )}
          {isHolidayHome && listingBedrooms.length > 0 ? (
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
          {isHolidayHome && priceLines && (priceLines.included.length > 0 || priceLines.excluded.length > 0) ? (
            <ListingPriceInclusionsSection
              locale={locale}
              included={priceLines.included}
              excluded={priceLines.excluded}
            />
          ) : null}
          {/* Oteller için Booking/ETStur tarzı oda kartı gösterimi; yat için
              mevcut özet tablosu korunur. Tatil evinde oda listesi yok. */}
          {vertical === 'hotel' && realHotelRooms.length > 0 ? (
            <div id="stay-section-rooms" className="scroll-mt-28">
              <HotelRoomShowcase
                locale={locale}
                rooms={realHotelRooms}
                reservationAnchorId="stay-reservation-card"
                currencySymbol={
                  priceCurrency === 'USD' ? '$' : priceCurrency === 'EUR' ? '€' : '₺'
                }
              />
            </div>
          ) : (
            !isHolidayHome && vertical !== 'hotel' && renderSectionRoomTypes()
          )}
          {mealPlans.length > 0 && !mergeHolidayMealsIntoPricing && (
            <div id={vertical === 'hotel' ? 'stay-section-meal-plans' : undefined} className="scroll-mt-28">
              <SectionMealPlans
                mealPlans={mealPlans}
                locale={locale}
                holidayHome={isHolidayHome}
                maxGuests={maxGuests}
              />
            </div>
          )}
          <div id="stay-section-calendar" className="scroll-mt-28">
          <StayListingCalendarBookingBlock
            locale={locale}
            listingId={listing.id}
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
            isHolidayHome={isHolidayHome}
            cleaningFeeAmount={listing.cleaningFeeAmount}
            damageDepositAmount={damageDepositAmount}
            ruleFallbackNightly={ruleFallbackForQuote}
            ruleNightlyRange={ruleNightlyRangeForQuote}
          />
          </div>
          {renderSectionRules()}
          {renderSectionPolicies()}
          {isHolidayHome &&
            Array.isArray(listing.holidayHomeFaqItems) &&
            listing.holidayHomeFaqItems.length > 0 && (
              <div id="stay-section-faq" className="scroll-mt-28">
              <AccordionFaqSection
                locale={locale}
                items={listing.holidayHomeFaqItems}
                title={messages.listing.faq.title}
                subtitle={
                  messages.listing.faq.subtitleHolidayHome ?? messages.listing.faq.subtitle
                }
              />
              </div>
            )}
          {!isHolidayHome && (() => {
            // Booking/ETStur tarzı FAQ — mevcut listing alanlarından otomatik
            // üretilir, içerik yoksa bölüm gizlenir.
            const petText: string | null = (() => {
              if (!catalogAccommodationRules) return null
              const sel = new Set(catalogAccommodationRules.selectedIds)
              for (const r of catalogAccommodationRules.rules) {
                if (!sel.has(r.id)) continue
                const text =
                  r.labels[localeLang]?.trim() ||
                  r.labels.tr?.trim() ||
                  r.labels.en?.trim() ||
                  ''
                if (!text) continue
                if (/pet|evcil|hayvan|köpek|kedi/i.test(text)) return text
              }
              return null
            })()
            // Kahvaltı, yarım pansiyon, tam pansiyon veya her şey dahil
            // planlardan herhangi biri kahvaltıyı içerir.
            const hasBreakfast = mealPlans.some((m) =>
              ['bed_breakfast', 'half_board', 'full_board', 'all_inclusive'].includes(
                m.plan_code,
              ),
            )
            return (
              <HotelFAQSection
                locale={locale}
                source={{
                  checkInLine: dp.checkInRule,
                  checkOutLine: dp.checkOutRule,
                  prepaymentNote: prepaymentNoteText,
                  cancellationText: cancellationPolicyPlain,
                  ministryLicenseRef: listing.ministryLicenseRef,
                  hasBreakfastIncluded: hasBreakfast,
                  petPolicyText: petText,
                }}
              />
            )
          })()}
          <div id="stay-section-location" className="scroll-mt-28 space-y-5">
            {vertical === 'hotel' ? (
              <HotelLocationInfoSection
                address={address}
                city={listing.city}
                transport={servicePois.transport}
              />
            ) : null}
            <SectionMap
              lat={map?.lat}
              lng={map?.lng}
              address={address}
              heading={dp.location}
            />
          </div>
          <ListingServicePoisSection
            amenities={servicePois.amenities}
            transport={servicePois.transport}
          />
          <NearbyPlacesSection
            locale={locale}
            regionSlug={
              regionBrowseSlugFromLocationPin(listing.city) ?? regionPlacesSlugFromCity(listing.city)
            }
            title={dp.nearbyPlaces}
            variant="flat"
            maxPlaces={12}
            overrideLat={map?.lat}
            overrideLng={map?.lng}
          />
          <ListingNearbyPoisSection pois={nearbyPois} locale={locale} />
          <SimilarListings
            listings={similarListings}
            title={dp.similarListings}
            perNightSuffix={dp.perNight}
            ariaPrev={dp.carouselPrevAria}
            ariaNext={dp.carouselNextAria}
          />
          {isHolidayHome && nearbyListings.length > 0 && (
            <SimilarListings
              listings={nearbyListings}
              title={dp.nearbyListings}
              perNightSuffix={dp.perNight}
              ariaPrev={dp.carouselPrevAria}
              ariaNext={dp.carouselNextAria}
            />
          )}
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

      <div className="mt-8">
        <ListingDetailOurFeatures locale={locale} city={listing.city} />
      </div>

      <Divider className="my-12" />

      {/* HOST + REVIEWS */}
      <div className="flex flex-col gap-y-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:gap-8">
          <div className="w-full lg:w-4/9 xl:w-1/3">
            <SectionHost {...host} locale={locale} />
          </div>
          <div className="w-full lg:w-2/3">
            <SectionListingReviews
              listingId={listing.id}
              reviewCount={reviewCount ?? 0}
              reviewStart={reviewStart ?? 0}
            />
            <div className="mt-6 flex justify-center lg:justify-start">
              <ReportListingButton listingId={listing.id} />
            </div>
          </div>
        </div>
      </div>

      {isHolidayHome ? (
        <StayListingMobileStickyBar
          locale={locale}
          listingId={listing.id}
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
        />
      ) : null}
    </div>
  )
}
