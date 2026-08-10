import StaySectionGridHasMap from '../../../(stay)/stay-categories-map/[[...handle]]/SectionGridHasMap'
import CarSectionGridHasMap from '../../../(car)/car-categories-map/[[...handle]]/SectionGridHasMap'
import ExperienceSectionGridHasMap from '../../../(experience)/experience-categories-map/[[...handle]]/SectionGridHasMap'
import CategoryListingPagination, {
  flattenListingSearchParams,
} from '@/components/CategoryListingPagination'
import type { CategoryRegistryEntry } from '@/data/category-registry'
import { getCategoryByMapRoute } from '@/data/category-registry'
import type { TCarCategory, TExperienceCategory, TStayCategory } from '@/data/categories'
import { getCarListingFilterOptions, getStayListingFilterOptions, type TCarListing, type TExperienceListing } from '@/data/listings'
import { fetchCategoryListings, parseSearchParamsFromUrl } from '@/lib/listings-fetcher'
import { fetchPublicFilterAttributes, fetchPublicHolidayHomePropertyTypes, listPublicThemeItems } from '@/lib/travel-api'
import { holidayPropertyLabelForLocale } from '@/lib/holiday-property-type-options'
import type { TListingBase } from '@/types/listing-types'
import { Metadata } from 'next'
import { notFound } from 'next/navigation'

import stayCategoryCoverImage from '@/images/hero-right-2.png'
import experienceCategoryCoverImage from '@/images/hero-right-experience.png'
import carCategoryCoverImage from '@/images/hero-right-car.png'

