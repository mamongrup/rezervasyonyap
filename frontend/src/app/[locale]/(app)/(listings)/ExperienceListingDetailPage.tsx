import ListingDescriptionExpandable from '@/components/listing/ListingDescriptionExpandable'
import TourItineraryMapSection from '@/components/listing/TourItineraryMapSection'
import { parseTourDayPins, parseTourItineraryPinsFromDays } from '@/lib/tour-itinerary-geocoder'
import { parseCruiseItineraryPins } from '@/lib/cruise-itinerary-pins'
import { formatCruiseRouteSummary } from '@/lib/cruise-route-display'
import { getExperienceListingByHandle, listingHostForSection } from '@/data/listings'
import {
  Clock01Icon,
  Globe02Icon,
  UserMultiple02Icon,
} from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { Metadata } from 'next'
import { redirect } from 'next/navigation'
import NearbyPlacesSection from '@/components/travel/NearbyPlacesSection'
import { fetchCategoryListings } from '@/lib/listings-fetcher'
import { getSitePublicConfig } from '@/lib/site-public-config'
import { buildListingOgImageUrl } from '@/lib/social-share/listing-og-image-url'
import { sanitizeRichCmsHtml } from '@/lib/sanitize-cms-html'
import { stripHtml } from '@/lib/social-share/strip-html'
import { normalizeCatalogVertical } from '@/lib/catalog-listing-vertical'
import { SITE_LOCALE_CATALOG } from '@/lib/i18n-catalog-locales'
import {
  detailPathForVertical,
  experienceBrowsePathForVertical,
} from '@/lib/listing-detail-routes'
import { vitrinHref } from '@/lib/vitrin-href'
import {
  fetchPublicListingAvailabilityDaysSafe,
  getPublicTourPeriods,
  getVerticalMeta,
  listPublicActivitySessions,
  type ActivitySessionRow,
} from '@/lib/travel-api'
import { formatTourLanguageLabels } from '@/lib/tour-listing-card-meta'
import { mergeTourPeriodOptions } from '@/lib/tour-periods'
import {
  parseTourFlightSchedulesFromDescription,
  stripFlightScheduleBlockFromDescription,
} from '@/lib/tour-flight-schedule'
import { resolveTourCountryCards } from '@/lib/tour-countries-resolve'
import {
  parseTourDescription,
  replaceTourBrandName,
  tourFlightScheduleInsertAfterSectionId,
} from '@/lib/tour-description-parser'
import { unwrapVerticalMetaPayload } from '@/lib/listing-pools'
import {
  cruiseInfoSections as buildCruiseInfoSections,
  cruiseCabins,
  cruiseIncludedExcluded,
  cruiseItineraryDays,
  cruiseOverviewItems as buildCruiseOverviewItems,
  cruisePeriodSelectOptions,
  parseCruiseVerticalMeta,
} from '@/lib/cruise-meta'
import {
  gezinomiIncludedExcludedLists,
  gezinomiTourDeparturePoints,
  gezinomiTourInfoSections,
  gezinomiTourIntroHtml,
  gezinomiTourItineraryDays,
  gezinomiTourOverviewItems,
  gezinomiTourPeriodSelectOptions,
  gezinomiTourPeriodTimeLabels,
  hasGezinomiTourStructuredContent,
  parseGezinomiTourVerticalMeta,
} from '@/lib/gezinomi-tour-meta'
import { guessCalendarMonthsShownFromRequest } from '@/lib/calendar-months-shown-server'
import { resolveRegionPlacesForListingPage } from '@/lib/region-places-from-location-page'
import {
  regionBrowseSlugFromLocationPin,
  regionPlacesSlugFromCity,
  shortRegionLabelFromLocationPin,
} from '@/lib/region-places-slug'
import ActivityExtraFeesSection from './ActivityExtraFeesSection'
import { pickActivitySectionTitle, parseActivityVitrinMeta } from '@/lib/activity-vitrin-meta'
import { resolveActivityRelatedListings } from '@/lib/resolve-activity-related-listings'
import { normalizeStayLocationPin } from '@/lib/stay-location-display'
import { Divider } from '@/shared/divider'
import { getMessages } from '@/utils/getT'
import { interpolate } from '@/utils/interpolate'
import { buildExperienceListingDetailJsonLd } from '@/lib/seo/listing-detail-jsonld'
import { galleryUrlsForStayDetailHeader } from '@/lib/listing-gallery-hero-order'
import type { TListingBase } from '@/types/listing-types'
import type { CatalogListingVerticalCode } from '@/lib/catalog-listing-vertical'
import HeaderGallery from './components/HeaderGallery'
import SectionDateRange from './components/SectionDateRange'
import SectionHeader from './components/SectionHeader'
import SectionHost from './components/SectionHost'
import ListingDetailOurFeatures from './components/ListingDetailOurFeatures'
import SimilarListings from './components/SimilarListings'
import SectionListingReviews from './components/SectionListingReviews'
import SectionMap from './components/SectionMap'
import ActivityBookingPanel from './ActivityBookingPanel'
import TourCountryInfoSection from './TourCountryInfoSection'
import {
  LISTING_DETAIL_SECTION_GAP,
  LISTING_DETAIL_SECTION_GAP_Y,
  LISTING_SECTION_SHELL,
} from './listing-section-classes'
import ExperienceBookingSidebar from './ExperienceBookingSidebar'
import TourBookingSidebar from './TourBookingSidebar'
import CruiseBookingSidebar from './CruiseBookingSidebar'
import CruiseRouteSection from './CruiseRouteSection'
import CruiseShipDetailsSection from './CruiseShipDetailsSection'
import CruiseCabinPricingSection from './CruiseCabinPricingSection'
import CruiseCabinsUnavailableSection from './CruiseCabinsUnavailableSection'
import { CruiseCabinProvider } from './CruiseCabinContext'
import TourFlightScheduleSection from './TourFlightScheduleSection'
import { TourPeriodProvider } from './TourPeriodContext'
import ActivityOverviewSection, {
  ActivityDescriptionSection,
  ActivityRulesSection,
  type ActivityOverviewItem,
} from './ActivityDetailSections'
import {
  TourDeparturePointsSection,
  TourIncludedExcludedSection,
  TourInfoSections,
  TourOverviewSection,
  TourPeriodTimesSection,
  type TourItineraryDay,
  type TourOverviewItem,
} from './TourDetailSections'

