'use client'

import CarCardH from '@/components/CarCardH'
import ListingFilterTabs from '@/components/ListingFilterTabs'
import { TCarCategory } from '@/data/categories'
import { getCarListingFilterOptions, TCarListing } from '@/data/listings'
import { mapBrowseListingsHeading } from '@/lib/map-browse-listing-heading'
import { Divider } from '@/shared/divider'
import CategoryListingPagination from '@/components/CategoryListingPagination'
import clsx from 'clsx'
import { FC, useState, Suspense } from 'react'
import MapFixedSection from '../../../MapFixedSection'
import {
  mapBrowseHeading,
  mapBrowseListColumn,
  mapBrowseListingGridCar,
  mapBrowseMapColumn,
  mapBrowseOuter,
} from '../../../map-browse-layout-classes'

interface Props {
  className?: string
  listings: TCarListing[]
  category: TCarCategory
  filterOptions: Awaited<ReturnType<typeof getCarListingFilterOptions>>
  closeListingHref?: string
  locale?: string
  listingPagination?: { page: number; total: number; perPage: number }
}

const SectionGridHasMap: FC<Props> = ({
  className,
  listings,
  category,
  filterOptions,
  closeListingHref,
  locale,
  listingPagination,
}) => {
  const [currentHoverID, setCurrentHoverID] = useState<string>('')

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
        <ListingFilterTabs filterOptions={filterOptions} />
        <Divider />
        <div className={mapBrowseListingGridCar}>
          {listings.map((listing) => (
            <div
              key={listing.id}
              onMouseEnter={() => setCurrentHoverID(listing.id)}
              onMouseLeave={() => setCurrentHoverID('')}
            >
              <CarCardH data={listing} />
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
          closeButtonHref={closeListingHref ?? `/car-categories/${category.handle}#heading`}
          currentHoverID={currentHoverID}
          listings={listings}
          listingType="Cars"
        />
      </div>
    </div>
  )
}

export default SectionGridHasMap
