'use client'

import ExperiencesCard from '@/components/ExperiencesCard'
import ListingFilterTabs from '@/components/ListingFilterTabs'
import { TExperienceCategory } from '@/data/categories'
import { getStayListingFilterOptions, TExperienceListing } from '@/data/listings'
import { mapBrowseListingsHeading } from '@/lib/map-browse-listing-heading'
import { Divider } from '@/shared/divider'
import CategoryListingPagination from '@/components/CategoryListingPagination'
import clsx from 'clsx'
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
  listings: TExperienceListing[]
  category: TExperienceCategory
  filterOptions: Awaited<ReturnType<typeof getStayListingFilterOptions>>
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
        <div className={mapBrowseListingGridTwo}>
          {listings.map((listing) => (
            <div
              key={listing.id}
              onMouseEnter={() => setCurrentHoverID(listing.id)}
              onMouseLeave={() => setCurrentHoverID('')}
            >
              <ExperiencesCard data={listing} />
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
          closeButtonHref={closeListingHref ?? `/experience-categories/${category.handle}#heading`}
          currentHoverID={currentHoverID}
          listings={listings}
          listingType="Experiences"
        />
      </div>
    </div>
  )
}

export default SectionGridHasMap
