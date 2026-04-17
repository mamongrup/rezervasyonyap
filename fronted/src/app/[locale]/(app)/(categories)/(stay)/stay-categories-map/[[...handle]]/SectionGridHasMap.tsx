'use client'

import HolidayListingFilters from '@/components/HolidayListingFilters'
import ListingFilterTabs from '@/components/ListingFilterTabs'
import StayCard2 from '@/components/StayCard2'
import { TStayCategory } from '@/data/categories'
import type { TListingBase } from '@/types/listing-types'
import { getStayListingFilterOptions } from '@/data/listings'
import { Divider } from '@/shared/divider'
import CategoryListingPagination from '@/components/CategoryListingPagination'
import clsx from 'clsx'
import { getSubcategoriesByParent } from '@/data/subcategory-registry'
import { mapBrowseListingsHeading } from '@/lib/map-browse-listing-heading'
import { getMessages } from '@/utils/getT'
import { FC, useState, Suspense } from 'react'
import MapFixedSection from '../../../MapFixedSection'
import {
  mapBrowseHeading,
  mapBrowseListColumn,
  mapBrowseListingGridTwo,
  mapBrowseMapColumn,
  mapBrowseOuter,
} from '../../../map-browse-layout-classes'

interface Props {
  className?: string
  listings: TListingBase[]
  category: TStayCategory
  filterOptions: Awaited<ReturnType<typeof getStayListingFilterOptions>>
  /** Varsayılan: stay-categories — kategori liste sayfasına dönmek için */
  closeListingHref?: string
  /** `tatil-evleri` ise normal liste ile aynı `HolidayListingFilters` */
  categorySlug?: string
  locale?: string
  /** Harita sayfası — tema seçenekleri (sunucu `listPublicThemeItems`) */
  themeOptions?: { code: string; label: string }[]
  listingPagination?: { page: number; total: number; perPage: number }
}

const SectionGridHasMap: FC<Props> = ({
  className,
  listings,
  category,
  filterOptions,
  closeListingHref,
  categorySlug,
  locale,
  themeOptions: themeOptionsProp,
  listingPagination,
}) => {
  const [currentHoverID, setCurrentHoverID] = useState<string>('')

  const m = locale ? getMessages(locale) : null
  const holidayFilters =
    categorySlug === 'tatil-evleri' && m?.categoryPage?.listingFilters
      ? (
          <Suspense
            fallback={<div className="h-12 max-w-3xl animate-pulse rounded-xl bg-neutral-100 dark:bg-neutral-800" />}
          >
            <HolidayListingFilters
              locale={locale!}
              messages={m.categoryPage.listingFilters}
              subcategories={getSubcategoriesByParent('tatil-evleri')}
              themeOptions={themeOptionsProp}
            />
          </Suspense>
        )
      : null

  return (
    <div className={clsx(mapBrowseOuter, className)}>
      <div className={mapBrowseListColumn}>
        <h1 id="heading" className={mapBrowseHeading}>
          {mapBrowseListingsHeading(locale, {
            count: category.count,
            name: category.name,
            handle: category.handle,
          })}
        </h1>
        {holidayFilters ?? <ListingFilterTabs filterOptions={filterOptions} />}
        <Divider />
        <div className={mapBrowseListingGridTwo}>
          {listings.map((listing) => (
            <div
              key={listing.id}
              onMouseEnter={() => setCurrentHoverID(listing.id)}
              onMouseLeave={() => setCurrentHoverID('')}
            >
              <StayCard2 data={listing} />
            </div>
          ))}
        </div>
        <div className="mt-16 flex items-center">
          {locale ? (
            <Suspense fallback={<div className="h-10 w-40 animate-pulse rounded-lg bg-neutral-100 dark:bg-neutral-800" />}>
              <CategoryListingPagination
                locale={locale}
                page={listingPagination?.page}
                total={listingPagination?.total}
                perPage={listingPagination?.perPage}
              />
            </Suspense>
          ) : null}
        </div>
      </div>

      <div className={mapBrowseMapColumn}>
      <MapFixedSection
        closeButtonHref={closeListingHref ?? `/stay-categories/${category.handle}#heading`}
        currentHoverID={currentHoverID}
        listings={listings}
        listingType="Stays"
      />
      </div>
    </div>
  )
}

export default SectionGridHasMap
