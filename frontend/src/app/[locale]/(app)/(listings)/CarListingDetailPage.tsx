import { getCarListingByHandle, listingHostForSection } from '@/data/listings'
import ButtonPrimary from '@/shared/ButtonPrimary'
import { Divider } from '@/shared/divider'
import { getMessages } from '@/utils/getT'
import { interpolate } from '@/utils/interpolate'
import { Backpack02Icon, HumidityIcon, SeatSelectorIcon, Settings03Icon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { Metadata } from 'next'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { guessCalendarMonthsShownFromRequest } from '@/lib/calendar-months-shown-server'
import { normalizeCatalogVertical } from '@/lib/catalog-listing-vertical'
import type { CatalogListingVerticalCode } from '@/lib/catalog-listing-vertical'
import {
  detailPathForVertical,
  transportBrowsePathForVertical,
} from '@/lib/listing-detail-routes'
import { vitrinHref } from '@/lib/vitrin-href'
import { fetchPublicListingAvailabilityDaysSafe, resolvePublishedListingIdForStayPage } from '@/lib/travel-api'
import Yolcu360CarReserveButton from '@/components/listings/Yolcu360CarReserveButton'
import {
  carRentalBrowseQueryFromContext,
  fetchYolcu360CarListings,
  findYolcu360Listing,
  resolveYolcu360SearchFromUrl,
  yolcu360ListingFromSnap,
} from '@/lib/yolcu360-car-search'
import CarCatalogBookingSidebar from './CarCatalogBookingSidebar'
import HeaderGallery from './components/HeaderGallery'
import SectionDateRange from './components/SectionDateRange'
import SectionHeader from './components/SectionHeader'
import { SectionHeading } from './components/SectionHeading'
import SectionHost from './components/SectionHost'
import ListingDetailOurFeatures from './components/ListingDetailOurFeatures'
import SectionListingReviews from './components/SectionListingReviews'
import SectionMap from './components/SectionMap'

export async function generateCarListingMetadata({
  params,
}: {
  params: Promise<{ locale: string; handle: string }>
}): Promise<Metadata> {
  const { handle, locale } = await params
  const listing = await getCarListingByHandle(handle, locale)

  const dp = getMessages(locale).listing.detailPage
  if (!listing) {
    return {
      title: dp.notFoundTitle,
      description: dp.notFoundDescription,
    }
  }

  return {
    title: listing?.title,
    description: listing?.description,
  }
}

export default async function CarListingDetailPage({
  params,
  searchParams,
  linkBase,
}: {
  params: Promise<{ locale: string; handle: string }>
  searchParams?: Promise<Record<string, string | string[] | undefined>>
  linkBase: string
}) {
  const { handle: rawHandle, locale } = await params
  const handle = rawHandle.split('?')[0]
  const sp = (await searchParams) ?? {}
  const calendarMonthsShown = await guessCalendarMonthsShownFromRequest()
  const referer = (await headers()).get('referer')

  if (handle.startsWith('yolcu360-')) {
    const yolcu360Detail = await renderYolcu360CarDetail({
      handle,
      locale,
      searchParams: sp,
      referer,
    })
    if (yolcu360Detail) return yolcu360Detail
    const searchCtx = resolveYolcu360SearchFromUrl(sp, referer)
    const browseQs = carRentalBrowseQueryFromContext(sp, searchCtx)
    return redirect(
      await vitrinHref(
        locale,
        `/arac-kiralama/all${browseQs ? `?${browseQs}` : ''}`,
      ),
    )
  }

  const listing = await getCarListingByHandle(handle, locale)

  if (!listing?.id) {
    return redirect(await vitrinHref(locale, '/arac-kiralama/all'))
  }

  const vertical = normalizeCatalogVertical(listing.listingVertical) ?? 'car_rental'
  if (vertical === 'ferry') {
    return redirect(await vitrinHref(locale, `${detailPathForVertical('ferry')}/${handle}`))
  }
  const transportCodes: CatalogListingVerticalCode[] = ['car_rental', 'transfer']
  if (!transportCodes.includes(vertical)) {
    return redirect(await vitrinHref(locale, transportBrowsePathForVertical(vertical)))
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
    price,
    reviewCount,
    reviewStart,
    title,
    host,
    seats,
    airbags,
    gearshift,
    bags,
    pickUpAddress,
    dropOffAddress,
    dropOffTime,
    pickUpTime,
  } = listing

  const m = getMessages(locale)
  const cd = m.listing.carDetail

  const carListingId = catalogListingId ?? listing.id

  const renderSectionHeader = () => {
    return (
      <SectionHeader
        address={address ?? ''}
        listingCategory={listingCategory ?? ''}
        reviewCount={reviewCount ?? 0}
        reviewStart={reviewStart ?? 0}
        title={title}
      >
        <div className="flex items-center gap-x-3">
          <HugeiconsIcon icon={SeatSelectorIcon} size={20} color="currentColor" strokeWidth={1.5} />
          <span>{interpolate(cd.seats, { count: String(seats ?? 0) })}</span>
        </div>
        <div className="flex items-center gap-x-3">
          <HugeiconsIcon icon={Settings03Icon} size={20} color="currentColor" strokeWidth={1.5} />
          <span> {gearshift ?? ''}</span>
        </div>
        <div className="flex items-center gap-x-3">
          <HugeiconsIcon icon={HumidityIcon} size={20} color="currentColor" strokeWidth={1.5} />
          <span>{interpolate(cd.airbags, { count: String(airbags ?? 0) })}</span>
        </div>
        <div className="flex items-center gap-x-3">
          <HugeiconsIcon icon={Backpack02Icon} size={20} color="currentColor" strokeWidth={1.5} />
          <span>
            {bags ?? 0} {cd.largeBags}
          </span>
        </div>
      </SectionHeader>
    )
  }

  const renderSidebarPriceAndForm = () => {
    return (
      <>
        <div className="listingSection__wrap sm:shadow-xl">
          <SectionHeading>{cd.pickUpDropOffTitle}</SectionHeading>
          <div className="flex gap-x-4">
            <div className="flex shrink-0 flex-col items-center py-2">
              <span className="block size-6 rounded-full border border-neutral-400"></span>
              <span className="my-1 block grow border-l border-dashed border-neutral-400"></span>
              <span className="block size-6 rounded-full border border-neutral-400"></span>
            </div>
            <div className="flex flex-col gap-y-14 text-sm">
              <div className="flex flex-col gap-y-2">
                <span className="text-neutral-500 dark:text-neutral-400">{pickUpTime}</span>
                <span className="font-semibold">{pickUpAddress}</span>
              </div>
              <div className="flex flex-col gap-y-2">
                <span className="text-neutral-500 dark:text-neutral-400">{dropOffTime}</span>
                <span className="font-semibold">{dropOffAddress}</span>
              </div>
            </div>
          </div>
        </div>

        <CarCatalogBookingSidebar
          listingId={carListingId}
          price={price}
          reviewStart={reviewStart ?? 0}
          reviewCount={reviewCount ?? 0}
          locale={locale}
        />
      </>
    )
  }

  return (
    <div>
      <HeaderGallery gridType="grid3" images={galleryImgs ?? []} />

      <main className="relative z-[1] mt-10 flex flex-col gap-8 lg:flex-row xl:gap-10">
        <div className="flex w-full flex-col gap-y-8 lg:w-3/5 xl:w-[64%] xl:gap-y-10">
          {renderSectionHeader()}
          <SectionDateRange
            locale={locale}
            initialDays={availabilityCalendarDays}
            initialMonthsShown={calendarMonthsShown}
          />
        </div>

        <div className="grow">{renderSidebarPriceAndForm()}</div>
      </main>

      <ListingDetailOurFeatures locale={locale} city={listing.city} />

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

        <SectionMap locale={locale} />
      </div>
    </div>
  )
}

function firstString(v: string | string[] | undefined): string {
  return (Array.isArray(v) ? v[0] : v)?.trim() ?? ''
}

async function renderYolcu360CarDetail({
  handle,
  locale,
  searchParams,
  referer,
}: {
  handle: string
  locale: string
  searchParams: Record<string, string | string[] | undefined>
  referer?: string | null
}) {
  const searchCtx = resolveYolcu360SearchFromUrl(searchParams, referer)

  // 1. URL snapshot'tan hızlı render (kategori sayfasından navigasyonda her zaman mevcut)
  let car: Awaited<ReturnType<typeof yolcu360ListingFromSnap>> =
    yolcu360ListingFromSnap(searchParams, handle)

  // 2. Snap yoksa API'den araç listesi çek ve bul
  let cars: Awaited<ReturnType<typeof fetchYolcu360CarListings>> = null
  if (!car && searchCtx) {
    const { pickup: p, dropoff: d, checkin: ci, checkout: co } = searchCtx
    cars = await fetchYolcu360CarListings({ pickup: p, dropoff: d, checkin: ci, checkout: co })

    if (cars?.length) {
      const listingParams: Record<string, string | string[] | undefined> = { ...searchParams }
      if (!firstString(listingParams.y360_idx)) {
        const idxMatch = handle.match(/^yolcu360-(\d+)$/)
        if (idxMatch) listingParams.y360_idx = idxMatch[1]
      }
      if (!firstString(listingParams.y360_code) && referer) {
        try {
          const code = new URL(referer).searchParams.get('y360_code')?.trim()
          if (code) listingParams.y360_code = code
        } catch {
          /* yoksay */
        }
      }
      car = findYolcu360Listing(cars, handle, listingParams) ?? null
    }
  }

  if (!car) return null

  const carIndexRaw = firstString(searchParams.y360_idx)
  const carIndex = Number.isFinite(Number.parseInt(carIndexRaw, 10))
    ? Number.parseInt(carIndexRaw, 10)
    : cars?.findIndex((item) => item.handle === car!.handle) ?? -1

  const pickup = searchCtx?.pickup ?? firstString(searchParams.location)
  const dropoff = searchCtx?.dropoff ?? firstString(searchParams.drop_off_location) ?? pickup
  const checkin = searchCtx?.checkin ?? firstString(searchParams.checkin)
  const checkout = searchCtx?.checkout ?? firstString(searchParams.checkout)

  const m = getMessages(locale)
  const cd = m.listing.carDetail
  const y360 = cd.yolcu360
  const query = new URLSearchParams()
  if (pickup) query.set('location', pickup)
  if (checkin) query.set('checkin', checkin)
  if (checkout) query.set('checkout', checkout)
  if (dropoff && dropoff !== pickup) query.set('drop_off_location', dropoff)
  query.set('drop_off', dropoff && dropoff !== pickup ? 'different' : 'same')
  const browseHref = await vitrinHref(locale, `/arac-kiralama/all${query.toString() ? `?${query.toString()}` : ''}`)

  return (
    <div>
      <HeaderGallery gridType="grid3" images={car.galleryImgs ?? []} />

      <main className="relative z-[1] mt-10 flex flex-col gap-8 lg:flex-row xl:gap-10">
        <div className="flex w-full flex-col gap-y-8 lg:w-3/5 xl:w-[64%] xl:gap-y-10">
          <SectionHeader
            address={pickup}
            listingCategory={m.categoryPage.verticalLabels.car_rental}
            reviewCount={0}
            reviewStart={0}
            title={car.title}
            showReviews={false}
          >
            {car.seats ? (
              <div className="flex items-center gap-x-3">
                <HugeiconsIcon icon={SeatSelectorIcon} size={20} color="currentColor" strokeWidth={1.5} />
                <span>{interpolate(cd.seats, { count: String(car.seats) })}</span>
              </div>
            ) : null}
            {car.gearshift ? (
              <div className="flex items-center gap-x-3">
                <HugeiconsIcon icon={Settings03Icon} size={20} color="currentColor" strokeWidth={1.5} />
                <span>{car.gearshift}</span>
              </div>
            ) : null}
            {car.yolcu360Bags ? (
              <div className="flex items-center gap-x-3">
                <HugeiconsIcon icon={Backpack02Icon} size={20} color="currentColor" strokeWidth={1.5} />
                <span>
                  {car.yolcu360Bags} {cd.largeBags}
                </span>
              </div>
            ) : null}
          </SectionHeader>

          <div className="listingSection__wrap">
            <SectionHeading>{y360.heading}</SectionHeading>
            <p className="text-sm leading-6 text-neutral-600 dark:text-neutral-300">
              {y360.description}
            </p>
            <div className="mt-5 grid gap-3 text-sm text-neutral-700 sm:grid-cols-2 dark:text-neutral-200">
              <div className="rounded-2xl bg-neutral-50 p-4 dark:bg-neutral-800">
                <span className="block text-neutral-500 dark:text-neutral-400">{y360.pickup}</span>
                <strong>{pickup || '-'}</strong>
              </div>
              <div className="rounded-2xl bg-neutral-50 p-4 dark:bg-neutral-800">
                <span className="block text-neutral-500 dark:text-neutral-400">{y360.dropoff}</span>
                <strong>{dropoff || pickup || '-'}</strong>
              </div>
              <div className="rounded-2xl bg-neutral-50 p-4 dark:bg-neutral-800">
                <span className="block text-neutral-500 dark:text-neutral-400">{y360.checkin}</span>
                <strong>{checkin || '-'}</strong>
              </div>
              <div className="rounded-2xl bg-neutral-50 p-4 dark:bg-neutral-800">
                <span className="block text-neutral-500 dark:text-neutral-400">{y360.checkout}</span>
                <strong>{checkout || '-'}</strong>
              </div>
              {car.yolcu360VendorName ? (
                <div className="rounded-2xl bg-neutral-50 p-4 dark:bg-neutral-800">
                  <span className="block text-neutral-500 dark:text-neutral-400">{y360.vendor}</span>
                  <strong>{car.yolcu360VendorName}</strong>
                </div>
              ) : null}
              {car.yolcu360FuelType ? (
                <div className="rounded-2xl bg-neutral-50 p-4 dark:bg-neutral-800">
                  <span className="block text-neutral-500 dark:text-neutral-400">{y360.fuel}</span>
                  <strong>{car.yolcu360FuelType}</strong>
                </div>
              ) : null}
            </div>
          </div>
        </div>

        <div className="grow">
          <div className="sticky top-5 listingSection__wrap sm:shadow-xl">
            <div className="flex justify-between">
              <span className="text-3xl font-semibold">
                {car.price}
                <span className="ml-1 text-base font-normal text-neutral-500 dark:text-neutral-400">
                  {cd.pricePerDay}
                </span>
              </span>
            </div>
            {car.yolcu360TotalPrice && car.yolcu360TotalPrice > 0 ? (
              <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-300">
                {y360.totalEstimate}:{' '}
                <strong>
                  {new Intl.NumberFormat(locale, {
                    style: 'currency',
                    currency: car.priceCurrency ?? 'TRY',
                    maximumFractionDigits: 0,
                  }).format(car.yolcu360TotalPrice)}
                </strong>
              </p>
            ) : null}
            <Yolcu360CarReserveButton
              locale={locale}
              car={car}
              pickup={pickup}
              dropoff={dropoff || pickup}
              checkin={checkin}
              checkout={checkout}
              carIndex={carIndex >= 0 ? carIndex : undefined}
              className="mt-8"
            />
            <ButtonPrimary href={browseHref} className="mt-4 w-full" outline>
              {y360.backToSearch}
            </ButtonPrimary>
          </div>
        </div>
      </main>

      <Divider className="my-16" />
    </div>
  )
}
