import CategoryPageTemplate from '@/components/CategoryPageTemplate'
import { CruiseCard } from '@/components/cards'
import { getCategoryBySlug } from '@/data/category-registry'
import { regionHandleFromParams } from '@/lib/region-handle-path'
import { getCruiseCategoryFilterOptions } from '@/lib/category-filter-options'
import { categoryFacetRouteFromHandle } from '@/lib/category-facet-routes'
import { facetLabelFromRoute, redirectCategoryFacetFromQuery } from '@/lib/category-facet-redirect'
import { categoryPageShellProps, loadCategoryPageListingsBundle } from '@/lib/category-page-data'
import { parseSearchParamsFromUrl } from '@/lib/listings-fetcher'
import { categoryMetadata } from '@/lib/category-page-metadata'
import { redirectIfExperienceListingHandle } from '@/lib/category-browse-listing-redirect'
import { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { regionLabelFromHandle } from '@/lib/stay-location-display'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale?: string }>
}): Promise<Metadata> {
  const { locale } = await params
  return categoryMetadata('kruvaziyer', locale)
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
  const category = getCategoryBySlug('kruvaziyer')
  if (!category) return redirect('/')

  await redirectCategoryFacetFromQuery(locale, 'kruvaziyer', sp, currentHandle)

  if (
    currentHandle &&
    currentHandle !== 'all' &&
    !categoryFacetRouteFromHandle('kruvaziyer', locale, currentHandle)
  ) {
    await redirectIfExperienceListingHandle(locale, currentHandle, 'cruise')
  }

  const query = parseSearchParamsFromUrl(sp)
  const {
    result: { listings, total, page, perPage, fromApi },
    filterOptions,
    heroOverride,
    shell,
  } = await loadCategoryPageListingsBundle(
    'kruvaziyer',
    query,
    { regionHandle: currentHandle },
    locale,
    getCruiseCategoryFilterOptions(locale),
  )

  const pathFacetRoute =
    currentHandle && currentHandle !== 'all'
      ? categoryFacetRouteFromHandle('kruvaziyer', locale, currentHandle)
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
        <CruiseCard key={l.id} data={l as any} />
      ))}
      listingCardRenderer={(l) => <CruiseCard key={l.id} data={l as any} />}
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
      }}
      listingPagination={{ page, total, perPage }}
      {...categoryPageShellProps(shell)}
    />
  )
}
