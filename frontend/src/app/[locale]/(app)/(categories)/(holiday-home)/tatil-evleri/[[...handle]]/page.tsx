import CategoryPageTemplate from '@/components/CategoryPageTemplate'
import { HolidayHomeCard } from '@/components/cards'
import { getCategoryBySlug } from '@/data/category-registry'
import { getStayListingFilterOptions } from '@/data/listings'
import { getRegionHeroConfig } from '@/data/region-hero-config'
import { regionHandleFromParams } from '@/lib/region-handle-path'
import {
  getHolidayThemeLabelMap,
  resolveHolidayThemeLabelsFromMap,
} from '@/lib/holiday-theme-labels'
import {
  fetchCategoryListings,
  fetchFlexibleHolidayListings,
  parseSearchParamsFromUrl,
  HOLIDAY_TYPE_HANDLE_MAP,
} from '@/lib/listings-fetcher'
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

  const query = parseSearchParamsFromUrl(sp)
  const { listings, total, page, perPage, fromApi } = await fetchCategoryListings(
    'tatil-evleri',
    query,
    {
      regionHandle: currentHandle,
    },
    locale,
  )

  const pageNum = page
  const flexibleListings =
    pageNum === 1
      ? await fetchFlexibleHolidayListings(
          new Set(listings.map((l) => l.id)),
          query,
          { regionHandle: currentHandle },
          locale,
        )
      : []

  const [filterOptions, heroOverride] = await Promise.all([
    getStayListingFilterOptions(),
    getRegionHeroConfig('tatil-evleri', currentHandle ?? ''),
  ])

  const isPropertyTypeHandle =
    currentHandle && currentHandle !== 'all' && !!HOLIDAY_TYPE_HANDLE_MAP[currentHandle]
  const propertyTypeLabel = isPropertyTypeHandle
    ? (getSubcategoryBySlug(currentHandle!)?.name ?? currentHandle)
    : undefined
  const regionLabel =
    !isPropertyTypeHandle && currentHandle && currentHandle !== 'all'
      ? currentHandle.replace(/-/g, ' ')
      : undefined

  const themeLabelMap = await getHolidayThemeLabelMap(locale)
  function withHolidayThemeChips<L extends TListingBase>(l: L): L {
    const codes = l.themeCodes
    if (!codes?.length) return l
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
        propertyTypeLabel,
        fromApi,
      }}
      flexibleListingCards={
        flexibleForUi.length > 0
          ? flexibleForUi.map((l) => (
               
              <HolidayHomeCard key={`flex-${l.id}`} data={l as any} />
            ))
          : undefined
      }
      listingPagination={{ page, total, perPage }}
    />
  )
}
