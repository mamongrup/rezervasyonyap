'use client'

import type { TListingBase } from '@/types/listing-types'
import {
  DEFAULT_FEATURED_DISPLAY_COUNT,
  EMPTY_FEATURED_TAB_IDS,
  normalizeFeaturedDisplayCount,
  pickListingsForFeaturedTab,
  type FeaturedTabDef,
} from '@/lib/featured-listings-utils'
import type { FeaturedTabListingIds } from '@/types/listing-types'
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
  /** @deprecated `tabDefs` kullanın */
  tabs?: string[]
  tabActive?: string
  /** Vitrin sekmeleri — etiket + filtre türü */
  tabDefs?: FeaturedTabDef[]
  /** Panelden sekme başına sabitlenen ilan id'leri */
  tabListingIds?: FeaturedTabListingIds
  /** @deprecated `tabListingIds` kullanın */
  featuredListingIds?: string[]
  /** Sekme başına gösterilecek kart sayısı */
  maxCount?: number
  /** "Daha fazla" butonu href */
  rightButtonHref?: string
}

const SectionGridFeaturePlaces: FC<SectionGridFeaturePlacesProps> = ({
  stayListings = [],
  gridClass = '',
  heading,
  subHeading = '',
  tabs = [],
  tabActive,
  tabDefs: tabDefsProp,
  tabListingIds,
  featuredListingIds = [],
  maxCount = DEFAULT_FEATURED_DISPLAY_COUNT,
  rightButtonHref = '/oteller/all',
  cardType = 'card2',
}) => {
  const { messages } = useAppLocale()
  const vitrinHref = useVitrinHref()
  const resolvedRightHref = vitrinHref(rightButtonHref)

  const resolvedTabIds = useMemo<FeaturedTabListingIds>(() => {
    if (tabListingIds) return tabListingIds
    if (featuredListingIds.length > 0) {
      return { ...EMPTY_FEATURED_TAB_IDS, recommended: featuredListingIds }
    }
    return EMPTY_FEATURED_TAB_IDS
  }, [tabListingIds, featuredListingIds])

  const tabDefs = useMemo<FeaturedTabDef[]>(() => {
    if (tabDefsProp?.length) return tabDefsProp
    const legacyKinds = ['recommended', 'new', 'discounted'] as const
    return tabs.map((label, index) => ({
      label,
      kind: legacyKinds[index] ?? 'recommended',
    }))
  }, [tabDefsProp, tabs])

  const visibleTabEntries = useMemo(
    () =>
      tabDefs.filter(
        (tab) => pickListingsForFeaturedTab(stayListings, tab.kind, resolvedTabIds).length > 0,
      ),
    [tabDefs, stayListings, resolvedTabIds],
  )

  const visibleTabLabels = useMemo(
    () => visibleTabEntries.map((entry) => entry.label),
    [visibleTabEntries],
  )

  const defaultTabActive = tabActive ?? visibleTabLabels[0] ?? tabDefs[0]?.label ?? ''
  const [activeTab, setActiveTab] = useState(defaultTabActive)

  useEffect(() => {
    if (visibleTabLabels.length === 0) return
    if (!visibleTabLabels.includes(activeTab)) {
      setActiveTab(visibleTabLabels[0]!)
    }
  }, [visibleTabLabels, activeTab])

  const activeEntry =
    visibleTabEntries.find((entry) => entry.label === activeTab) ?? visibleTabEntries[0]
  const filtered = pickListingsForFeaturedTab(
    stayListings,
    activeEntry?.kind ?? 'recommended',
    resolvedTabIds,
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
