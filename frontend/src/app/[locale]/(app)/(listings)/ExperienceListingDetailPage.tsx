import ListingDescriptionExpandable from '@/components/listing/ListingDescriptionExpandable'
import TourItineraryMapSection from '@/components/listing/TourItineraryMapSection'
import { parseTourDayPins } from '@/lib/tour-itinerary-geocoder'
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
  resolvePublishedListingIdForStayPage,
} from '@/lib/travel-api'
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
import { guessCalendarMonthsShownFromRequest } from '@/lib/calendar-months-shown-server'
import { regionPlacesSlugFromCity } from '@/lib/region-places-slug'
import { getMessages } from '@/utils/getT'
import { interpolate } from '@/utils/interpolate'
import { buildExperienceListingDetailJsonLd } from '@/lib/seo/listing-detail-jsonld'
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
import TourFlightScheduleSection from './TourFlightScheduleSection'
import { TourPeriodProvider } from './TourPeriodContext'
import ActivityOverviewSection, { type ActivityOverviewItem } from './ActivityDetailSections'
import {
  TourIncludedExcludedSection,
  TourInfoSections,
  TourItinerarySection,
  TourOverviewSection,
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
  }
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
  const calendarMonthsShown = await guessCalendarMonthsShownFromRequest()
  const listing = await getExperienceListingByHandle(handle, locale)
  if (!listing?.id) {
    return redirect(await vitrinHref(locale, '/turlar/all'))
  }

  const vertical = normalizeCatalogVertical(listing.listingVertical) ?? 'activity'
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

  const catalogListingId = (await resolvePublishedListingIdForStayPage(handle, locale)) ?? listing.id
  const activityInitialDate = new Date().toISOString().slice(0, 10)
  const [
    availabilityCalendarDays,
    rawTourMeta,
    rawActivityMeta,
    initialActivitySessions,
    rawTourPeriods,
    tourCountryCards,
    similarToursRes,
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
      ? listPublicActivitySessions(catalogListingId, activityInitialDate).catch(() => ({ sessions: [] }))
      : Promise.resolve({ sessions: [] }),
    vertical === 'tour'
      ? getPublicTourPeriods(catalogListingId).catch(() => null)
      : Promise.resolve(null),
    vertical === 'tour'
      ? resolveTourCountryCards(catalogListingId).catch(() => [])
      : Promise.resolve([]),
    vertical === 'tour'
      ? fetchCategoryListings('turlar', {}, {}, locale).catch(() => ({ listings: [] }))
      : Promise.resolve({ listings: [] }),
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

  const city = (listing as TListingBase).city
  const m = getMessages(locale)
  const dp = m.listing.detailPage
  const td = m.listing.tourDetail
  const ad = m.listing.activityDetail
  const isTour = vertical === 'tour'
  const isActivity = vertical === 'activity'
  const tourMeta = isTour ? parseTourMeta(rawTourMeta) : null
  const tourPeriodOptions = isTour && rawTourPeriods ? mergeTourPeriodOptions(rawTourPeriods) : []
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
  const tourLanguages = splitMetaList(tourMeta?.languages)
  const tourGroupLine = tourMeta?.max_people
    ? interpolate(td.maxPeople, { count: tourMeta.max_people })
    : maxGuests
      ? interpolate(td.maxPeople, { count: String(maxGuests) })
      : td.capacityNotSpecified
  const tourDescriptionStripped =
    isTour && description?.trim() ? stripFlightScheduleBlockFromDescription(description) : description
  const parsedTourDescription =
    isTour && tourDescriptionStripped?.trim()
      ? parseTourDescription(tourDescriptionStripped)
      : { programHtml: '', infoSections: [] }
  const tourProgramHtml = parsedTourDescription.programHtml.trim()
    ? sanitizeRichCmsHtml(parsedTourDescription.programHtml)
    : ''
  const tourDayPins = isTour ? parseTourDayPins(parsedTourDescription.programHtml) : []
  const tourInfoSections = parsedTourDescription.infoSections.map((section) => ({
    ...section,
    html: sanitizeRichCmsHtml(section.html),
  }))
  const tourOverviewItems: TourOverviewItem[] = isTour
    ? [
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
        tourLanguages.length > 0
          ? { label: td.overview.language, value: tourLanguages.join(', '), icon: 'language' }
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
          reviewStart: l.reviewStart ?? 0,
          reviewCount: l.reviewCount ?? 0,
          featuredImage: l.featuredImage ?? '',
          listingCategory: l.listingCategory ?? '',
          linkBase: tourLinkBase,
        }))
    : []
  const activityOverviewItems: ActivityOverviewItem[] = isActivity
    ? [
        activityMeta?.duration_hours
          ? {
              label: ad.overview.duration,
              value: interpolate(ad.overview.durationHours, { hours: activityMeta.duration_hours }),
              icon: 'duration',
            }
          : null,
        activityMeta?.min_age
          ? {
              label: ad.overview.minAge,
              value: interpolate(ad.overview.minAgeValue, { age: activityMeta.min_age }),
              icon: 'age',
            }
          : null,
        activityMeta?.max_participants
          ? {
              label: ad.overview.capacity,
              value: interpolate(ad.overview.maxParticipants, { count: activityMeta.max_participants }),
              icon: 'capacity',
            }
          : null,
        activityMeta?.language
          ? { label: ad.overview.language, value: activityMeta.language, icon: 'language' }
          : null,
        activityMeta?.meeting_point
          ? { label: ad.overview.meetingPoint, value: activityMeta.meeting_point, icon: 'meeting' }
          : null,
        activityMeta?.equipment_included
          ? { label: ad.overview.equipment, value: activityMeta.equipment_included, icon: 'equipment' }
          : null,
      ].filter((item): item is ActivityOverviewItem => item !== null)
    : []

  const renderSidebarPriceAndForm = () => {
    if (isTour) {
      return (
        <TourBookingSidebar listingId={catalogListingId} fallbackPrice={price} locale={locale} />
      )
    }

    return (
      <ExperienceBookingSidebar
        listingId={catalogListingId}
        price={price}
        locale={locale}
      />
    )
  }

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
          <span>{isTour ? tourDurationLine : durationTime}</span>
        </div>
        <div className="flex flex-col items-center space-y-3 text-center sm:flex-row sm:space-y-0 sm:gap-x-3 sm:text-start">
          <HugeiconsIcon icon={UserMultiple02Icon} className="h-6 w-6" strokeWidth={1.75} />
          <span>
            {isTour
              ? tourGroupLine
              : maxGuests
                ? interpolate(dp.upToPeople, { count: String(maxGuests) })
                : td.capacityNotSpecified}
          </span>
        </div>
        <div className="flex flex-col items-center space-y-3 text-center sm:flex-row sm:space-y-0 sm:gap-x-3 sm:text-start">
          <HugeiconsIcon icon={Globe02Icon} className="h-6 w-6" strokeWidth={1.75} />
          <span>
            {isTour
              ? tourLanguages.length > 0 ? tourLanguages.join(', ') : td.languagesNotSpecified
              : (languages ?? []).length > 0 ? (languages ?? []).join(', ') : td.languagesNotSpecified}
          </span>
        </div>
      </SectionHeader>
    )
  }

  const tourPeriodCurrency =
    rawTourPeriods?.currency_code?.trim() ||
    (listing as TListingBase & { currencyCode?: string }).currencyCode?.trim() ||
    'TRY'

  const renderTourMainContent = () => (
    <>
      <div className={`flex w-full flex-col ${LISTING_DETAIL_SECTION_GAP_Y} lg:w-3/5 xl:w-[64%]`}>
        {renderSectionHeader()}
        {tourOverviewItems.length > 0 || tourProgramHtml ? (
          <TourOverviewSection items={tourOverviewItems} programHtml={tourProgramHtml} locale={locale} />
        ) : null}
        <TourInfoSections
          sections={tourInfoSections}
          insertAfterSectionId={tourFlightScheduleInsertAfterSectionId(tourInfoSections)}
          insertNode={tourFlightSchedules.length > 0 ? <TourFlightScheduleSection locale={locale} /> : null}
          locale={locale}
        />
        {tourDayPins.length > 0 && (
          <TourItineraryMapSection pins={tourDayPins} locale={locale} />
        )}
        {tourMeta?.itinerary?.length ? (
          <TourItinerarySection days={tourMeta.itinerary} locale={locale} />
        ) : null}
        {tourMeta?.includes?.length || tourMeta?.excludes?.length ? (
          <TourIncludedExcludedSection
            included={tourMeta?.includes ?? []}
            excluded={tourMeta?.excludes ?? []}
            locale={locale}
          />
        ) : null}
      </div>
      <div className="grow">
        <div className="sticky top-5">{renderSidebarPriceAndForm()}</div>
      </div>
    </>
  )

  const renderNonTourMainContent = () => (
    <>
      <div className={`flex w-full flex-col ${LISTING_DETAIL_SECTION_GAP_Y} lg:w-3/5 xl:w-[64%]`}>
        {renderSectionHeader()}
        {isActivity ? (
          <ActivityOverviewSection
            items={activityOverviewItems}
            locale={locale}
            description={
              description?.trim() ? (
                <ListingDescriptionExpandable locale={locale} html={description} />
              ) : null
            }
          />
        ) : null}
        {isActivity && (activityMeta?.includes?.length || activityMeta?.excludes?.length) ? (
          <TourIncludedExcludedSection
            included={activityMeta?.includes ?? []}
            excluded={activityMeta?.excludes ?? []}
            locale={locale}
          />
        ) : null}
        {!isActivity ? (
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
              initialSessions={initialActivitySessions.sessions}
              fallbackPrice={price}
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
      <HeaderGallery gridType="grid4" images={galleryImgs ?? []} />

      <div className={`relative z-[1] mt-10 pb-16 lg:pb-24 ${LISTING_DETAIL_SECTION_GAP}`}>
        {isTour ? (
          <TourPeriodProvider
            bookablePeriods={tourPeriodOptions}
            flightSchedules={tourFlightSchedules}
            currencyCode={tourPeriodCurrency}
          >
            <main className="flex flex-col gap-8 lg:flex-row xl:gap-10">{renderTourMainContent()}</main>
          </TourPeriodProvider>
        ) : (
          <main className="flex flex-col gap-8 lg:flex-row xl:gap-10">{renderNonTourMainContent()}</main>
        )}

        {!isTour ? <ListingDetailOurFeatures locale={locale} city={city} /> : null}

        {isTour ? (
          <>
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
            <div className="flex flex-col gap-8 lg:flex-row lg:gap-10">
              <div className="w-full lg:w-4/9 xl:w-1/3">
                <SectionHost {...listingHostForSection(title, host)} locale={locale} />
              </div>
              <div className="w-full lg:w-2/3">
                <SectionListingReviews
                  listingId={listing.id}
                  reviewCount={reviewCount ?? 0}
                  reviewStart={reviewStart ?? 0}
                />
              </div>
            </div>

            <div className="scroll-mt-28">
              <SectionMap />
            </div>

            <NearbyPlacesSection
              locale={locale}
              regionSlug={regionPlacesSlugFromCity(city)}
              title={dp.nearbyPlaces}
              maxCategories={3}
              sectionClassName={LISTING_SECTION_SHELL}
            />
          </>
        )}
      </div>
    </div>
  )
}
