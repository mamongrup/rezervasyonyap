'use client'

import type { TListingBase } from '@/types/listing-types'
import { useVitrinHref } from '@/hooks/use-vitrin-href'
import { en } from '../../public/locales/en'
import ButtonPrimary from '@/shared/ButtonPrimary'
import T from '@/utils/getT'
import { ArrowRight02Icon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { FC, ReactNode } from 'react'
import SectionTabHeader from './SectionTabHeader'
import StayCard from './StayCard'
import StayCard2 from './StayCard2'

const fpFallback = en.homePage.featuredPlaces

interface SectionGridFeaturePlacesProps {
  stayListings: TListingBase[]
  gridClass?: string
  heading?: ReactNode
  subHeading?: string
  headingIsCenter?: boolean
  cardType?: 'card1' | 'card2'
  /** Şehir sekmeleri — verilmezse İngilizce şablon (en) */
  tabs?: string[]
  tabActive?: string
  /** "Daha fazla" butonu href */
  rightButtonHref?: string
}

const SectionGridFeaturePlaces: FC<SectionGridFeaturePlacesProps> = ({
  stayListings = [],
  gridClass = '',
  heading = fpFallback.heading,
  subHeading = fpFallback.subHeading,
  tabs = [...fpFallback.tabs],
  tabActive = fpFallback.tabs[0] ?? 'New York',
  rightButtonHref = '/oteller/all',
  cardType = 'card2',
}) => {
  const vitrinHref = useVitrinHref()
  const resolvedRightHref = vitrinHref(rightButtonHref)

  let CardName = StayCard
  if (cardType === 'card1') {
    CardName = StayCard
  } else if (cardType === 'card2') {
    CardName = StayCard2
  }

  return (
    <div className="relative">
      <SectionTabHeader
        tabActive={tabActive}
        subHeading={subHeading}
        tabs={tabs}
        heading={heading}
        rightButtonHref={rightButtonHref}
      />
      <div
        className={`mt-8 grid gap-x-6 gap-y-8 sm:grid-cols-2 md:gap-x-8 md:gap-y-12 lg:grid-cols-3 xl:grid-cols-4 ${gridClass}`}
      >
        {stayListings.map((stay) => (
          <CardName key={stay.id} data={stay} />
        ))}
      </div>
      <div className="mt-16 flex items-center justify-center">
        <ButtonPrimary href={resolvedRightHref}>
          {T['common']['Show me more']}
          <HugeiconsIcon icon={ArrowRight02Icon} className="h-5 w-5 rtl:rotate-180" strokeWidth={1.75} />
        </ButtonPrimary>
      </div>
    </div>
  )
}

export default SectionGridFeaturePlaces
