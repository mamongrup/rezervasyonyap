import CategoryPageTemplate from '@/components/CategoryPageTemplate'
import { YachtCard } from '@/components/cards'
import { getCategoryBySlug } from '@/data/category-registry'
import { getStayListingFilterOptions } from '@/data/listings'
import { regionHandleFromParams } from '@/lib/region-handle-path'
import { filterHolidayThemeCodesForListingCards } from '@/lib/holiday-theme-codes'
import { categoryFacetRouteFromHandle } from '@/lib/category-facet-routes'
import { redirectCategoryFacetFromQuery } from '@/lib/category-facet-redirect'
import {
  getHolidayThemeLabelMap,
  holidayThemeOptionsFromMap,
  resolveHolidayThemeLabelsFromMap,
} from '@/lib/holiday-theme-labels'
import { categoryPageShellProps, loadCategoryPageListingsBundle } from '@/lib/category-page-data'
import { parseSearchParamsFromUrl } from '@/lib/listings-fetcher'
import { stayRentalFlexibleSearchActive } from '@/lib/stay-rental-flexible-search'
import { regionLabelFromHandle } from '@/lib/stay-location-display'
import { YACHT_TYPE_HANDLE_MAP } from '@/lib/stay-rental-categories'
import { getSubcategoryBySlug } from '@/data/subcategory-registry'
import type { TListingBase } from '@/types/listing-types'
import { categoryMetadata } from '@/lib/category-page-metadata'
import { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import { YachtFlexibleListingCards } from '../YachtFlexibleListingCards'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale?: string }>
}): Promise<Metadata> {
  const { locale } = await params
  return categoryMetadata('yat-kiralama', locale)
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
  const category = getCategoryBySlug('yat-kiralama')
  if (!category) return redirect('/')

  await redirectCategoryFacetFromQuery(locale, 'yat-kiralama', sp, currentHandle)

  const query = parseSearchParamsFromUrl(sp)
  const requestedPage = Math.max(1, parseInt(query.page ?? '1', 10) || 1)
  const [{ result, filterOptions, heroOverride, shell }, themeLabelMap] = await Promise.all([
    loadCategoryPageListingsBundle(
      'yat-kiralama',
      query,
      { regionHandle: currentHandle },
      locale,
      getStayListingFilterOptions(),
    ),
    getHolidayThemeLabelMap(locale, 'yacht_charter'),
  ])
  const { listings, total, page, perPage, fromApi } = result

  const pathFacetRoute =
    currentHandle && currentHandle !== 'all'
      ? categoryFacetRouteFromHandle('yat-kiralama', locale, currentHandle)
      : undefined
  const pathThemeCode = pathFacetRoute?.queryKey === 'theme' ? pathFacetRoute.queryValue : undefined
  const isThemeHandle = !!pathThemeCode
  const isPropertyTypeHandle =
    !isThemeHandle &&
    currentHandle &&
    currentHandle !== 'all' &&
    !!YACHT_TYPE_HANDLE_MAP[currentHandle]
  const propertyTypeLabel = isPropertyTypeHandle
    ? (getSubcategoryBySlug(currentHandle!)?.name ?? currentHandle)
    : undefined
  const themeLabel = isThemeHandle
    ? (themeLabelMap.get(pathThemeCode!.toLowerCase()) ?? pathThemeCode)
    : undefined
  const regionLabel =
    !isPropertyTypeHandle &&
    !isThemeHandle &&
    currentHandle &&
    currentHandle !== 'all'
      ? regionLabelFromHandle(currentHandle)
      : undefined

  function withYachtThemeChips<L extends TListingBase>(l: L): L {
    const codes = filterHolidayThemeCodesForListingCards(l.themeCodes ?? [])
    if (!codes.length) return l
    const themeChipLabels = resolveHolidayThemeLabelsFromMap(codes, themeLabelMap)
    if (!themeChipLabels.length) return l
    return { ...l, themeChipLabels }
  }
  const listingsForUi = listings.map(withYachtThemeChips)

  return (
    <CategoryPageTemplate
      category={category}
      count={total}
      listingCards={listingsForUi.map((l) => (
        <YachtCard key={l.id} data={l as any} />
      ))}
      listingCardRenderer={(l) => <YachtCard key={l.id} data={l as any} />}
      filterOptions={filterOptions}
      currentHandle={currentHandle}
      locale={locale}
      heroOverride={heroOverride}
      isSearchResults={!!currentHandle && currentHandle !== 'all'}
      allListings={listingsForUi}
      listingLinkBase={category.detailRoute}
      priceUnit={category.priceUnit}
      activeSearch={{
        location: query.location,
        checkin: query.checkin,
        checkout: query.checkout,
        guests: query.guests,
        regionLabel,
        propertyTypeLabel: propertyTypeLabel ?? themeLabel,
        fromApi,
        lastMinute: query.last_minute === '1',
      }}
      preloadedStayRentalThemeOptions={holidayThemeOptionsFromMap(themeLabelMap)}
      flexibleListingCards={
        requestedPage === 1 && stayRentalFlexibleSearchActive(query) ? (
          <Suspense fallback={null}>
            <YachtFlexibleListingCards
              mainListingIds={listings.map((l) => l.id)}
              query={query}
              regionHandle={currentHandle}
              locale={locale}
              themeLabelMap={themeLabelMap}
            />
          </Suspense>
        ) : undefined
      }
      listingPagination={{ page, total, perPage }}
      {...categoryPageShellProps(shell)}
    />
  )
}
