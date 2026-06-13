'use client'

import type { FeaturedTabListingIds, TListingBase } from '@/types/listing-types'
import {
  DEFAULT_FEATURED_DISPLAY_COUNT,
  EMPTY_FEATURED_TAB_IDS,
  normalizeFeaturedDisplayCount,
  pickListingsForFeaturedTab,
  type FeaturedTabDef,
} from '@/lib/featured-listings-utils'
import { buildFeaturedTabViewAllHref } from '@/lib/featured-tab-view-all'
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
  /** Son dakika — müsaitlik API'sinden otomatik */
  lastMinuteListings?: TListingBase[]
  /** Son dakika «Tümünü gör» */
  lastMinuteViewAllHref?: string
  /** @deprecated `tabListingIds` kullanın */
  featuredListingIds?: string[]
  /** Sekme başına gösterilecek kart sayısı */
  maxCount?: number
  /** "Daha fazla" butonu href (varsayılan kategori listesi) */
  rightButtonHref?: string
  /** Lüks / ekonomik «Tümünü gör» için kategori slug */
  categorySlug?: string
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
  lastMinuteListings = [],
  lastMinuteViewAllHref,
  featuredListingIds = [],
  maxCount = DEFAULT_FEATURED_DISPLAY_COUNT,
  rightButtonHref = '/oteller/all',
  categorySlug,
  cardType = 'card2',
}) => {
  const { messages } = useAppLocale()
  const vitrinHref = useVitrinHref()

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
      tabDefs.filter((tab) => {
        if (tab.kind === 'lastMinute') return lastMinuteListings.length > 0
        return pickListingsForFeaturedTab(stayListings, tab.kind, resolvedTabIds).length > 0
      }),
    [tabDefs, stayListings, resolvedTabIds, lastMinuteListings],
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
  const filtered =
    activeEntry?.kind === 'lastMinute'
      ? lastMinuteListings
      : pickListingsForFeaturedTab(
          stayListings,
          activeEntry?.kind ?? 'recommended',
          resolvedTabIds,
        )
  const displayCount = normalizeFeaturedDisplayCount(maxCount)
  const displayListings = filtered.slice(0, displayCount)

  const resolvedViewAllHref = (() => {
    const kind = activeEntry?.kind
    if (kind === 'lastMinute' && lastMinuteViewAllHref) return lastMinuteViewAllHref
    if (categorySlug && kind === 'luxury') return buildFeaturedTabViewAllHref(categorySlug, 'luxury')
    if (categorySlug && kind === 'economic') {
      return buildFeaturedTabViewAllHref(categorySlug, 'economic')
    }
    return rightButtonHref
  })()
  const resolvedRightHref = vitrinHref(resolvedViewAllHref)

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
        rightButtonHref={resolvedViewAllHref}
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