function regionTitleFromHandle(handle: string, fallback: string): string {
  if (!handle || handle === 'all') return fallback
  return handle.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

function mapVariant(
  reg: CategoryRegistryEntry,
): 'stay' | 'experience' | 'car' {
  const lt = reg.listingType
  if (lt === 'hotel' || lt === 'holiday-home' || lt === 'yacht') return 'stay'
  if (lt === 'car-rental' || lt === 'ferry' || lt === 'transfer') return 'car'
  return 'experience'
}

function stayStub(
  reg: CategoryRegistryEntry,
  handle: string,
  count: number,
): TStayCategory {
  const name = regionTitleFromHandle(handle, reg.name)
  const cover = stayCategoryCoverImage
  return {
    id: `map-stay:${reg.slug}:${handle}`,
    name,
    region: reg.namePlural,
    handle,
    href: `${reg.categoryRoute}/${handle}`,
    count,
    thumbnail: '',
    coverImage: {
      src: cover.src,
      width: cover.width,
      height: cover.height,
    },
    description: reg.heroSubheading,
  } as TStayCategory
}

function experienceStub(
  reg: CategoryRegistryEntry,
  handle: string,
  count: number,
): TExperienceCategory {
  const name = regionTitleFromHandle(handle, reg.name)
  const cover = experienceCategoryCoverImage
  return {
    id: `map-exp:${reg.slug}:${handle}`,
    name,
    region: reg.namePlural,
    handle,
    href: `${reg.categoryRoute}/${handle}`,
    count,
    thumbnail: '',
    coverImage: {
      src: cover.src,
      width: cover.width,
      height: cover.height,
    },
    description: reg.heroSubheading,
  } as TExperienceCategory
}

function carStub(reg: CategoryRegistryEntry, handle: string, count: number): TCarCategory {
  const name = regionTitleFromHandle(handle, reg.name)
  const cover = carCategoryCoverImage
  return {
    id: `map-car:${reg.slug}:${handle}`,
    name,
    region: reg.namePlural,
    handle,
    href: `${reg.categoryRoute}/${handle}`,
    count,
    thumbnail: '',
    coverImage: {
      src: cover.src,
      width: cover.width,
      height: cover.height,
    },
    description: reg.heroSubheading,
  } as TCarCategory
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ categoryMap: string; locale: string }>
}): Promise<Metadata> {
  const { categoryMap } = await params
  const reg = getCategoryByMapRoute(categoryMap)
  if (!reg?.mapRoute) return { title: 'Harita' }
  return {
    title: `${reg.name} — Harita`,
    description: reg.heroSubheading,
  }
}

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ categoryMap: string; handle?: string[]; locale: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const { categoryMap, handle: handleParam, locale } = await params
  const reg = getCategoryByMapRoute(categoryMap)
  if (!reg?.mapRoute) notFound()

  const sp = await searchParams
  const query = parseSearchParamsFromUrl(sp)
  const currentHandle = handleParam?.[0] ?? 'all'

  const listingsPromise = fetchCategoryListings(reg.slug, query, { regionHandle: currentHandle }, locale)

  const variant = mapVariant(reg)
  const closeListingHref = `${reg.categoryRoute}/${currentHandle}#heading`
  const pagerPath = `/${locale}/${reg.slug}/${currentHandle || 'all'}`
  const pagerQuery = flattenListingSearchParams(sp)
  const makePager = (page: number, total: number, perPage: number) => (
    <CategoryListingPagination
      locale={locale}
      page={page}
      total={total}
      perPage={perPage}
      pathname={pagerPath}
      query={pagerQuery}
    />
  )

  if (variant === 'stay') {
    const [listingResult, filterOptions, themeOpts, propertyTypeItems, amenityItems] = await Promise.all([
      listingsPromise,
      getStayListingFilterOptions(),
      reg.slug === 'tatil-evleri'
        ? listPublicThemeItems({ categoryCode: 'holiday_home', locale })
        : Promise.resolve(null),
      reg.slug === 'tatil-evleri'
        ? fetchPublicHolidayHomePropertyTypes({ cache: 'no-store' }).catch(() => [])
        : Promise.resolve([]),
      reg.slug === 'tatil-evleri'
        ? fetchPublicFilterAttributes('holiday_home', locale, { cache: 'no-store' }).catch(() => [])
        : Promise.resolve([]),
    ])
    const { listings, total, page, perPage } = listingResult
    const category = stayStub(reg, currentHandle, total)
    const themeOptions = themeOpts?.items?.length ? themeOpts.items : undefined
    return (
      <StaySectionGridHasMap
        category={category}
        categorySlug={reg.slug}
        closeListingHref={closeListingHref}
        filterOptions={filterOptions}
        listings={listings as TListingBase[]}
        locale={locale}
        themeOptions={themeOptions}
        propertyTypeOptions={propertyTypeItems.map((item) => ({
          code: item.slug,
          label: holidayPropertyLabelForLocale(item, locale),
        }))}
        amenityOptions={amenityItems.map((item) => ({ key: item.key, label: item.label }))}
        listingPaginationSlot={makePager(page, total, perPage)}
      />
    )
  }

  if (variant === 'car') {
    const [listingResult, filterOptions] = await Promise.all([
      listingsPromise,
      getCarListingFilterOptions(),
    ])
    const { listings, total, page, perPage } = listingResult
    const category = carStub(reg, currentHandle, total)
    return (
      <CarSectionGridHasMap
        category={category}
        closeListingHref={closeListingHref}
        filterOptions={filterOptions}
        listings={listings as unknown as TCarListing[]}
        locale={locale}
        listingPaginationSlot={makePager(page, total, perPage)}
      />
    )
  }

  const [listingResult, filterOptions] = await Promise.all([
    listingsPromise,
    getStayListingFilterOptions(),
  ])
  const { listings, total, page, perPage } = listingResult
  const category = experienceStub(reg, currentHandle, total)
  return (
    <ExperienceSectionGridHasMap
      category={category}
      closeListingHref={closeListingHref}
      filterOptions={filterOptions}
      listings={listings as unknown as TExperienceListing[]}
      locale={locale}
      listingPaginationSlot={makePager(page, total, perPage)}
    />
  )
}
