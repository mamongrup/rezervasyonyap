import CategoryPageTemplate from '@/components/CategoryPageTemplate'
import FlightCard from '@/components/FlightCard'
import FlightLiveSearch from '@/components/FlightLiveSearch'
import { getCategoryBySlug } from '@/data/category-registry'
import { getFlightFilterOptions } from '@/data/listings'
import { getRegionHeroConfig } from '@/data/region-hero-config'
import { resolveFlightAirportCode } from '@/lib/flight-airports'
import { regionHandleFromParams } from '@/lib/region-handle-path'
import { fetchCategoryListings, parseSearchParamsFromUrl } from '@/lib/listings-fetcher'
import { getMessages } from '@/utils/getT'
import { Metadata } from 'next'
import { redirect } from 'next/navigation'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale?: string }>
}): Promise<Metadata> {
  const { locale } = await params
  const msgs = getMessages(locale)
  const category = getCategoryBySlug('ucak-bileti')
  return {
    title: category?.name ?? msgs.Header.DropdownTravelers.Flights,
    description: category?.heroSubheading ?? msgs.Header.DropdownTravelers['Flight description'],
  }
}

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ handle?: string[]; locale: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const { handle, locale } = await params
  const sp = await searchParams
  const msgs = getMessages(locale)
  const currentHandle = regionHandleFromParams(handle)
  const category = getCategoryBySlug('ucak-bileti')
  if (!category) return redirect('/')

  const query = parseSearchParamsFromUrl(sp)
  const { listings, total, page, perPage, fromApi } = await fetchCategoryListings('ucak-bileti', query, {
    regionHandle: currentHandle,
  })

  const [filterOptions, heroOverride] = await Promise.all([
    getFlightFilterOptions(),
    getRegionHeroConfig('ucak-bileti', currentHandle ?? ''),
  ])

  const regionLabel =
    currentHandle && currentHandle !== 'all' ? currentHandle.replace(/-/g, ' ') : undefined

  const liveFromRaw = query.from?.trim()
  const liveToRaw = query.to?.trim()
  const liveFrom = liveFromRaw ? resolveFlightAirportCode(liveFromRaw) ?? liveFromRaw.toUpperCase() : ''
  const liveTo = liveToRaw ? resolveFlightAirportCode(liveToRaw) ?? liveToRaw.toUpperCase() : ''
  const liveDate = query.checkin?.trim()
  const showLiveSearch = Boolean(liveFrom && liveTo && liveDate)

  return (
    <CategoryPageTemplate
      category={category}
      count={total}
      listingCards={
        <div className="flex w-full flex-col gap-4 sm:col-span-2 lg:col-span-3 xl:col-span-4">
          {showLiveSearch ? (
            <FlightLiveSearch
              locale={locale}
              params={{
                from: liveFrom,
                to: liveTo,
                date: liveDate!,
                adults: query.guests ? parseInt(String(query.guests), 10) || 1 : 1,
                cabinClass: query.class,
                trip: query.trip,
              }}
            />
          ) : (
            listings.map((l) => (
              <FlightCard key={l.id} data={l as any} msgs={msgs.flightCard} />
            ))
          )}
        </div>
      }
      filterOptions={filterOptions}
      currentHandle={currentHandle}
      locale={locale}
      heroOverride={heroOverride}
      isSearchResults={!!currentHandle && currentHandle !== 'all'}
      allListings={listings}
      listingLinkBase={category.detailRoute}
      priceUnit={category.priceUnit}
      activeSearch={{
        location: query.location,
        checkin: query.checkin,
        checkout: query.checkout,
        guests: query.guests,
        from: query.from,
        to: query.to,
        regionLabel,
        fromApi,
      }}
      listingSectionTitle={showLiveSearch ? msgs.flightLiveSearch?.resultsHeading : undefined}
      listingPagination={showLiveSearch ? undefined : { page, total, perPage }}
    />
  )
}
