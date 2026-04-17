import CategoryPageTemplate from '@/components/CategoryPageTemplate'
import FlightCard from '@/components/FlightCard'
import { getCategoryBySlug } from '@/data/category-registry'
import { getFlightFilterOptions } from '@/data/listings'
import { getRegionHeroConfig } from '@/data/region-hero-config'
import { fetchCategoryListings, parseSearchParamsFromUrl } from '@/lib/listings-fetcher'
import { Metadata } from 'next'
import { redirect } from 'next/navigation'

export async function generateMetadata(): Promise<Metadata> {
  const category = getCategoryBySlug('ucak-bileti')
  return { title: category?.name ?? 'Uçak Bileti', description: category?.heroSubheading }
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

  return (
    <CategoryPageTemplate
      category={category}
      count={total}
      listingCards={
        <div className="flex w-full flex-col gap-4 sm:col-span-2 lg:col-span-3 xl:col-span-4">
          {listings.map((l) => (
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            <FlightCard key={l.id} data={l as any} />
          ))}
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
      listingPagination={{ page, total, perPage }}
    />
  )
}
