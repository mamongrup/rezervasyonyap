'use client'

import ExperiencesCard from '@/components/ExperiencesCard'
import ListingFilterTabs from '@/components/ListingFilterTabs'
import { TExperienceCategory } from '@/data/categories'
import { getStayListingFilterOptions, TExperienceListing } from '@/data/listings'
import { mapBrowseListingsHeading } from '@/lib/map-browse-listing-heading'
import { Divider } from '@/shared/divider'
import clsx from 'clsx'
import { FC, useState, Suspense, type ReactNode } from 'react'
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
  listingPaginationSlot?: ReactNode
}

const SectionGridHasMap: FC<Props> = ({
  className,
  listings,
  category,
  filterOptions,
  closeListingHref,
  locale,
  listingPaginationSlot,
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
        <div className="mt-12 flex w-full flex-col items-center gap-3 sm:mt-16">
          {listingPaginationSlot}
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
