'use client'

import HolidayListingFilters from '@/components/HolidayListingFilters'
import ListingFilterTabs from '@/components/ListingFilterTabs'
import StayCard2 from '@/components/StayCard2'
import { TStayCategory } from '@/data/categories'
import type { TListingBase } from '@/types/listing-types'
import { getStayListingFilterOptions } from '@/data/listings'
import { listingCardForCategorySlug } from '@/lib/listing-card-for-category'
import { Divider } from '@/shared/divider'
import clsx from 'clsx'
import { getSubcategoriesByParent } from '@/data/subcategory-registry'
import { mapBrowseListingsHeading } from '@/lib/map-browse-listing-heading'
import { getMessages } from '@/utils/getT'
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
  propertyTypeOptions?: { code: string; label: string }[]
  amenityOptions?: { key: string; label: string }[]
  listingPaginationSlot?: ReactNode
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
  propertyTypeOptions,
  amenityOptions,
  listingPaginationSlot,
}) => {
  const [currentHoverID, setCurrentHoverID] = useState<string>('')
  const CategoryCard = listingCardForCategorySlug(categorySlug)
  const Card = CategoryCard ?? StayCard2

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
              propertyTypeOptions={propertyTypeOptions}
              amenityOptions={amenityOptions}
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
              <Card data={listing} />
            </div>
          ))}
        </div>
        <div className="mt-12 flex w-full flex-col items-center gap-3 sm:mt-16">
          {listingPaginationSlot}
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
