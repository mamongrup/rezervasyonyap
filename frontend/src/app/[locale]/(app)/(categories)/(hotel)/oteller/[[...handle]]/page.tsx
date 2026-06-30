import CategoryPageTemplate from '@/components/CategoryPageTemplate'
import { HotelCard } from '@/components/cards'
import { getCategoryBySlug } from '@/data/category-registry'
import { regionHandleFromParams } from '@/lib/region-handle-path'
import { getHotelCategoryFilterOptions } from '@/lib/category-filter-options'
import { loadCategoryPageListingsBundle } from '@/lib/category-page-data'
import { parseSearchParamsFromUrl } from '@/lib/listings-fetcher'
import { categoryMetadata } from '@/lib/category-page-metadata'
import { parseFeaturedVitrinTab } from '@/lib/featured-tab-view-all'
import type { Metadata } from 'next'
import { redirect } from 'next/navigation'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale?: string }>
}): Promise<Metadata> {
  const { locale } = await params
  return categoryMetadata('oteller', locale)
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
  const currentHandle = regionHandleFromParams(handle)

  const category = getCategoryBySlug('oteller')
  if (!category) return redirect('/')

  const query = parseSearchParamsFromUrl(sp)
  const {
    result: { listings, total, page, perPage, fromApi },
    filterOptions,
    heroOverride,
  } = await loadCategoryPageListingsBundle(
    'oteller',
    query,
    { regionHandle: currentHandle },
    locale,
    getHotelCategoryFilterOptions(locale),
  )

  const regionLabel =
    currentHandle && currentHandle !== 'all' ? currentHandle.replace(/-/g, ' ') : undefined

  return (
    <CategoryPageTemplate
      category={category}
      count={total}
      listingCards={listings.map((l) => (
         
        <HotelCard key={l.id} data={l as any} />
      ))}
       
      listingCardRenderer={(l) => <HotelCard key={l.id} data={l as any} />}
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
        lastMinute: query.last_minute === '1',
        vitrinTab: parseFeaturedVitrinTab(query.vitrin_tab),
      }}
      listingPagination={{ page, total, perPage }}
    />
  )
}
