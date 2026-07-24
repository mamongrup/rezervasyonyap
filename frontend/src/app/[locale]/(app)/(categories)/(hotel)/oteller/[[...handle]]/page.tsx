import CategoryPageTemplate from '@/components/CategoryPageTemplate'
import { HotelCard } from '@/components/cards'
import { getCategoryBySlug } from '@/data/category-registry'
import { regionHandleFromParams } from '@/lib/region-handle-path'
import { getHotelCategoryFilterOptions } from '@/lib/category-filter-options'
import { categoryFacetRouteFromHandle } from '@/lib/category-facet-routes'
import { facetLabelFromRoute, redirectCategoryFacetFromQuery } from '@/lib/category-facet-redirect'
import { categoryPageShellProps, loadCategoryPageListingsBundle } from '@/lib/category-page-data'
import { parseSearchParamsFromUrl } from '@/lib/listings-fetcher'
import { categoryMetadata } from '@/lib/category-page-metadata'
import { parseFeaturedVitrinTab } from '@/lib/featured-tab-view-all'
import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { regionLabelFromHandle } from '@/lib/stay-location-display'

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

  await redirectCategoryFacetFromQuery(locale, 'oteller', sp, currentHandle)

  const query = parseSearchParamsFromUrl(sp)
  const {
    result: { listings, total, page, perPage, fromApi },
    filterOptions,
    heroOverride,
    shell,
  } = await loadCategoryPageListingsBundle(
    'oteller',
    query,
    { regionHandle: currentHandle },
    locale,
    getHotelCategoryFilterOptions(locale),
  )

  const pathFacetRoute =
    currentHandle && currentHandle !== 'all'
      ? categoryFacetRouteFromHandle('oteller', locale, currentHandle)
      : undefined
  const facetLabel = pathFacetRoute
    ? facetLabelFromRoute(
        pathFacetRoute,
        filterOptions.map((f) => ({
          name: f.name,
          options: f.tabUIType === 'checkbox' ? f.options : [],
        })),
      )
    : undefined
  const regionLabel =
    !pathFacetRoute && currentHandle && currentHandle !== 'all'
      ? regionLabelFromHandle(currentHandle)
      : undefined

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
        propertyTypeLabel: facetLabel,
        fromApi,
        lastMinute: query.last_minute === '1',
        vitrinTab: parseFeaturedVitrinTab(query.vitrin_tab),
      }}
      listingPagination={{ page, total, perPage }}
      {...categoryPageShellProps(shell)}
    />
  )
}