type TourMeta = {
  duration_days?: string
  min_people?: string
  max_people?: string
  visa_required?: boolean
  travel_type?: string
  is_guided?: boolean
  accommodation_type?: string
  languages?: string
  min_day_before_booking?: string
  includes?: string[]
  excludes?: string[]
  itinerary?: TourItineraryDay[]
}

type ActivityMeta = {
  session_based?: boolean
  full_day?: boolean
  duration_hours?: string
  min_age?: string
  max_participants?: string
  meeting_point?: string
  equipment_included?: string
  language?: string
  preview_url?: string
  includes?: string[]
  excludes?: string[]
  rules?: string[]
}

function textFromMeta(value: unknown): string {
  return typeof value === 'string' ? value.trim() : value == null ? '' : String(value).trim()
}

function splitMetaList(raw: string | string[] | undefined): string[] {
  if (Array.isArray(raw)) return raw.map((x) => textFromMeta(x)).filter(Boolean)
  return textFromMeta(raw)
    .split(/[,\n]/)
    .map((x) => x.trim())
    .filter(Boolean)
}

function uniqueLines(lines: string[]): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const line of lines) {
    const clean = line.trim()
    if (!clean) continue
    const key = clean.toLocaleLowerCase('tr')
    if (seen.has(key)) continue
    seen.add(key)
    out.push(clean)
  }
  return out
}

function travelTypeLabel(locale: string, code: string): string {
  const t = getMessages(locale).listing.tourDetail.travelType as Record<string, string>
  return t[code] ?? ''
}

function accommodationTypeLabel(locale: string, code: string): string {
  const t = getMessages(locale).listing.tourDetail.accommodationType as Record<string, string>
  return t[code] ?? ''
}

function parseTourMeta(raw: unknown): TourMeta {
  const data = unwrapVerticalMetaPayload(raw)
  const itineraryRaw = Array.isArray(data.itinerary) ? data.itinerary : []
  const itinerary = itineraryRaw
    .map((item, index): TourItineraryDay => {
      const row = item && typeof item === 'object' ? (item as Record<string, unknown>) : {}
      const dayRaw = Number(row.day)
      return {
        day: Number.isFinite(dayRaw) && dayRaw > 0 ? dayRaw : index + 1,
        title: textFromMeta(row.title),
        description: textFromMeta(row.description),
      }
    })
    .filter((day) => day.title || day.description)

  return {
    duration_days: textFromMeta(data.duration_days),
    min_people: textFromMeta(data.min_people),
    max_people: textFromMeta(data.max_people),
    visa_required: data.visa_required === true,
    travel_type: textFromMeta(data.travel_type),
    is_guided: data.is_guided === true,
    accommodation_type: textFromMeta(data.accommodation_type),
    languages: textFromMeta(data.languages),
    min_day_before_booking: textFromMeta(data.min_day_before_booking),
    includes: splitMetaList(data.includes as string[] | string | undefined),
    excludes: splitMetaList(data.excludes as string[] | string | undefined),
    itinerary,
  }
}

function parseActivityMeta(raw: unknown): ActivityMeta {
  const data = unwrapVerticalMetaPayload(raw)
  return {
    session_based: data.session_based === true,
    full_day: data.full_day === true,
    duration_hours: textFromMeta(data.duration_hours),
    min_age: textFromMeta(data.min_age),
    max_participants: textFromMeta(data.max_participants),
    meeting_point: textFromMeta(data.meeting_point),
    equipment_included: textFromMeta(data.equipment_included),
    language: textFromMeta(data.language),
    preview_url: textFromMeta(data.preview_url),
    includes: splitMetaList(data.includes as string[] | string | undefined),
    excludes: splitMetaList(data.excludes as string[] | string | undefined),
    rules: splitMetaList(data.rules as string[] | string | undefined),
  }
}

function activitySessionDate(raw: string | null | undefined): string {
  const s = String(raw ?? '').trim()
  return /^\d{4}-\d{2}-\d{2}/.test(s) ? s.slice(0, 10) : ''
}

function activitySessionCoversDate(session: ActivitySessionRow, date: string): boolean {
  const from = activitySessionDate(session.valid_from)
  const to = activitySessionDate(session.valid_to)
  if (!from || !to) return false
  return from <= date && date <= to && session.is_active !== false
}

