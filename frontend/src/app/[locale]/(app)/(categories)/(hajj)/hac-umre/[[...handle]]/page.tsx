import CategoryPageTemplate from '@/components/CategoryPageTemplate'
import { HajjCard } from '@/components/cards'
import { getCategoryBySlug } from '@/data/category-registry'
import { getExperienceListingFilterOptions } from '@/data/listings'
import { getRegionHeroConfig } from '@/data/region-hero-config'
import { fetchCategoryListings, parseSearchParamsFromUrl } from '@/lib/listings-fetcher'
import { Metadata } from 'next'
import { redirect } from 'next/navigation'
import type { TListingHajj } from '@/types/listing-types'

export async function generateMetadata(): Promise<Metadata> {
  const category = getCategoryBySlug('hac-umre')
  return { title: category?.name ?? 'Hac & Umre', description: category?.heroSubheading }
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
  const category = getCategoryBySlug('hac-umre')
  if (!category) return redirect('/')

  const query = parseSearchParamsFromUrl(sp)
  const { listings, total, page, perPage, fromApi } = await fetchCategoryListings('hac-umre', query, {
    regionHandle: currentHandle,
  })

  const [filterOptions, heroOverride] = await Promise.all([
    getExperienceListingFilterOptions(),
    getRegionHeroConfig('hac-umre', currentHandle ?? ''),
  ])

  const hajjListings: TListingHajj[] = listings.map((l) => ({
    ...l,
    packageType: 'umre' as const,
    departureCity: 'İstanbul',
    nights: 14,
    hotelStars: 4,
    flightIncluded: true,
    transportIncluded: true,
    visaIncluded: true,
  }))

  const regionLabel =
    currentHandle && currentHandle !== 'all' ? currentHandle.replace(/-/g, ' ') : undefined

  return (
    <CategoryPageTemplate
      category={category}
      count={total}
      listingCards={hajjListings.map((l) => <HajjCard key={l.id} data={l} />)}
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
      listingPagination={{ page, total, perPage }}
    />
  )
}
