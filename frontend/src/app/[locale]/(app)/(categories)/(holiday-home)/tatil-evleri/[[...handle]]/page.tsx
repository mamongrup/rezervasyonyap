import CategoryPageTemplate from '@/components/CategoryPageTemplate'
import { HolidayHomeCard } from '@/components/cards'
import { getCategoryBySlug } from '@/data/category-registry'
import { getStayListingFilterOptions } from '@/data/listings'
import { getRegionHeroConfig } from '@/data/region-hero-config'
import {
  fetchCategoryListings,
  fetchFlexibleHolidayListings,
  parseSearchParamsFromUrl,
} from '@/lib/listings-fetcher'
import { Metadata } from 'next'
import { redirect } from 'next/navigation'

export async function generateMetadata(): Promise<Metadata> {
  const category = getCategoryBySlug('tatil-evleri')
  return { title: category?.name ?? 'Tatil Evleri', description: category?.heroSubheading }
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
  const currentHandle = handle?.[0]
  const category = getCategoryBySlug('tatil-evleri')
  if (!category) return redirect('/')

  const query = parseSearchParamsFromUrl(sp)
  const { listings, total, page, perPage, fromApi } = await fetchCategoryListings(
    'tatil-evleri',
    query,
    {
      regionHandle: currentHandle,
    },
    locale,
  )

  const pageNum = page
  const flexibleListings =
    pageNum === 1
      ? await fetchFlexibleHolidayListings(
          new Set(listings.map((l) => l.id)),
          query,
          { regionHandle: currentHandle },
          locale,
        )
      : []

  const [filterOptions, heroOverride] = await Promise.all([
    getStayListingFilterOptions(),
    getRegionHeroConfig('tatil-evleri', currentHandle ?? ''),
  ])

  const regionLabel =
    currentHandle && currentHandle !== 'all' ? currentHandle.replace(/-/g, ' ') : undefined

  return (
    <CategoryPageTemplate
      category={category}
      count={total}
      listingCards={listings.map((l) => (
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        <HolidayHomeCard key={l.id} data={l as any} />
      ))}
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      listingCardRenderer={(l) => <HolidayHomeCard key={l.id} data={l as any} />}
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
        regionLabel,
        fromApi,
      }}
      flexibleListingCards={
        flexibleListings.length > 0
          ? flexibleListings.map((l) => (
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              <HolidayHomeCard key={`flex-${l.id}`} data={l as any} />
            ))
          : undefined
      }
      listingPagination={{ page, total, perPage }}
    />
  )
}
