import CategoryPageTemplate from '@/components/CategoryPageTemplate'
import { TourCard } from '@/components/cards'
import { getCategoryBySlug } from '@/data/category-registry'
import { regionHandleFromParams } from '@/lib/region-handle-path'
import { getTourCategoryFilterOptions } from '@/lib/category-filter-options'
import { loadCategoryPageListingsBundle } from '@/lib/category-page-data'
import { parseSearchParamsFromUrl } from '@/lib/listings-fetcher'
import { isTourSubcategorySlug } from '@/lib/tour-subcategory-routes'
import { getSubcategoryBySlug } from '@/data/subcategory-registry'
import { categoryMetadata } from '@/lib/category-page-metadata'
import { Metadata } from 'next'
import { redirect } from 'next/navigation'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale?: string }>
}): Promise<Metadata> {
  const { locale } = await params
  return categoryMetadata('turlar', locale)
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
  const category = getCategoryBySlug('turlar')
  if (!category) return redirect('/')

  const query = parseSearchParamsFromUrl(sp)
  const {
    result: { listings, total, page, perPage, fromApi },
    filterOptions,
    heroOverride,
  } = await loadCategoryPageListingsBundle(
    'turlar',
    query,
    { regionHandle: currentHandle },
    locale,
    getTourCategoryFilterOptions(locale),
  )

  const isTourSubHandle =
    currentHandle && currentHandle !== 'all' && isTourSubcategorySlug(currentHandle)
  const propertyTypeLabel = isTourSubHandle
    ? (getSubcategoryBySlug(currentHandle!)?.name ?? currentHandle)
    : undefined
  const regionLabel =
    !isTourSubHandle && currentHandle && currentHandle !== 'all'
      ? currentHandle.replace(/-/g, ' ')
      : undefined

  return (
    <CategoryPageTemplate
      category={category}
      count={total}
      listingCards={listings.map((l) => (
         
        <TourCard key={l.id} data={l as any} />
      ))}
       
      listingCardRenderer={(l) => <TourCard key={l.id} data={l as any} />}
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
        propertyTypeLabel,
        fromApi,
      }}
      listingPagination={{ page, total, perPage }}
    />
  )
}
