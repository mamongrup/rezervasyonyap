'use client'

import type { TListingBase } from '@/types/listing-types'
import { useVitrinHref } from '@/hooks/use-vitrin-href'
import ButtonPrimary from '@/shared/ButtonPrimary'
import { useAppLocale } from '@/hooks/useAppLocale'
import { ArrowRight02Icon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { FC, ReactNode, useState } from 'react'
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
  /** "Daha fazla" butonu href */
  rightButtonHref?: string
}

function applyTabFilter(listings: TListingBase[], tabIndex: number): TListingBase[] {
  switch (tabIndex) {
    case 1:
      // Yeni — isNew flagı veya createdAt son 60 gün
      const newListings = listings.filter((l) => l.isNew)
      return newListings.length > 0 ? newListings : listings.filter((l) => {
        if (!l.createdAt) return false
        const age = Date.now() - new Date(l.createdAt).getTime()
        return age < 60 * 24 * 60 * 60 * 1000
      })
    case 2:
      // İndirimli — discountPercent > 0
      return listings.filter((l) => (l.discountPercent ?? 0) > 0)
    case 3:
      // Öne Çıkan / Kampanya
      return listings.filter((l) => l.isCampaign)
    default:
      // Önerilenler — tüm ilanlar
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
  rightButtonHref = '/oteller/all',
  cardType = 'card2',
}) => {
  const { messages } = useAppLocale()
  const vitrinHref = useVitrinHref()
  const resolvedRightHref = vitrinHref(rightButtonHref)

  const defaultTabActive = tabActive ?? tabs[0] ?? ''
  const [activeTab, setActiveTab] = useState(defaultTabActive)

  const activeIndex = tabs.indexOf(activeTab)
  const filtered = applyTabFilter(stayListings, activeIndex < 0 ? 0 : activeIndex)
  const displayListings = filtered.length > 0 ? filtered : stayListings

  let CardName = StayCard
  if (cardType === 'card1') {
    CardName = StayCard
  } else if (cardType === 'card2') {
    CardName = StayCard2
  }

  return (
    <div className="relative">
      <SectionTabHeader
        tabActive={activeTab}
        subHeading={subHeading}
        tabs={tabs}
        heading={heading ?? ''}
        onChangeTab={setActiveTab}
        rightButtonHref={rightButtonHref}
      />
      {filtered.length === 0 && activeIndex > 0 ? (
        <p className="mt-8 text-sm text-neutral-400">{messages.common['No listings found'] ?? 'Bu kriterde ilan bulunamadı.'}</p>
      ) : (
        <div
          className={`mt-8 grid gap-x-6 gap-y-8 sm:grid-cols-2 md:gap-x-8 md:gap-y-12 lg:grid-cols-3 xl:grid-cols-4 ${gridClass}`}
        >
          {displayListings.map((stay) => (
            <CardName key={stay.id} data={stay} />
          ))}
        </div>
      )}
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
