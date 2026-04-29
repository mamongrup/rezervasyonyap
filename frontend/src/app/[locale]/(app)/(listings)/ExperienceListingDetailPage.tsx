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
import { stripHtml } from '@/lib/social-share/strip-html'
import { normalizeCatalogVertical } from '@/lib/catalog-listing-vertical'
import {
  detailPathForVertical,
  experienceBrowsePathForVertical,
} from '@/lib/listing-detail-routes'
import { vitrinHref } from '@/lib/vitrin-href'
import { fetchPublicListingAvailabilityDaysSafe, resolvePublishedListingIdForStayPage } from '@/lib/travel-api'
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

export async function generateExperienceListingMetadata({
  params,
}: {
  params: Promise<{ locale: string; handle: string }>
}): Promise<Metadata> {
  const { handle, locale } = await params
  const listing = await getExperienceListingByHandle(handle)

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
  const listing = await getExperienceListingByHandle(handle)
  if (!listing?.id) {
    return redirect(await vitrinHref(locale, '/turlar/all'))
  }

  const vertical = normalizeCatalogVertical(listing.listingVertical) ?? 'activity'
  const experienceCodes: CatalogListingVerticalCode[] = ['tour', 'activity', 'cruise', 'hajj', 'visa']
  if (!experienceCodes.includes(vertical)) {
    return redirect(await vitrinHref(locale, experienceBrowsePathForVertical(vertical)))
  }

  const canonicalPath = detailPathForVertical(vertical)
  if (linkBase !== canonicalPath) {
    redirect(await vitrinHref(locale, `${canonicalPath}/${handle}`))
  }

  const catalogListingId = await resolvePublishedListingIdForStayPage(handle, locale)
  const availabilityCalendarDays = await fetchPublicListingAvailabilityDaysSafe(catalogListingId)

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
          <span>{durationTime}</span>
        </div>
        <div className="flex flex-col items-center space-y-3 text-center sm:flex-row sm:space-y-0 sm:gap-x-3 sm:text-start">
          <HugeiconsIcon icon={UserMultiple02Icon} className="h-6 w-6" strokeWidth={1.75} />
          <span>Up to {maxGuests} people</span>
        </div>
        <div className="flex flex-col items-center space-y-3 text-center sm:flex-row sm:space-y-0 sm:gap-x-3 sm:text-start">
          <HugeiconsIcon icon={Globe02Icon} className="h-6 w-6" strokeWidth={1.75} />
          <span>
            {(languages ?? []).length > 0 ? (languages ?? []).join(', ') : 'Languages not specified'}
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
          <SectionDateRange
            locale={locale}
            initialDays={availabilityCalendarDays}
            initialMonthsShown={calendarMonthsShown}
          />
        </div>

        <div className="grow">
          <div className="sticky top-5">{renderSidebarPriceAndForm()}</div>
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

        <SectionMap />

        <NearbyPlacesSection
          regionSlug={regionPlacesSlugFromCity(city)}
          title={dp.nearbyPlaces}
          maxCategories={3}
        />
      </div>
    </div>
  )
}
