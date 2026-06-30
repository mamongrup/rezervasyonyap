import CategoryPageTemplate from '@/components/CategoryPageTemplate'
import { YachtCard } from '@/components/cards'
import { getCategoryBySlug } from '@/data/category-registry'
import { getStayListingFilterOptions } from '@/data/listings'
import { regionHandleFromParams } from '@/lib/region-handle-path'
import { filterHolidayThemeCodesForListingCards } from '@/lib/holiday-theme-codes'
import {
  getHolidayThemeLabelMap,
  resolveHolidayThemeLabelsFromMap,
} from '@/lib/holiday-theme-labels'
import { loadCategoryPageListingsBundle } from '@/lib/category-page-data'
import {
  fetchFlexibleStayRentalListings,
  parseSearchParamsFromUrl,
} from '@/lib/listings-fetcher'
import { regionLabelFromHandle } from '@/lib/stay-location-display'
import { YACHT_TYPE_HANDLE_MAP } from '@/lib/stay-rental-categories'
import { getSubcategoryBySlug } from '@/data/subcategory-registry'
import type { TListingBase } from '@/types/listing-types'
import { categoryMetadata } from '@/lib/category-page-metadata'
import { Metadata } from 'next'
import { redirect } from 'next/navigation'

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

  const query = parseSearchParamsFromUrl(sp)
  const [{ result, filterOptions, heroOverride }, themeLabelMap] = await Promise.all([
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

  const pageNum = page
  const flexibleListings =
    pageNum === 1
      ? await fetchFlexibleStayRentalListings(
          'yacht_charter',
          new Set(listings.map((l) => l.id)),
          query,
          { regionHandle: currentHandle },
          locale,
        )
      : []

  const isPropertyTypeHandle =
    currentHandle && currentHandle !== 'all' && !!YACHT_TYPE_HANDLE_MAP[currentHandle]
  const propertyTypeLabel = isPropertyTypeHandle
    ? (getSubcategoryBySlug(currentHandle!)?.name ?? currentHandle)
    : undefined
  const regionLabel =
    !isPropertyTypeHandle && currentHandle && currentHandle !== 'all'
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
  const flexibleForUi = flexibleListings.map(withYachtThemeChips)

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
        propertyTypeLabel,
        fromApi,
        lastMinute: query.last_minute === '1',
      }}
      flexibleListingCards={
        flexibleForUi.length > 0
          ? flexibleForUi.map((l) => (
              <YachtCard key={`flex-${l.id}`} data={l as any} />
            ))
          : undefined
      }
      listingPagination={{ page, total, perPage }}
    />
  )
}
