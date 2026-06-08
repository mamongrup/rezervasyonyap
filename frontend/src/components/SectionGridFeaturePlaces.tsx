'use client'

import type { TListingBase } from '@/types/listing-types'
import { DEFAULT_FEATURED_DISPLAY_COUNT, normalizeFeaturedDisplayCount, pickFeaturedTabListings } from '@/lib/featured-listings-utils'
import { useVitrinHref } from '@/hooks/use-vitrin-href'
import ButtonPrimary from '@/shared/ButtonPrimary'
import { useAppLocale } from '@/hooks/useAppLocale'
import { ArrowRight02Icon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { FC, ReactNode, useEffect, useMemo, useState } from 'react'
import SectionTabHeader from './SectionTabHeader'
import StayCard from './StayCard'
import StayCard2 from './StayCard2'

interface SectionGridFeaturePlacesProps {
  stayListings: TListingBase[]
  gridClass?: string
  heading?: ReactNode
  subHeading?: string
  headingIsCenter?: boolean
  cardType?: 'card1' | 'card2'
  /** Tab isimleri — sıra: Önerilenler, Yeni, İndirimli, Öne Çıkan */
  tabs?: string[]
  tabActive?: string
  /** Panelden sabitlenen ilan id'leri — «Öne Çıkan» sekmesi */
  featuredListingIds?: string[]
  /** Sekme başına gösterilecek kart sayısı */
  maxCount?: number
  /** "Daha fazla" butonu href */
  rightButtonHref?: string
}

function applyTabFilter(
  listings: TListingBase[],
  tabIndex: number,
  featuredListingIds: string[] = [],
): TListingBase[] {
  switch (tabIndex) {
    case 1: {
      const newListings = listings.filter((l) => l.isNew)
      return newListings.length > 0
        ? newListings
        : listings.filter((l) => {
            if (!l.createdAt) return false
            const age = Date.now() - new Date(l.createdAt).getTime()
            return age < 60 * 24 * 60 * 60 * 1000
          })
    }
    case 2:
      return listings.filter((l) => (l.discountPercent ?? 0) > 0)
    case 3:
      return pickFeaturedTabListings(listings, featuredListingIds)
    default:
      return listings
  }
}

const SectionGridFeaturePlaces: FC<SectionGridFeaturePlacesProps> = ({
  stayListings = [],
  gridClass = '',
  heading,
  subHeading = '',
  tabs = [],
  tabActive,
  featuredListingIds = [],
  maxCount = DEFAULT_FEATURED_DISPLAY_COUNT,
  rightButtonHref = '/oteller/all',
  cardType = 'card2',
}) => {
  const { messages } = useAppLocale()
  const vitrinHref = useVitrinHref()
  const resolvedRightHref = vitrinHref(rightButtonHref)

  const visibleTabEntries = useMemo(
    () =>
      tabs
        .map((label, index) => ({ label, index }))
        .filter(
          ({ index }) => applyTabFilter(stayListings, index, featuredListingIds).length > 0,
        ),
    [tabs, stayListings, featuredListingIds],
  )

  const visibleTabLabels = useMemo(
    () => visibleTabEntries.map((entry) => entry.label),
    [visibleTabEntries],
  )

  const defaultTabActive = tabActive ?? visibleTabLabels[0] ?? tabs[0] ?? ''
  const [activeTab, setActiveTab] = useState(defaultTabActive)

  useEffect(() => {
    if (visibleTabLabels.length === 0) return
    if (!visibleTabLabels.includes(activeTab)) {
      setActiveTab(visibleTabLabels[0]!)
    }
  }, [visibleTabLabels, activeTab])

  const activeEntry =
    visibleTabEntries.find((entry) => entry.label === activeTab) ?? visibleTabEntries[0]
  const filtered = applyTabFilter(
    stayListings,
    activeEntry?.index ?? 0,
    featuredListingIds,
  )
  const displayCount = normalizeFeaturedDisplayCount(maxCount)
  const displayListings = filtered.slice(0, displayCount)

  let CardName = StayCard
  if (cardType === 'card1') {
    CardName = StayCard
  } else if (cardType === 'card2') {
    CardName = StayCard2
  }

  return (
    <div className="relative">
      <SectionTabHeader
        tabActive={activeEntry?.label ?? activeTab}
        subHeading={subHeading}
        tabs={visibleTabLabels}
        heading={heading ?? ''}
        onChangeTab={setActiveTab}
        rightButtonHref={rightButtonHref}
      />
      <div
        className={`mt-8 grid gap-x-6 gap-y-8 sm:grid-cols-2 md:gap-x-8 md:gap-y-12 lg:grid-cols-3 xl:grid-cols-4 ${gridClass}`}
      >
        {displayListings.map((stay) => (
          <CardName key={stay.id} data={stay} />
        ))}
      </div>
      <div className="mt-16 flex items-center justify-center">
        <ButtonPrimary href={resolvedRightHref}>
          {messages.common['Show me more']}
          <HugeiconsIcon icon={ArrowRight02Icon} className="h-5 w-5 rtl:rotate-180" strokeWidth={1.75} />
        </ButtonPrimary>
      </div>
    </div>
  )
}

export default SectionGridFeaturePlaces
