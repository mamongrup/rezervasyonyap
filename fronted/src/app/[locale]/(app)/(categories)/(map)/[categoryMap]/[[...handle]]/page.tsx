import StaySectionGridHasMap from '../../../(stay)/stay-categories-map/[[...handle]]/SectionGridHasMap'
import CarSectionGridHasMap from '../../../(car)/car-categories-map/[[...handle]]/SectionGridHasMap'
import ExperienceSectionGridHasMap from '../../../(experience)/experience-categories-map/[[...handle]]/SectionGridHasMap'
import type { CategoryRegistryEntry } from '@/data/category-registry'
import { getCategoryByMapRoute } from '@/data/category-registry'
import type { TCarCategory, TExperienceCategory, TStayCategory } from '@/data/categories'
import { getCarListingFilterOptions, getStayListingFilterOptions, type TCarListing, type TExperienceListing } from '@/data/listings'
import { fetchCategoryListings, parseSearchParamsFromUrl } from '@/lib/listings-fetcher'
import { listPublicThemeItems } from '@/lib/travel-api'
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

  const { listings, total, page, perPage } = await fetchCategoryListings(reg.slug, query, { regionHandle: currentHandle }, locale)

  const variant = mapVariant(reg)
  const closeListingHref = `${reg.categoryRoute}/${currentHandle}#heading`

  if (variant === 'stay') {
    const [filterOptions, category, themeOpts] = await Promise.all([
      getStayListingFilterOptions(),
      Promise.resolve(stayStub(reg, currentHandle, total)),
      reg.slug === 'tatil-evleri'
        ? listPublicThemeItems({ categoryCode: 'holiday_home', locale })
        : Promise.resolve(null),
    ])
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
        listingPagination={{ page, total, perPage }}
      />
    )
  }

  if (variant === 'car') {
    const [filterOptions, category] = await Promise.all([
      getCarListingFilterOptions(),
      Promise.resolve(carStub(reg, currentHandle, total)),
    ])
    return (
      <CarSectionGridHasMap
        category={category}
        closeListingHref={closeListingHref}
        filterOptions={filterOptions}
        listings={listings as unknown as TCarListing[]}
        locale={locale}
        listingPagination={{ page, total, perPage }}
      />
    )
  }

  const [filterOptions, category] = await Promise.all([
    getStayListingFilterOptions(),
    Promise.resolve(experienceStub(reg, currentHandle, total)),
  ])
  return (
    <ExperienceSectionGridHasMap
      category={category}
      closeListingHref={closeListingHref}
      filterOptions={filterOptions}
      listings={listings as unknown as TExperienceListing[]}
      locale={locale}
      listingPagination={{ page, total, perPage }}
    />
  )
}
