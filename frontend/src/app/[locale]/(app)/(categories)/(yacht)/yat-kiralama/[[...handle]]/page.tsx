import CategoryPageTemplate from '@/components/CategoryPageTemplate'
import { YachtCard } from '@/components/cards'
import { getCategoryBySlug } from '@/data/category-registry'
import { getStayListingFilterOptions } from '@/data/listings'
import { getRegionHeroConfig } from '@/data/region-hero-config'
import { fetchCategoryListings, parseSearchParamsFromUrl } from '@/lib/listings-fetcher'
import { Metadata } from 'next'
import { redirect } from 'next/navigation'

export async function generateMetadata(): Promise<Metadata> {
  const category = getCategoryBySlug('yat-kiralama')
  return { title: category?.name ?? 'Yat Kiralama', description: category?.heroSubheading }
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
  const category = getCategoryBySlug('yat-kiralama')
  if (!category) return redirect('/')

  const query = parseSearchParamsFromUrl(sp)
  const { listings, total, page, perPage, fromApi } = await fetchCategoryListings('yat-kiralama', query, {
    regionHandle: currentHandle,
  })

  const [filterOptions, heroOverride] = await Promise.all([
    getStayListingFilterOptions(),
    getRegionHeroConfig('yat-kiralama', currentHandle ?? ''),
  ])

  const regionLabel =
    currentHandle && currentHandle !== 'all' ? currentHandle.replace(/-/g, ' ') : undefined

  return (
    <CategoryPageTemplate
      category={category}
      count={total}
      listingCards={listings.map((l) => (
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        <YachtCard key={l.id} data={l as any} />
      ))}
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      listingCardRenderer={(l) => <YachtCard key={l.id} data={l as any} />}
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