function firstActivityBookingDate(sessions: ActivitySessionRow[], today: string): string {
  let best: string | null = null
  for (const session of sessions) {
    if (session.is_active === false) continue
    const from = activitySessionDate(session.valid_from)
    const to = activitySessionDate(session.valid_to)
    if (!from || !to || to < today) continue
    if (from <= today && today <= to) return today
    const candidate = from > today ? from : today
    if (best == null || candidate < best) best = candidate
  }
  return best ?? today
}

function activitySessionsForDate(sessions: ActivitySessionRow[], date: string): ActivitySessionRow[] {
  return sessions.filter((session) => activitySessionCoversDate(session, date))
}

export async function generateExperienceListingMetadata({
  params,
}: {
  params: Promise<{ locale: string; handle: string }>
}): Promise<Metadata> {
  const { handle, locale } = await params
  const listing = await getExperienceListingByHandle(handle, locale)

  const dp = getMessages(locale).listing.detailPage
  if (!listing) {
    return {
      title: dp.notFoundTitle,
      description: dp.notFoundDescription,
    }
  }

  const plainDesc = listing.description ? stripHtml(listing.description) : listing.title
  const ogImage = buildListingOgImageUrl({ kind: 'experience', handle, locale })

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

export default async function ExperienceListingDetailPage({
  params,
  linkBase,
}: {
  params: Promise<{ locale: string; handle: string }>
  linkBase: string
}) {
  const { handle, locale } = await params
  const [calendarMonthsShown, listing] = await Promise.all([
    guessCalendarMonthsShownFromRequest(),
    getExperienceListingByHandle(handle, locale),
  ])
  if (!listing?.id) {
    return redirect(await vitrinHref(locale, '/turlar/all'))
  }

  const vertical = normalizeCatalogVertical(listing.listingVertical) ?? 'activity'
  const isTour = vertical === 'tour'
  const isActivity = vertical === 'activity'
  const isCruise = vertical === 'cruise'
  const experienceCodes: CatalogListingVerticalCode[] = [
    'tour',
    'activity',
    'cruise',
    'hajj',
    'visa',
    'event',
    'cinema_ticket',
    'beach_lounger',
    'restaurant_table',
  ]
  if (!experienceCodes.includes(vertical)) {
    return redirect(await vitrinHref(locale, experienceBrowsePathForVertical(vertical)))
  }

  const canonicalPath = detailPathForVertical(vertical)
  if (linkBase !== canonicalPath) {
    redirect(await vitrinHref(locale, `${canonicalPath}/${handle}`))
  }

  // listing.id zaten yayınlanmış katalog id'si (getExperienceListingByHandle →
  // getStayListingByHandle içinde çözülür); tekrar çözmek fazladan arama isteğiydi.
  const catalogListingId = listing.id
  const activityToday = new Date().toISOString().slice(0, 10)
  const city = (listing as TListingBase).city
  const regionSlugForPlaces =
    regionBrowseSlugFromLocationPin(city) ?? regionPlacesSlugFromCity(city)
  const [
    availabilityCalendarDays,
    rawTourMeta,
    rawActivityMeta,
    activitySessionsResult,
    rawTourPeriods,
    tourCountryCards,
    similarToursRes,
    similarActivitiesRes,
    regionPlacesInitialData,
    rawCruiseMeta,
  ] = await Promise.all([
    vertical === 'tour'
      ? Promise.resolve([])
      : fetchPublicListingAvailabilityDaysSafe(catalogListingId),
    vertical === 'tour'
      ? getVerticalMeta(catalogListingId, 'tour').catch(() => null)
      : Promise.resolve(null),
    vertical === 'activity'
      ? getVerticalMeta(catalogListingId, 'activity').catch(() => null)
      : Promise.resolve(null),
    vertical === 'activity'
      ? listPublicActivitySessions(catalogListingId).catch(() => ({ sessions: [] }))
      : Promise.resolve({ sessions: [] }),
    vertical === 'tour'
      ? getPublicTourPeriods(catalogListingId).catch(() => null)
      : Promise.resolve(null),
    vertical === 'tour'
      ? resolveTourCountryCards(catalogListingId).catch(() => [])
      : Promise.resolve([]),
    vertical === 'tour'
      ? fetchCategoryListings('turlar', {}, { perPage: 9 }, locale).catch(() => ({ listings: [] }))
      : Promise.resolve({ listings: [] }),
    vertical === 'activity'
      ? fetchCategoryListings('aktiviteler', {}, {}, locale).catch(() => ({ listings: [] }))
      : Promise.resolve({ listings: [] }),
    isActivity
      ? resolveRegionPlacesForListingPage(
          regionSlugForPlaces,
          locale,
          shortRegionLabelFromLocationPin(city) || city || undefined,
        )
      : Promise.resolve(null),
    isCruise
      ? getVerticalMeta(catalogListingId, 'cruise').catch(() => null)
      : Promise.resolve(null),
  ])

  const {
    address,
    description,
    featuredImage,
    galleryImgs,
    listingCategory,
    map,
    maxGuests,
    price,
    reviewCount,
    reviewStart,
    title,
    host,
    durationTime,
    languages,
  } = listing

  const m = getMessages(locale)
  const dp = m.listing.detailPage
  const td = m.listing.tourDetail
  const ad = m.listing.activityDetail
  const cd = m.listing.cruiseDetail
  const tourMeta = isTour ? parseTourMeta(rawTourMeta) : null
  const gezinomiTourMeta = isTour ? parseGezinomiTourVerticalMeta(rawTourMeta) : null
  const useGezinomiTourLayout = isTour && hasGezinomiTourStructuredContent(gezinomiTourMeta)
  const wtatilTourPeriodOptions = isTour && rawTourPeriods ? mergeTourPeriodOptions(rawTourPeriods) : []
  const gezinomiTourPeriodOptions =
    useGezinomiTourLayout && gezinomiTourMeta
      ? gezinomiTourPeriodSelectOptions(gezinomiTourMeta, {
          fallbackPrice: (listing as TListingBase & { priceAmount?: number }).priceAmount,
          currencyCode:
            rawTourPeriods?.currency_code?.trim() ||
            (listing as TListingBase & { listingCurrencyCode?: string }).listingCurrencyCode?.trim() ||
            'TRY',
          locale,
        })
      : []
  const gezinomiDeparturePoints = useGezinomiTourLayout
    ? gezinomiTourDeparturePoints(gezinomiTourMeta)
    : []
  const gezinomiPeriodTimeLabels = useGezinomiTourLayout
    ? gezinomiTourPeriodTimeLabels(gezinomiTourMeta)
    : []
  const tourPeriodOptions =
    wtatilTourPeriodOptions.length > 0 ? wtatilTourPeriodOptions : gezinomiTourPeriodOptions
  const tourFlightSchedules =
    isTour && description ? parseTourFlightSchedulesFromDescription(description) : []
  const listingTour = listing as TListingBase & { durationNights?: number }
  const tourNights = listingTour.durationNights
  const tourDurationLine =
    tourMeta?.duration_days
      ? interpolate(td.durationDays, { count: tourMeta.duration_days })
      : tourNights != null && tourNights > 0
        ? interpolate(td.durationNightsDays, {
            nights: String(tourNights),
            days: String(tourNights + 1),
          })
        : durationTime || td.durationNotSpecified
  const activityMeta = isActivity ? parseActivityMeta(rawActivityMeta) : null
  const cruiseMeta = isCruise ? parseCruiseVerticalMeta(rawCruiseMeta) : null
  const listingPriceMoney = listing as TListingBase & {
    priceAmount?: number
    priceCurrency?: string
    listingCurrencyCode?: string
  }
  const cruisePeriodCurrency =
    listingPriceMoney.priceCurrency?.trim() ||
    listingPriceMoney.listingCurrencyCode?.trim() ||
    'TRY'
  const cruisePeriodOptions =
    isCruise && cruiseMeta
      ? cruisePeriodSelectOptions(cruiseMeta, {
          fallbackPrice: listingPriceMoney.priceAmount,
          currencyCode: cruisePeriodCurrency,
        })
      : []
  const cruiseOverview = isCruise
    ? buildCruiseOverviewItems(
        cruiseMeta,
        {
          cruiseLine: cd.cruiseLine ?? 'Gemi hattı',
          ship: cd.ship ?? 'Gemi',
          route: cd.route ?? 'Rota',
          cabin: cd.cabinCategory ?? 'Kabin',
          nights: cd.nights ?? 'Gece',
          departure: cd.departurePort ?? 'Kalkış limanı',
          concept: cd.concept ?? 'Konsept',
          transport: cd.transport ?? 'Ulaşım',
          visa: cd.visa ?? 'Vize',
          tourCode: cd.tourCode ?? 'Tur kodu',
        },
        tourNights,
      )
    : []
  const cruiseInfoRaw = isCruise ? buildCruiseInfoSections(cruiseMeta, locale) : []
  const cruiseInfo = cruiseInfoRaw.filter(
    (section) => !(section.id === 'cruise-visits' && Boolean(cruiseMeta?.route_summary?.trim())),
  )
  const cruiseDays = isCruise ? cruiseItineraryDays(cruiseMeta) : []
  const cruiseCabinsList = isCruise ? cruiseCabins(cruiseMeta) : []
  const cruiseServices = isCruise ? cruiseIncludedExcluded(cruiseMeta) : { included: [], excluded: [] }
  const cruiseDayPins = isCruise ? parseCruiseItineraryPins(cruiseMeta) : []
  const cruiseRouteLabel =
    isCruise && cruiseMeta?.route_summary?.trim()
      ? formatCruiseRouteSummary(cruiseMeta.route_summary)
      : city?.trim()
        ? formatCruiseRouteSummary(city)
        : undefined
  const activityVitrin = isActivity
    ? parseActivityVitrinMeta(unwrapVerticalMetaPayload(rawActivityMeta))
    : null
  const allActivitySessions = isActivity ? activitySessionsResult.sessions : []
  const activityInitialDate = isActivity
    ? firstActivityBookingDate(allActivitySessions, activityToday)
    : activityToday
  const initialActivitySessions = isActivity
    ? activitySessionsForDate(allActivitySessions, activityInitialDate)
    : []
  const tourLanguages = splitMetaList(tourMeta?.languages)
  const tourLanguageLine = formatTourLanguageLabels(tourLanguages)
  const tourGroupLine = tourMeta?.max_people
    ? interpolate(td.maxPeople, { count: tourMeta.max_people })
    : maxGuests
      ? interpolate(td.maxPeople, { count: String(maxGuests) })
      : td.capacityNotSpecified
  const tourDescriptionStripped =
    isTour && description?.trim() && !useGezinomiTourLayout
      ? stripFlightScheduleBlockFromDescription(description)
      : description
  const parsedTourDescription =
    isTour && tourDescriptionStripped?.trim() && !useGezinomiTourLayout
      ? parseTourDescription(tourDescriptionStripped)
      : { programHtml: '', infoSections: [] }
  const gezinomiItineraryDays = useGezinomiTourLayout
    ? gezinomiTourItineraryDays(gezinomiTourMeta)
    : []
  const gezinomiInfoSections = useGezinomiTourLayout
    ? gezinomiTourInfoSections(gezinomiTourMeta)
    : []
  const gezinomiIncludedExcluded = useGezinomiTourLayout
    ? gezinomiIncludedExcludedLists(gezinomiTourMeta)
    : { included: [], excluded: [] }
  const tourInfoSections = useGezinomiTourLayout
    ? gezinomiInfoSections.filter((section) => {
        if (
          gezinomiIncludedExcluded.included.length > 0 &&
          section.id === 'cruise-section-included'
        ) {
          return false
        }
        if (
          gezinomiIncludedExcluded.excluded.length > 0 &&
          section.id === 'cruise-section-excluded'
        ) {
          return false
        }
        return true
      })
    : parsedTourDescription.infoSections.map((section) => ({
        ...section,
        html: sanitizeRichCmsHtml(section.html),
      }))
  const tourProgramHtml = useGezinomiTourLayout
    ? gezinomiTourIntroHtml(gezinomiTourMeta)
    : parsedTourDescription.programHtml.trim()
      ? sanitizeRichCmsHtml(parsedTourDescription.programHtml)
      : ''
  const tourDayPins = isTour
    ? (() => {
        if (useGezinomiTourLayout && gezinomiItineraryDays.length > 0) {
          return parseTourItineraryPinsFromDays(gezinomiItineraryDays)
        }
        if (tourMeta?.itinerary?.length) {
          return parseTourItineraryPinsFromDays(tourMeta.itinerary)
        }
        return parseTourDayPins(parsedTourDescription.programHtml)
      })()
    : []
  const tourOverviewItems: TourOverviewItem[] = isTour
    ? [
        ...(useGezinomiTourLayout
          ? gezinomiTourOverviewItems(gezinomiTourMeta, {
              departure: locale.startsWith('en') ? 'Departure' : 'Kalkış',
              concept: locale.startsWith('en') ? 'Meal concept' : 'Yeme içme',
              region: locale.startsWith('en') ? 'Region' : 'Bölge',
            }, locale)
          : []),
        tourMeta?.travel_type && travelTypeLabel(locale, tourMeta.travel_type)
          ? {
              label: td.overview.transport,
              value: travelTypeLabel(locale, tourMeta.travel_type),
              icon: 'transport',
            }
          : null,
        tourMeta?.accommodation_type && accommodationTypeLabel(locale, tourMeta.accommodation_type)
          ? {
              label: td.overview.accommodation,
              value: accommodationTypeLabel(locale, tourMeta.accommodation_type),
              icon: 'location',
            }
          : null,
        tourMeta?.is_guided
          ? { label: td.overview.guide, value: td.overview.guidedTour, icon: 'guide' }
          : null,
        tourMeta?.visa_required
          ? { label: td.overview.visa, value: td.overview.visaRequired, icon: 'visa' }
          : null,
        tourLanguageLine
          ? { label: td.overview.language, value: tourLanguageLine, icon: 'language' }
          : null,
      ].filter((item): item is TourOverviewItem => item !== null)
    : []
  const tourLinkBase = detailPathForVertical('tour')
  const similarTourListings = isTour
    ? similarToursRes.listings
        .filter((l) => l.handle !== handle)
        .slice(0, 8)
        .map((l) => ({
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
          linkBase: tourLinkBase,
        }))
    : []
  const otherActivities = isActivity
    ? similarActivitiesRes.listings.filter((l) => l.handle !== handle)
    : []
  const regionPin = normalizeStayLocationPin(city ?? address ?? '')
  const similarActivityListings = isActivity
    ? await resolveActivityRelatedListings({
        locale,
        excludeHandle: handle,
        manualIds: activityVitrin?.similar_listing_ids,
        autoCandidates: otherActivities,
        listingCategory: listingCategory?.trim(),
        mode: 'similar',
      })
    : []
  const regionActivityListings = isActivity
    ? await resolveActivityRelatedListings({
        locale,
        excludeHandle: handle,
        manualIds: activityVitrin?.region_listing_ids,
        autoCandidates: otherActivities.filter(
          (l) => !similarActivityListings.some((s) => s.id === l.id),
        ),
        listingCategory: listingCategory?.trim(),
        regionPin,
        mode: 'region',
      })
    : []
  const regionListingsTitle = pickActivitySectionTitle(
    activityVitrin ?? undefined,
    'region',
    locale,
    ad.regionListings ?? dp.nearbyListings,
  )
  const activityRegionCarouselListings = isActivity
    ? regionActivityListings.length > 0
      ? regionActivityListings
      : similarActivityListings
    : []
  const extraFeesTitle = pickActivitySectionTitle(
    activityVitrin ?? undefined,
    'extra_fees',
    locale,
    ad.extraFeesTitle ?? 'Ek Ücretler',
  )

  const activityOverviewItems: ActivityOverviewItem[] = isActivity
    ? [
        activityMeta?.min_age
          ? {
              label: ad.overview.minAge,
              value: interpolate(ad.overview.minAgeValue, { age: activityMeta.min_age }),
              icon: 'age',
            }
          : null,
        activityMeta?.equipment_included
          ? { label: ad.overview.equipment, value: activityMeta.equipment_included, icon: 'equipment' }
          : null,
      ].filter((item): item is ActivityOverviewItem => item !== null)
    : []

  const activityDurationLine = isActivity
    ? activityMeta?.duration_hours
      ? interpolate(ad.overview.durationHours, { hours: activityMeta.duration_hours })
      : durationTime?.trim() || td.durationNotSpecified
    : durationTime || td.durationNotSpecified

  const activityCapacityLine = isActivity
    ? activityMeta?.max_participants
      ? interpolate(dp.upToPeople, { count: activityMeta.max_participants })
      : maxGuests
        ? interpolate(dp.upToPeople, { count: String(maxGuests) })
        : td.capacityNotSpecified
    : maxGuests
      ? interpolate(dp.upToPeople, { count: String(maxGuests) })
      : td.capacityNotSpecified

  const siteLanguagesLine = SITE_LOCALE_CATALOG.map((l) => l.name).join(', ')

  const siteConfig = getSitePublicConfig()
  const organizationName = siteConfig.orgName?.trim() || siteConfig.orgLegalName?.trim() || 'Travel'

  const detailJsonLd = await buildExperienceListingDetailJsonLd({
    locale,
    linkBase,
    organizationName,
    listing: {
      id: listing.id,
      title,
      description,
      handle,
      address,
      city,
      featuredImage,
      galleryImgs,
      listingCategory,
      listingVertical: normalizeCatalogVertical(listing.listingVertical),
      map,
      maxGuests,
      price,
      reviewCount,
      reviewStart,
      host,
      durationTime,
    },
  })

  const galleryForShare = Array.from(
    new Set([featuredImage, ...(galleryImgs ?? [])].filter((u): u is string => Boolean(u))),
  )
  const galleryImages = galleryUrlsForStayDetailHeader(featuredImage, galleryImgs)

  const renderSectionHeader = () => {
    return (
      <SectionHeader
        address={address ?? ''}
        listingCategory={listingCategory ?? ''}
        reviewCount={reviewCount ?? 0}
        reviewStart={reviewStart ?? 0}
        showReviews={!isTour}
        stackedSections
        title={title}
        shareGallery={{ galleryUrls: galleryForShare, listingTitle: title, locale }}
      >
        <div className="flex flex-col items-center space-y-3 text-center sm:flex-row sm:space-y-0 sm:gap-x-3 sm:text-start">
          <HugeiconsIcon icon={Clock01Icon} className="h-6 w-6" strokeWidth={1.75} />
          <span>{isTour ? tourDurationLine : isCruise && cruiseMeta?.night_count ? interpolate(td.durationNightsDays, { nights: String(cruiseMeta.night_count), days: String(cruiseMeta.night_count + 1) }) : isCruise ? tourDurationLine : activityDurationLine}</span>
        </div>
        <div className="flex flex-col items-center space-y-3 text-center sm:flex-row sm:space-y-0 sm:gap-x-3 sm:text-start">
          <HugeiconsIcon icon={UserMultiple02Icon} className="h-6 w-6" strokeWidth={1.75} />
          <span>
            {isTour ? tourGroupLine : activityCapacityLine}
          </span>
        </div>
        <div className="flex flex-col items-center space-y-3 text-center sm:flex-row sm:space-y-0 sm:gap-x-3 sm:text-start">
          <HugeiconsIcon icon={Globe02Icon} className="h-6 w-6" strokeWidth={1.75} />
          <span>
            {isTour
              ? tourLanguageLine || td.languagesNotSpecified
              : isActivity
                ? siteLanguagesLine
                : (languages ?? []).length > 0
                  ? (languages ?? []).join(', ')
                  : td.languagesNotSpecified}
          </span>
        </div>
      </SectionHeader>
    )
  }

  const tourPeriodCurrency =
    rawTourPeriods?.currency_code?.trim() ||
    (listing as TListingBase & { currencyCode?: string }).currencyCode?.trim() ||
    'TRY'


  const listingPrepaymentPercent = (listing as TListingBase & { prepaymentPercent?: string }).prepaymentPercent
  const siteConfigForUrl = getSitePublicConfig()
  const tourListingPublicUrl = siteConfigForUrl.siteUrl
    ? `${siteConfigForUrl.siteUrl}${await vitrinHref(locale, `${canonicalPath}/${handle}`)}`
    : undefined
  const gezinomiQuoteOnly =
    useGezinomiTourLayout &&
    tourPeriodOptions.length > 0 &&
    tourPeriodOptions.every((p) => p.onlineCheckout === false)

  const renderSidebarPriceAndForm = () => {
    const listingMoney = listing as TListingBase & {
      priceAmount?: number
      priceCurrency?: string
      listingCurrencyCode?: string
      prepaymentPercent?: string
    }
    const priceCur =
      listingMoney.priceCurrency || listingMoney.listingCurrencyCode || undefined

    if (isTour || isCruise) {
      const Sidebar = isCruise ? CruiseBookingSidebar : TourBookingSidebar
      return (
        <Sidebar
          listingId={catalogListingId}
          listingTitle={isTour ? title : undefined}
          listingUrl={isTour ? tourListingPublicUrl : undefined}
          fallbackPrice={price}
          fallbackPriceAmount={listingMoney.priceAmount}
          fallbackPriceCurrency={priceCur}
          prepaymentPercent={listingMoney.prepaymentPercent ?? listingPrepaymentPercent}
          showReferencePrice={isTour && gezinomiQuoteOnly}
          quoteOnly={isTour && gezinomiQuoteOnly}
          locale={locale}
        />
      )
    }

    return (
      <ExperienceBookingSidebar
        listingId={catalogListingId}
        price={price}
        priceAmount={listingMoney.priceAmount}
        priceCurrency={priceCur}
        locale={locale}
      />
    )
  }

  const renderTourMainContent = () => (
    <>
      <div className={`flex min-w-0 w-full flex-col ${LISTING_DETAIL_SECTION_GAP_Y} lg:w-3/5 xl:w-[62%]`}>
        {renderSectionHeader()}
        {tourOverviewItems.length > 0 || tourProgramHtml ? (
          <TourOverviewSection items={tourOverviewItems} programHtml={tourProgramHtml} locale={locale} />
        ) : null}
        {gezinomiItineraryDays.length > 0 ? (
          <TourItineraryAccordion days={gezinomiItineraryDays} locale={locale} />
        ) : tourMeta?.itinerary?.length ? (
          <TourItineraryAccordion days={tourMeta.itinerary} locale={locale} />
        ) : null}
        {gezinomiIncludedExcluded.included.length > 0 || gezinomiIncludedExcluded.excluded.length > 0 ? (
          <TourIncludedExcludedSection
            included={gezinomiIncludedExcluded.included}
            excluded={gezinomiIncludedExcluded.excluded}
            locale={locale}
          />
        ) : tourMeta?.includes?.length || tourMeta?.excludes?.length ? (
          <TourIncludedExcludedSection
            included={tourMeta?.includes ?? []}
            excluded={tourMeta?.excludes ?? []}
            locale={locale}
          />
        ) : null}
        {gezinomiDeparturePoints.length > 0 ? (
          <TourDeparturePointsSection points={gezinomiDeparturePoints} locale={locale} />
        ) : null}
        {gezinomiPeriodTimeLabels.length > 0 ? (
          <TourPeriodTimesSection labels={gezinomiPeriodTimeLabels} locale={locale} />
        ) : null}
        <TourInfoSections
          sections={tourInfoSections}
          insertAfterSectionId={tourFlightScheduleInsertAfterSectionId(tourInfoSections)}
          insertNode={tourFlightSchedules.length > 0 ? <TourFlightScheduleSection locale={locale} /> : null}
          locale={locale}
        />
      </div>
      <div className="flex grow flex-col overflow-visible lg:min-w-[min(100%,320px)] lg:max-w-md lg:self-stretch">
        <div className="sticky top-5">{renderSidebarPriceAndForm()}</div>
      </div>
    </>
  )

  const renderNonTourMainContent = () => (
    <>
      <div className={`flex w-full flex-col ${LISTING_DETAIL_SECTION_GAP_Y} lg:w-3/5 xl:w-[64%]`}>
        {renderSectionHeader()}
        {isCruise ? (
          <>
            {cruiseOverview.length > 0 ? (
              <TourOverviewSection items={cruiseOverview} locale={locale} />
            ) : null}
            {cruiseMeta?.route_summary?.trim() ? (
              <CruiseRouteSection routeSummary={cruiseMeta.route_summary} locale={locale} />
            ) : null}
            <CruiseShipDetailsSection meta={cruiseMeta} locale={locale} />
            {cruiseCabinsList.length > 0 ? (
              <CruiseCabinPricingSection locale={locale} />
            ) : (
              <CruiseCabinsUnavailableSection locale={locale} />
            )}
            {cruiseDays.length > 0 ? (
              <TourItineraryAccordion days={cruiseDays} locale={locale} />
            ) : null}
            {cruiseServices.included.length > 0 || cruiseServices.excluded.length > 0 ? (
              <TourIncludedExcludedSection
                included={cruiseServices.included}
                excluded={cruiseServices.excluded}
                locale={locale}
              />
            ) : null}
            <TourInfoSections sections={cruiseInfo} locale={locale} />
            {description?.trim() && cruiseInfo.length === 0 && cruiseDays.length === 0 ? (
              <ActivityDescriptionSection locale={locale}>
                <ListingDescriptionExpandable locale={locale} html={description} />
              </ActivityDescriptionSection>
            ) : null}
          </>
        ) : null}
        {isActivity ? (
          <>
            <ActivityOverviewSection items={activityOverviewItems} locale={locale} />
            {description?.trim() ? (
              <ActivityDescriptionSection locale={locale}>
                <ListingDescriptionExpandable locale={locale} html={description} />
              </ActivityDescriptionSection>
            ) : null}
            <ActivityRulesSection rules={activityMeta?.rules ?? []} locale={locale} />
            {(activityVitrin?.extra_fees?.length ?? 0) > 0 ? (
              <ActivityExtraFeesSection
                fees={activityVitrin?.extra_fees ?? []}
                title={extraFeesTitle}
                locale={locale}
              />
            ) : null}
          </>
        ) : null}
        {isActivity && (activityMeta?.includes?.length || activityMeta?.excludes?.length) ? (
          <TourIncludedExcludedSection
            included={activityMeta?.includes ?? []}
            excluded={activityMeta?.excludes ?? []}
            locale={locale}
          />
        ) : null}
        {!isActivity && !isCruise ? (
          <div className="scroll-mt-28">
            <SectionDateRange
              locale={locale}
              initialDays={availabilityCalendarDays}
              initialMonthsShown={calendarMonthsShown}
            />
          </div>
        ) : null}
      </div>
      <div className="grow">
        <div className="sticky top-5">
          {isActivity ? (
            <ActivityBookingPanel
              listingId={catalogListingId}
              locale={locale}
              initialDate={activityInitialDate}
              initialSessions={initialActivitySessions}
              allSessions={allActivitySessions}
              fallbackPrice={price}
              fallbackPriceAmount={(listing as { priceAmount?: number }).priceAmount}
              fallbackPriceCurrency={(listing as { priceCurrency?: string }).priceCurrency}
              pageCurrency={(listing as { listingCurrencyCode?: string }).listingCurrencyCode}
              initialMonthsShown={calendarMonthsShown}
            />
          ) : (
            renderSidebarPriceAndForm()
          )}
        </div>
      </div>
    </>
  )

  return (
    <div>
      {detailJsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(detailJsonLd) }}
        />
      )}
      <HeaderGallery gridType={galleryImages.length >= 4 ? 'grid4' : 'grid1'} images={galleryImages} />

      <div className={`relative z-[1] mt-10 pb-16 lg:pb-24 ${LISTING_DETAIL_SECTION_GAP}`}>
        {isTour ? (
          <TourPeriodProvider
            bookablePeriods={tourPeriodOptions}
            flightSchedules={tourFlightSchedules}
            currencyCode={tourPeriodCurrency}
          >
            <main className="flex flex-col gap-6 lg:flex-row lg:items-start xl:gap-8">{renderTourMainContent()}</main>
          </TourPeriodProvider>
        ) : isCruise ? (
          <CruiseCabinProvider cabins={cruiseCabinsList}>
            <TourPeriodProvider
              bookablePeriods={cruisePeriodOptions}
              flightSchedules={[]}
              currencyCode={cruisePeriodCurrency}
            >
              <main className="flex flex-col gap-8 lg:flex-row xl:gap-10">{renderNonTourMainContent()}</main>
            </TourPeriodProvider>
          </CruiseCabinProvider>
        ) : (
          <main className="flex flex-col gap-8 lg:flex-row xl:gap-10">{renderNonTourMainContent()}</main>
        )}

        {!isTour ? <ListingDetailOurFeatures locale={locale} city={city} /> : null}

        {isTour ? (
          <>
            {tourDayPins.length > 0 ? (
              <div className="mt-8 w-full scroll-mt-28">
                <TourItineraryMapSection pins={tourDayPins} locale={locale} />
              </div>
            ) : null}
            <TourCountryInfoSection countries={tourCountryCards} locale={locale} />
            <SimilarListings
              listings={similarTourListings}
              title={dp.similarListings}
              sectionClassName={LISTING_SECTION_SHELL}
              perNightSuffix=""
            />
          </>
        ) : (
          <>
            <div id="experience-section-location" className="mt-8 w-full scroll-mt-28 space-y-5">
              {isCruise && cruiseDayPins.length > 0 ? (
                <TourItineraryMapSection pins={cruiseDayPins} locale={locale} />
              ) : (
                <SectionMap
                  locale={locale}
                  lat={map?.lat}
                  lng={map?.lng}
                  address={isCruise ? cruiseRouteLabel : (address ?? undefined)}
                  heading={dp.location}
                  subheading={isCruise ? cruiseRouteLabel : undefined}
                />
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
                sectionClassName=""
              />
            </div>

            <Divider className="my-12" />

            {isActivity && activityRegionCarouselListings.length > 0 ? (
              <div className="mb-12 flex w-full flex-col gap-y-8">
                <SimilarListings
                  listings={activityRegionCarouselListings}
                  title={regionListingsTitle}
                  sectionClassName={LISTING_SECTION_SHELL}
                  perNightSuffix=""
                />
              </div>
            ) : null}

            <div className="flex flex-col gap-8 lg:flex-row lg:gap-10">
              <div className="w-full lg:w-4/9 xl:w-1/3">
                <SectionHost
                  {...listingHostForSection(title, host)}
                  locale={locale}
                  labelVariant={isActivity ? 'listingOwner' : 'host'}
                />
              </div>
              <div className="w-full scroll-mt-28 lg:w-2/3" id="experience-section-reviews">
                <SectionListingReviews
                  listingId={listing.id}
                  reviewCount={reviewCount ?? 0}
                  reviewStart={reviewStart ?? 0}
                />
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
