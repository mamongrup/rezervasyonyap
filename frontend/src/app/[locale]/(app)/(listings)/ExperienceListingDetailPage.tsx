import StartRating from '@/components/StartRating'
import { getExperienceListingByHandle, listingHostForSection } from '@/data/listings'
import ButtonPrimary from '@/shared/ButtonPrimary'
import { Divider } from '@/shared/divider'
import T from '@/utils/getT'
import {
  Clock01Icon,
  Globe02Icon,
  UserMultiple02Icon,
} from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { Metadata } from 'next'
import Form from 'next/form'
import { redirect } from 'next/navigation'
import NearbyPlacesSection from '@/components/travel/NearbyPlacesSection'
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
  getPublicListingPriceLines,
  getVerticalMeta,
  listPublicActivitySessions,
  resolvePublishedListingIdForStayPage,
} from '@/lib/travel-api'
import { unwrapVerticalMetaPayload } from '@/lib/listing-pools'
import { guessCalendarMonthsShownFromRequest } from '@/lib/calendar-months-shown-server'
import { regionPlacesSlugFromCity } from '@/lib/region-places-slug'
import { getMessages } from '@/utils/getT'
import { buildExperienceListingDetailJsonLd } from '@/lib/seo/listing-detail-jsonld'
import type { TListingBase } from '@/types/listing-types'
import type { CatalogListingVerticalCode } from '@/lib/catalog-listing-vertical'
import DatesRangeInputPopover from './components/DatesRangeInputPopover'
import GuestsInputPopover from './components/GuestsInputPopover'
import HeaderGallery from './components/HeaderGallery'
import SectionDateRange from './components/SectionDateRange'
import SectionHeader from './components/SectionHeader'
import SectionHost from './components/SectionHost'
import ListingDetailOurFeatures from './components/ListingDetailOurFeatures'
import SectionListingReviews from './components/SectionListingReviews'
import SectionMap from './components/SectionMap'
import ActivityBookingPanel from './ActivityBookingPanel'
import ActivityOverviewSection, { type ActivityOverviewItem } from './ActivityDetailSections'
import {
  TourIncludedExcludedSection,
  TourItinerarySection,
  TourNotesSection,
  TourOverviewSection,
  TourSectionNav,
  type TourItineraryDay,
  type TourOverviewItem,
  type TourSectionNavItem,
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

function travelTypeLabel(code: string): string {
  switch (code) {
    case 'plane':
      return 'Uçaklı tur'
    case 'bus':
      return 'Otobüslü tur'
    case 'both':
      return 'Uçak + otobüs'
    case 'own':
      return 'Kendi aracıyla'
    default:
      return ''
  }
}

function accommodationTypeLabel(code: string): string {
  switch (code) {
    case 'hotel':
      return 'Otel konaklamalı'
    case 'hostel':
      return 'Hostel konaklamalı'
    case 'villa':
      return 'Villa konaklamalı'
    case 'camping':
      return 'Kamp konaklamalı'
    case 'none':
      return 'Konaklama yok'
    default:
      return ''
  }
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

  if (!listing) {
    return {
      title: 'Listing not found',
      description: 'The listing you are looking for does not exist.',
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
  const [availabilityCalendarDays, rawTourMeta, rawActivityMeta, priceLines, initialActivitySessions] = await Promise.all([
    fetchPublicListingAvailabilityDaysSafe(catalogListingId),
    vertical === 'tour'
      ? getVerticalMeta(catalogListingId, 'tour').catch(() => null)
      : Promise.resolve(null),
    vertical === 'activity'
      ? getVerticalMeta(catalogListingId, 'activity').catch(() => null)
      : Promise.resolve(null),
    vertical === 'tour'
      ? getPublicListingPriceLines(catalogListingId, locale).catch(() => null)
      : Promise.resolve(null),
    vertical === 'activity'
      ? listPublicActivitySessions(catalogListingId, activityInitialDate).catch(() => ({ sessions: [] }))
      : Promise.resolve({ sessions: [] }),
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
  const dp = getMessages(locale).listing.detailPage
  const isTour = vertical === 'tour'
  const isActivity = vertical === 'activity'
  const tourMeta = isTour ? parseTourMeta(rawTourMeta) : null
  const activityMeta = isActivity ? parseActivityMeta(rawActivityMeta) : null
  const tourLanguages = splitMetaList(tourMeta?.languages)
  const tourDurationLine = tourMeta?.duration_days
    ? `${tourMeta.duration_days} gün`
    : durationTime || 'Süre belirtilmedi'
  const tourGroupLine = tourMeta?.max_people
    ? `Maks. ${tourMeta.max_people} kişi`
    : maxGuests
      ? `Maks. ${maxGuests} kişi`
      : 'Kapasite belirtilmedi'
  const tourDescriptionHtml = description?.trim() ? sanitizeRichCmsHtml(description) : ''
  const tourOverviewItems: TourOverviewItem[] = isTour
    ? [
        tourDurationLine ? { label: 'Süre', value: tourDurationLine, icon: 'duration' } : null,
        tourGroupLine ? { label: 'Katılım', value: tourGroupLine, icon: 'group' } : null,
        tourMeta?.travel_type && travelTypeLabel(tourMeta.travel_type)
          ? { label: 'Ulaşım', value: travelTypeLabel(tourMeta.travel_type), icon: 'transport' }
          : null,
        tourMeta?.accommodation_type && accommodationTypeLabel(tourMeta.accommodation_type)
          ? { label: 'Konaklama', value: accommodationTypeLabel(tourMeta.accommodation_type), icon: 'location' }
          : null,
        tourMeta?.is_guided ? { label: 'Rehber', value: 'Rehberli tur', icon: 'guide' } : null,
        tourMeta?.visa_required ? { label: 'Vize', value: 'Vize gerektirir', icon: 'visa' } : null,
        tourLanguages.length > 0
          ? { label: 'Dil', value: tourLanguages.join(', '), icon: 'language' }
          : null,
      ].filter((item): item is TourOverviewItem => item !== null)
    : []
  const tourIncludedLines = uniqueLines([
    ...(tourMeta?.includes ?? []),
    ...(priceLines?.included ?? []).map((line) => line.label),
  ])
  const tourExcludedLines = uniqueLines([
    ...(tourMeta?.excludes ?? []),
    ...(priceLines?.excluded ?? []).map((line) => line.label),
  ])
  const listingBase = listing as TListingBase
  const tourNotes = uniqueLines([
    tourMeta?.min_day_before_booking
      ? `Rezervasyon en az ${tourMeta.min_day_before_booking} gün önceden yapılmalıdır.`
      : '',
    listingBase.prepaymentPercent?.trim()
      ? `Ön ödeme oranı: %${listingBase.prepaymentPercent.trim()}.`
      : '',
    listingBase.cancellationPolicyText?.trim() ?? '',
  ])
  const tourNavItems: TourSectionNavItem[] = isTour
    ? [
        tourOverviewItems.length > 0 || tourDescriptionHtml ? { id: 'tour-section-overview', label: 'Genel Bilgiler' } : null,
        (tourMeta?.itinerary ?? []).length > 0
          ? { id: 'tour-section-program', label: 'Program', eyebrow: String(tourMeta?.itinerary?.length ?? '') }
          : null,
        tourIncludedLines.length > 0 || tourExcludedLines.length > 0
          ? { id: 'tour-section-services', label: 'Dahil/Hariç' }
          : null,
        { id: 'tour-section-dates', label: 'Tarih ve Fiyat' },
        tourNotes.length > 0 ? { id: 'tour-section-notes', label: 'Önemli Notlar' } : null,
        { id: 'tour-section-location', label: 'Konum' },
      ].filter((item): item is TourSectionNavItem => item !== null)
    : []
  const activityOverviewItems: ActivityOverviewItem[] = isActivity
    ? [
        activityMeta?.duration_hours
          ? { label: 'Süre', value: `${activityMeta.duration_hours} saat`, icon: 'duration' }
          : null,
        activityMeta?.min_age
          ? { label: 'Minimum yaş', value: `${activityMeta.min_age}+`, icon: 'age' }
          : null,
        activityMeta?.max_participants
          ? { label: 'Kapasite', value: `Maks. ${activityMeta.max_participants} kişi`, icon: 'capacity' }
          : null,
        activityMeta?.language
          ? { label: 'Dil', value: activityMeta.language, icon: 'language' }
          : null,
        activityMeta?.meeting_point
          ? { label: 'Buluşma noktası', value: activityMeta.meeting_point, icon: 'meeting' }
          : null,
        activityMeta?.equipment_included
          ? { label: 'Dahil ekipman', value: activityMeta.equipment_included, icon: 'equipment' }
          : null,
      ].filter((item): item is ActivityOverviewItem => item !== null)
    : []

  const handleSubmitForm = async (formData: FormData) => {
    'use server'
    redirect('/checkout')
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
        title={title}
        shareGallery={{ galleryUrls: galleryForShare, listingTitle: title, locale }}
      >
        <div className="flex flex-col items-center space-y-3 text-center sm:flex-row sm:space-y-0 sm:gap-x-3 sm:text-start">
          <HugeiconsIcon icon={Clock01Icon} className="h-6 w-6" strokeWidth={1.75} />
          <span>{isTour ? tourDurationLine : durationTime}</span>
        </div>
        <div className="flex flex-col items-center space-y-3 text-center sm:flex-row sm:space-y-0 sm:gap-x-3 sm:text-start">
          <HugeiconsIcon icon={UserMultiple02Icon} className="h-6 w-6" strokeWidth={1.75} />
          <span>{isTour ? tourGroupLine : `Up to ${maxGuests} people`}</span>
        </div>
        <div className="flex flex-col items-center space-y-3 text-center sm:flex-row sm:space-y-0 sm:gap-x-3 sm:text-start">
          <HugeiconsIcon icon={Globe02Icon} className="h-6 w-6" strokeWidth={1.75} />
          <span>
            {isTour
              ? tourLanguages.length > 0 ? tourLanguages.join(', ') : 'Dil bilgisi belirtilmedi'
              : (languages ?? []).length > 0 ? (languages ?? []).join(', ') : 'Languages not specified'}
          </span>
        </div>
      </SectionHeader>
    )
  }

  const renderSidebarPriceAndForm = () => {
    return (
      <div className="listingSection__wrap sm:shadow-xl">
        <div className="flex justify-between">
          <span className="text-3xl font-semibold">
            {price}
            <span className="ml-1 text-base font-normal text-neutral-500 dark:text-neutral-400">/person</span>
          </span>
          <StartRating size="lg" point={reviewStart ?? 0} reviewCount={reviewCount ?? 0} />
        </div>

        <Form
          action={handleSubmitForm}
          className="flex flex-col rounded-3xl border border-neutral-200 dark:border-neutral-700"
          id="booking-form"
        >
          <DatesRangeInputPopover className="z-11 flex-1" locale={locale} />
          <div className="w-full border-b border-neutral-200 dark:border-neutral-700"></div>
          <GuestsInputPopover className="flex-1" />
        </Form>

        <ButtonPrimary form="booking-form" type="submit">
          {T['common']['Reserve']}
        </ButtonPrimary>
      </div>
    )
  }

  return (
    <div>
      {detailJsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(detailJsonLd) }}
        />
      )}
      <HeaderGallery gridType="grid4" images={galleryImgs ?? []} />

      <main className="relative z-[1] mt-10 flex flex-col gap-8 lg:flex-row xl:gap-10">
        <div className="flex w-full flex-col gap-y-8 lg:w-3/5 xl:w-[64%] xl:gap-y-10">
          {renderSectionHeader()}
          {isTour ? <TourSectionNav items={tourNavItems} /> : null}
          {isTour ? (
            <>
              <div id="tour-section-overview" className="scroll-mt-28">
                <TourOverviewSection
                  items={tourOverviewItems}
                  description={
                    tourDescriptionHtml ? (
                      <div dangerouslySetInnerHTML={{ __html: tourDescriptionHtml }} />
                    ) : null
                  }
                />
              </div>
              <div id="tour-section-program" className="scroll-mt-28">
                <TourItinerarySection days={tourMeta?.itinerary ?? []} />
              </div>
              <div id="tour-section-services" className="scroll-mt-28">
                <TourIncludedExcludedSection included={tourIncludedLines} excluded={tourExcludedLines} />
              </div>
            </>
          ) : null}
          {isActivity ? (
            <ActivityOverviewSection
              items={activityOverviewItems}
              description={
                description?.trim() ? (
                  <div dangerouslySetInnerHTML={{ __html: sanitizeRichCmsHtml(description) }} />
                ) : null
              }
            />
          ) : null}
          {!isActivity ? (
            <div id={isTour ? 'tour-section-dates' : undefined} className="scroll-mt-28">
              <SectionDateRange
                locale={locale}
                initialDays={availabilityCalendarDays}
                initialMonthsShown={calendarMonthsShown}
              />
            </div>
          ) : null}
          {isTour ? (
            <div id="tour-section-notes" className="scroll-mt-28">
              <TourNotesSection notes={tourNotes} />
            </div>
          ) : null}
        </div>

        <div className="grow">
          <div className="sticky top-5">
            {isActivity ? (
              <ActivityBookingPanel
                listingId={catalogListingId}
                initialDate={activityInitialDate}
                initialSessions={initialActivitySessions.sessions}
                fallbackPrice={price}
              />
            ) : (
              renderSidebarPriceAndForm()
            )}
          </div>
        </div>
      </main>

      <ListingDetailOurFeatures locale={locale} city={city} />

      <Divider className="my-16" />

      <div className="flex flex-col gap-y-10">
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

        <div id={isTour ? 'tour-section-location' : undefined} className="scroll-mt-28">
          <SectionMap />
        </div>

        <NearbyPlacesSection
          locale={locale}
          regionSlug={regionPlacesSlugFromCity(city)}
          title={dp.nearbyPlaces}
          maxCategories={3}
        />
      </div>
    </div>
  )
}
