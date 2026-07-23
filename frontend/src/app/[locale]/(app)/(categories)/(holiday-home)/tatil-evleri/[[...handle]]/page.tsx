import CategoryPageTemplate from '@/components/CategoryPageTemplate'
import { HolidayHomeCard } from '@/components/cards'
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
import {
  fetchFlexibleHolidayListings,
  parseSearchParamsFromUrl,
  HOLIDAY_TYPE_HANDLE_MAP,
} from '@/lib/listings-fetcher'
import { stayRentalFlexibleSearchActive } from '@/lib/stay-rental-flexible-search'
import { getSubcategoryBySlug } from '@/data/subcategory-registry'
import type { TListingBase } from '@/types/listing-types'
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
  return categoryMetadata('tatil-evleri', locale)
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
  const category = getCategoryBySlug('tatil-evleri')
  if (!category) return redirect('/')

  await redirectCategoryFacetFromQuery(locale, 'tatil-evleri', sp, currentHandle)

  const query = parseSearchParamsFromUrl(sp)
  // Ana ilan listesini, listeden bağımsız verilerle (filtre seçenekleri, bölge
  // hero, tema etiketleri) paralel çek. flexibleListings ana listenin id'lerine
  // bağlı olduğu için ondan sonra gelir.
  const [bundle, themeLabelMap] = await Promise.all([
    loadCategoryPageListingsBundle(
      'tatil-evleri',
      query,
      { regionHandle: currentHandle },
      locale,
      getStayListingFilterOptions(),
    ),
    getHolidayThemeLabelMap(locale),
  ])
  const {
    result: { listings, total, page, perPage, fromApi },
    filterOptions,
    heroOverride,
    shell,
  } = bundle

  const flexibleListings =
    page === 1 && stayRentalFlexibleSearchActive(query)
      ? await fetchFlexibleHolidayListings(
          new Set(listings.map((l) => l.id)),
          query,
          { regionHandle: currentHandle },
          locale,
        )
      : []

  const pathFacetRoute =
    currentHandle && currentHandle !== 'all'
      ? categoryFacetRouteFromHandle('tatil-evleri', locale, currentHandle)
      : undefined
  const pathThemeCode = pathFacetRoute?.queryKey === 'theme' ? pathFacetRoute.queryValue : undefined
  const isThemeHandle = !!pathThemeCode
  const isPropertyTypeHandle =
    !isThemeHandle &&
    currentHandle &&
    currentHandle !== 'all' &&
    !!HOLIDAY_TYPE_HANDLE_MAP[currentHandle]
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

  function withHolidayThemeChips<L extends TListingBase>(l: L): L {
    const codes = filterHolidayThemeCodesForListingCards(l.themeCodes ?? [])
    if (!codes.length) return l
    const themeChipLabels = resolveHolidayThemeLabelsFromMap(codes, themeLabelMap)
    if (!themeChipLabels.length) return l
    return { ...l, themeChipLabels }
  }
  const listingsForUi = listings.map(withHolidayThemeChips)
  const flexibleForUi = flexibleListings.map(withHolidayThemeChips)

  return (
    <CategoryPageTemplate
      category={category}
      count={total}
      listingCards={listingsForUi.map((l) => (
         
        <HolidayHomeCard key={l.id} data={l as any} />
      ))}
       
      listingCardRenderer={(l) => <HolidayHomeCard key={l.id} data={l as any} />}
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
        vitrinTab: parseFeaturedVitrinTab(query.vitrin_tab),
      }}
      preloadedStayRentalThemeOptions={holidayThemeOptionsFromMap(themeLabelMap)}
      flexibleListingCards={
        flexibleForUi.length > 0
          ? flexibleForUi.map((l) => (
               
              <HolidayHomeCard key={`flex-${l.id}`} data={l as any} />
            ))
          : undefined
      }
      listingPagination={{ page, total, perPage }}
      {...categoryPageShellProps(shell)}
    />
  )
}
