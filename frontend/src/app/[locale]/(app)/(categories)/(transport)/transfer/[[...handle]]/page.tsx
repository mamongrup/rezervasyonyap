import CategoryPageTemplate from '@/components/CategoryPageTemplate'
import { TransferCard } from '@/components/cards'
import { getCategoryBySlug } from '@/data/category-registry'
import { getCarListingFilterOptions } from '@/data/listings'
import { regionHandleFromParams } from '@/lib/region-handle-path'
import { loadCategoryPageListingsBundle } from '@/lib/category-page-data'
import { parseSearchParamsFromUrl } from '@/lib/listings-fetcher'
import { categoryMetadata } from '@/lib/category-page-metadata'
import { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { regionLabelFromHandle } from '@/lib/stay-location-display'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale?: string }>
}): Promise<Metadata> {
  const { locale } = await params
  return categoryMetadata('transfer', locale)
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
  const category = getCategoryBySlug('transfer')
  if (!category) return redirect('/')

  const query = parseSearchParamsFromUrl(sp)
  const {
    result: { listings, total, page, perPage, fromApi },
    filterOptions,
    heroOverride,
  } = await loadCategoryPageListingsBundle(
    'transfer',
    query,
    { regionHandle: currentHandle },
    locale,
    getCarListingFilterOptions(),
  )

  const regionLabel =
    currentHandle && currentHandle !== 'all' ? regionLabelFromHandle(currentHandle) : undefined

  return (
    <CategoryPageTemplate
      category={category}
      count={total}
      listingCards={listings.map((l) => (
         
        <TransferCard key={l.id} data={l as any} />
      ))}
       
      listingCardRenderer={(l) => <TransferCard key={l.id} data={l as any} />}
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
