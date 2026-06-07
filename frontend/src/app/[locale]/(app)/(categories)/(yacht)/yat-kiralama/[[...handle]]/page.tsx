import CategoryPageTemplate from '@/components/CategoryPageTemplate'
import { YachtCard } from '@/components/cards'
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
  fetchFlexibleStayRentalListings,
  parseSearchParamsFromUrl,
} from '@/lib/listings-fetcher'
import { regionLabelFromHandle } from '@/lib/stay-location-display'
import { YACHT_TYPE_HANDLE_MAP } from '@/lib/stay-rental-categories'
import { getSubcategoryBySlug } from '@/data/subcategory-registry'
import type { TListingBase } from '@/types/listing-types'
import { Metadata } from 'next'
import { redirect } from 'next/navigation'

export async function generateMetadata(): Promise<Metadata> {
  const category = getCategoryBySlug('yat-kiralama')
  return { title: category?.name ?? 'Yat Kiralama', description: category?.heroSubheading }
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
  const { listings, total, page, perPage, fromApi } = await fetchCategoryListings(
    'yat-kiralama',
    query,
    {
      regionHandle: currentHandle,
    },
    locale,
  )

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

  const [filterOptions, heroOverride] = await Promise.all([
    getStayListingFilterOptions(),
    getRegionHeroConfig('yat-kiralama', currentHandle ?? ''),
  ])

  const isPropertyTypeHandle =
    currentHandle && currentHandle !== 'all' && !!YACHT_TYPE_HANDLE_MAP[currentHandle]
  const propertyTypeLabel = isPropertyTypeHandle
    ? (getSubcategoryBySlug(currentHandle!)?.name ?? currentHandle)
    : undefined
  const regionLabel =
    !isPropertyTypeHandle && currentHandle && currentHandle !== 'all'
      ? regionLabelFromHandle(currentHandle)
      : undefined

  const themeLabelMap = await getHolidayThemeLabelMap(locale, 'yacht_charter')
  function withYachtThemeChips<L extends TListingBase>(l: L): L {
    const codes = l.themeCodes
    if (!codes?.length) return l
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
