import CategoryPageTemplate from '@/components/CategoryPageTemplate'
import { ActivityCard } from '@/components/cards'
import { getCategoryBySlug } from '@/data/category-registry'
import { getExperienceListingFilterOptions } from '@/data/listings'
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
  return categoryMetadata('aktiviteler', locale)
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
  const category = getCategoryBySlug('aktiviteler')
  if (!category) return redirect('/')

  const query = parseSearchParamsFromUrl(sp)
  const {
    result: { listings, total, page, perPage, fromApi },
    filterOptions,
    heroOverride,
  } = await loadCategoryPageListingsBundle(
    'aktiviteler',
    query,
    { regionHandle: currentHandle },
    locale,
    getExperienceListingFilterOptions(locale),
  )

  const regionLabel =
    currentHandle && currentHandle !== 'all' ? regionLabelFromHandle(currentHandle) : undefined

  return (
    <CategoryPageTemplate
      category={category}
      count={total}
      listingCards={listings.map((l) => (
         
        <ActivityCard key={l.id} data={l as any} />
      ))}
       
      listingCardRenderer={(l) => <ActivityCard key={l.id} data={l as any} />}
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
