import ListingDescriptionExpandable from '@/components/listing/ListingDescriptionExpandable'
import { getFerryListingByHandle } from '@/data/listings'
import { fetchCategoryListings } from '@/lib/listings-fetcher'
import type { TListingFerry } from '@/types/listing-types'
import FerryBookingSidebar from './FerryBookingSidebar'
import ExperienceBookingSidebar from './ExperienceBookingSidebar'
import { HugeiconsIcon } from '@hugeicons/react'
import { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { normalizeCatalogVertical } from '@/lib/catalog-listing-vertical'
import { detailPathForVertical, transportBrowsePathForVertical } from '@/lib/listing-detail-routes'
import { vitrinHref } from '@/lib/vitrin-href'
import { getPublicFerryDetails } from '@/lib/travel-api'
import { getMessages } from '@/utils/getT'
import { interpolate } from '@/utils/interpolate'
import HeaderGallery from './components/HeaderGallery'
import SectionHeader from './components/SectionHeader'
import ListingDetailOurFeatures from './components/ListingDetailOurFeatures'
import SimilarListings from './components/SimilarListings'
import FerryPriceTableSection from './FerryPriceTableSection'
import FerrySailingsSection from './FerrySailingsSection'
import { Divider } from '@/shared/divider'
import { FerryBoatIcon, Timer02Icon } from '@hugeicons/core-free-icons'

export async function generateFerryListingMetadata({
  params,
}: {
  params: Promise<{ locale: string; handle: string }>
}): Promise<Metadata> {
  const { handle, locale } = await params
  const listing = await getFerryListingByHandle(handle, locale)
  const dp = getMessages(locale).listing.detailPage
  if (!listing) {
    return { title: dp.notFoundTitle, description: dp.notFoundDescription }
  }
  return { title: listing.title, description: listing.description }
}

export default async function FerryListingDetailPage({
  params,
  linkBase,
}: {
  params: Promise<{ locale: string; handle: string }>
  linkBase: string
}) {
  const { handle: rawHandle, locale } = await params
  const handle = rawHandle.split('?')[0]
  const listing = await getFerryListingByHandle(handle, locale)

  if (!listing?.id) {
    return redirect(await vitrinHref(locale, '/feribot/all'))
  }

  const vertical = normalizeCatalogVertical(listing.listingVertical)
  if (vertical !== 'ferry') {
    return redirect(await vitrinHref(locale, transportBrowsePathForVertical(vertical ?? 'ferry')))
  }

  const canonicalPath = detailPathForVertical('ferry')
  if (linkBase !== canonicalPath) {
    redirect(await vitrinHref(locale, `${canonicalPath}/${handle}`))
  }

  // listing.id zaten yayınlanmış katalog id'si; tekrar çözmeye gerek yok.
  const catalogListingId = listing.id
  const [ferryDetails, similarRes] = await Promise.all([
    catalogListingId ? getPublicFerryDetails(catalogListingId) : Promise.resolve(null),
    fetchCategoryListings('feribot', {}, {}, locale).catch(() => ({ listings: [] })),
  ])

  const m = getMessages(locale)
  const dp = m.listing.detailPage
  const fd = m.listing.ferryDetail
  const cm = m.listing.cardMeta
  const ferryLinkBase = detailPathForVertical('ferry')
  const similarFerryListings = similarRes.listings
    .filter((l) => l.handle !== handle)
    .slice(0, 8)
    .map((l) => {
      const f = l as TListingFerry
      const route =
        f.fromPort && f.toPort ? `${f.fromPort} → ${f.toPort}` : (l.address ?? '')
      return {
        id: l.id,
        title: l.title,
        handle: l.handle,
        address: route,
        price: l.price ?? '',
        priceAmount: l.priceAmount,
        priceAmountMax: l.priceAmountMax,
        priceCurrency: l.priceCurrency,
        reviewStart: l.reviewStart ?? 0,
        reviewCount: l.reviewCount ?? 0,
        featuredImage: l.featuredImage ?? '',
        listingCategory: l.listingCategory ?? m.categoryPage.verticalLabels.ferry,
        linkBase: ferryLinkBase,
      }
    })

  const {
    title,
    description,
    galleryImgs,
    featuredImage,
    listingCategory,
    reviewCount,
    reviewStart,
    price,
    fromPort,
    toPort,
    company,
    durationMin,
    address,
  } = listing

  const from = ferryDetails?.from_port_label || fromPort || ''
  const to = ferryDetails?.to_port_label || toPort || ''
  const operator = ferryDetails?.operator_name || company || 'Tilos Travel'
  const images =
    galleryImgs && galleryImgs.length > 0
      ? galleryImgs
      : featuredImage
        ? [featuredImage]
        : []

  const ferryListingId = catalogListingId ?? listing.id

  return (
    <div>
      <HeaderGallery gridType="grid3" images={images} />

      <main className="relative z-[1] mt-10 flex flex-col gap-8 lg:flex-row xl:gap-10">
        <div className="flex w-full flex-col gap-y-8 lg:w-3/5 xl:w-[64%] xl:gap-y-10">
          <SectionHeader
            address={address ?? ''}
            listingCategory={listingCategory ?? m.categoryPage.verticalLabels.ferry}
            reviewCount={reviewCount ?? 0}
            reviewStart={reviewStart ?? 0}
            title={title}
            listingId={listing.id}
          >
            {from && to ? (
              <div className="flex items-center gap-x-3">
                <HugeiconsIcon icon={FerryBoatIcon} size={20} color="currentColor" strokeWidth={1.5} />
                <span>
                  {from} → {to}
                </span>
              </div>
            ) : null}
            <div className="flex items-center gap-x-3">
              <HugeiconsIcon icon={FerryBoatIcon} size={20} color="currentColor" strokeWidth={1.5} />
              <span>{interpolate(fd.operatorLabel, { name: operator })}</span>
            </div>
            {durationMin != null ? (
              <div className="flex items-center gap-x-3">
                <HugeiconsIcon icon={Timer02Icon} size={20} color="currentColor" strokeWidth={1.5} />
                <span>{interpolate(cm.ferryMinutes, { minutes: String(Math.round(durationMin / 60)) })}</span>
              </div>
            ) : null}
          </SectionHeader>

          {description?.trim() ? (
            <div className="listingSection__wrap">
              <h2 className="text-xl font-semibold">{fd.aboutRoute}</h2>
              <ListingDescriptionExpandable html={description} locale={locale} />
            </div>
          ) : null}

          {ferryDetails?.sailings &&
          ((ferryDetails.sailings.departures?.length ?? 0) > 0 ||
            ferryDetails.sailings.vessel?.trim()) ? (
            <FerrySailingsSection sailings={ferryDetails.sailings} locale={locale} />
          ) : null}

          {ferryDetails?.ticket_fares?.length ? (
            <FerryPriceTableSection
              fares={ferryDetails.ticket_fares}
              portTaxes={ferryDetails.port_taxes ?? []}
              agePolicy={ferryDetails.age_policy ?? {}}
              portTaxesIncluded={ferryDetails.port_taxes_included}
              currencyCode={ferryDetails.currency_code}
              locale={locale}
            />
          ) : null}

          {ferryDetails?.timetable_url?.trim() ? (
            <div className="listingSection__wrap">
              <h2 className="text-xl font-semibold">{fd.timetableTitle}</h2>
              <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-300">
                <a
                  href={ferryDetails.timetable_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-primary-600 hover:underline dark:text-primary-400"
                >
                  {fd.timetableLink}
                </a>
              </p>
            </div>
          ) : null}
        </div>

        <div className="grow">
          {ferryDetails?.ticket_fares?.length ? (
            <FerryBookingSidebar
              listingId={ferryListingId}
              fares={ferryDetails.ticket_fares}
              currencyCode={ferryDetails.currency_code}
              fallbackPrice={price}
              locale={locale}
            />
          ) : (
            <ExperienceBookingSidebar listingId={ferryListingId} price={price} locale={locale} />
          )}
        </div>
      </main>

      <ListingDetailOurFeatures locale={locale} city={listing.city} />

      <Divider className="my-16" />

      {similarFerryListings.length > 0 ? (
        <SimilarListings
          listings={similarFerryListings}
          title={dp.similarListings}
          perNightSuffix={fd.pricePerPerson}
        />
      ) : null}
    </div>
  )
}
