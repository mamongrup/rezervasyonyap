import StartRating from '@/components/StartRating'
import { getExperienceListingByHandle, listingHostForSection } from '@/data/listings'
import ButtonPrimary from '@/shared/ButtonPrimary'
import { DescriptionDetails, DescriptionList, DescriptionTerm } from '@/shared/description-list'
import { Divider } from '@/shared/divider'
import { Table, TableBody, TableCell, TableRow } from '@/shared/table'
import T from '@/utils/getT'
import {
  CheckmarkCircle01Icon,
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
import { SectionHeading } from './components/SectionHeading'
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

  const renderSectionInfo = () => {
    const thingsToDo = [
      {
        name: 'Explore the beautiful landscapes of Trang An',
        time: '7:30 AM - 8:00 AM',
        description:
          'Experience the breathtaking scenery of Trang An, a UNESCO World Heritage site, with its stunning limestone karsts and lush greenery.',
      },
      {
        name: 'Visit the ancient temples and pagodas',
        time: '10:30 AM - 12:15 PM',
        description:
          'Discover the rich history and culture of Vietnam by visiting ancient temples and pagodas in the area, including the famous Bai Dinh Pagoda.',
      },
      {
        name: 'Enjoy a traditional Vietnamese meal',
        time: '12:15 PM - 1:30 PM',
        description:
          'Savor the flavors of Vietnam with a delicious traditional meal, featuring local ingredients and authentic recipes.',
      },
      {
        name: 'Take a boat ride through the scenic waterways',
        time: '1:30 PM - 3:30 PM',
        description:
          'Experience the tranquility of the waterways by taking a boat ride through the picturesque landscapes of Trang An, surrounded by towering limestone cliffs and lush vegetation.',
      },
      {
        name: 'Hike to the top of Mua Cave for panoramic views',
        time: '3:45 PM - 5:30 PM',
        description:
          'Challenge yourself with a hike to the top of Mua Cave, where you will be rewarded with breathtaking panoramic views of the surrounding countryside and rice paddies.',
      },
      {
        name: 'Relax and unwind in nature',
        time: '5:30 PM - 6:30 PM',
        description:
          'Take a moment to relax and unwind in the serene natural surroundings of Trang An, enjoying the peaceful atmosphere and fresh air.',
      },
      {
        name: 'Return to Hanoi',
        time: '6:30 PM - 8:00 PM',
        description:
          'After a day filled with exploration and adventure, return to Hanoi, reflecting on the unforgettable experiences and memories made during the tour.',
      },
    ]

    return (
      <div className="listingSection__wrap">
        <SectionHeading>Experiences descriptions</SectionHeading>
        <Divider className="w-14!" />

        <Table>
          <TableBody>
            {thingsToDo.map((item, index) => (
              <TableRow key={index}>
                <TableCell className="font-medium">{item.time}</TableCell>
                <TableCell>
                  <div className="max-w-lg leading-relaxed sm:text-pretty">
                    <p className="font-medium">{item.name}</p>
                    <p className="mt-2.5 text-sm text-neutral-500 dark:text-neutral-400">{item.description}</p>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    )
  }

  const renderSectionIncludes = () => {
    const includes_demo = [
      { name: 'Set Menu Lunch on boat' },
      { name: 'Express Bus From Hanoi To Halong' },
      { name: 'Mineral Water On Express Bus' },
      { name: 'Kayak or Bamboo Boat. Life Jacket.' },
      { name: 'Halong Bay Entrance Ticket' },
      { name: 'English Speaking Tour Guide' },
    ]
    return (
      <div className="listingSection__wrap">
        <SectionHeading>Included in the price </SectionHeading>
        <Divider className="w-14!" />

        <div className="grid grid-cols-1 gap-6 text-sm text-neutral-700 lg:grid-cols-2 dark:text-neutral-300">
          {includes_demo.map((item) => (
            <div key={item.name} className="flex items-center gap-x-3">
              <HugeiconsIcon icon={CheckmarkCircle01Icon} className="mt-px h-6 w-6 shrink-0" strokeWidth={1.75} />
              <span>{item.name}</span>
            </div>
          ))}
        </div>
      </div>
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

        <DescriptionList>
          <DescriptionTerm>$19.00 x 3 adults</DescriptionTerm>
          <DescriptionDetails className="sm:text-right">$57.00</DescriptionDetails>
          <DescriptionTerm>Service charge</DescriptionTerm>
          <DescriptionDetails className="sm:text-right">$0.00</DescriptionDetails>
          <DescriptionTerm className="font-semibold text-neutral-900">Total</DescriptionTerm>
          <DescriptionDetails className="font-semibold sm:text-right">$57.00</DescriptionDetails>
        </DescriptionList>

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
          {renderSectionInfo()}
          {renderSectionIncludes()}
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
