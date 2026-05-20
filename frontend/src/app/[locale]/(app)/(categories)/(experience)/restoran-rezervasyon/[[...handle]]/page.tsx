import CategoryPageTemplate from '@/components/CategoryPageTemplate'
import { RestaurantTableCard } from '@/components/cards'
import { getCategoryBySlug } from '@/data/category-registry'
import { getExperienceListingFilterOptions } from '@/data/listings'
import { getRegionHeroConfig } from '@/data/region-hero-config'
import { fetchCategoryListings, parseSearchParamsFromUrl } from '@/lib/listings-fetcher'
import { Metadata } from 'next'
import { redirect } from 'next/navigation'

export async function generateMetadata(): Promise<Metadata> {
  const category = getCategoryBySlug('restoran-rezervasyon')
  return {
    title: category?.name ?? 'Restoran Rezervasyonu',
    description: category?.heroSubheading,
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
  const currentHandle = handle?.[0]
  const category = getCategoryBySlug('restoran-rezervasyon')
  if (!category) return redirect('/')

  const query = parseSearchParamsFromUrl(sp)
  const { listings, total, page, perPage, fromApi } = await fetchCategoryListings(
    'restoran-rezervasyon',
    query,
    {
      regionHandle: currentHandle,
    },
    locale,
  )

  const [filterOptions, heroOverride] = await Promise.all([
    getExperienceListingFilterOptions(locale),
    getRegionHeroConfig('restoran-rezervasyon', currentHandle ?? ''),
  ])

  const regionLabel =
    currentHandle && currentHandle !== 'all' ? currentHandle.replace(/-/g, ' ') : undefined

  return (
    <CategoryPageTemplate
      category={category}
      count={total}
      listingCards={listings.map((l) => (
        <RestaurantTableCard key={l.id} data={l as any} />
      ))}
      listingCardRenderer={(l) => <RestaurantTableCard key={l.id} data={l as any} />}
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
