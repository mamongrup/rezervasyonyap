'use client'

import type { TListingBase } from '@/types/listing-types'
import { useLocaleSegment } from '@/contexts/locale-context'
import { TExperienceListing } from '@/data/listings'
import useSnapSlider from '@/hooks/useSnapSlider'
import { ButtonCircle } from '@/shared/Button'
import { getMessages } from '@/utils/getT'
import { ArrowLeft02Icon, ArrowRight02Icon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import clsx from 'clsx'
import { FC, useRef } from 'react'
import ExperiencesCard from './ExperiencesCard'
import StayCard2 from './StayCard2'

interface Props {
  className?: string
  itemClassName?: string
  listings: TListingBase[] | TExperienceListing[]
  cardType: 'stay' | 'experience'
}

const SectionSliderCards: FC<Props> = ({
  className,
  itemClassName = 'w-[17rem] lg:w-1/3 xl:w-1/4',
  listings = [],
  cardType,
}) => {
  const sliderRef = useRef<HTMLDivElement>(null)
  const { scrollToNextSlide, scrollToPrevSlide, isAtEnd, isAtStart } = useSnapSlider({ sliderRef })
  const locale = useLocaleSegment()
  const pag = getMessages(locale).common.pagination

  const renderCard = (item: Props['listings'][number]) => {
    switch (cardType) {
      case 'stay':
        return <StayCard2 data={item as TListingBase} />
      case 'experience':
        return <ExperiencesCard data={item as TExperienceListing} />
      default:
        return <StayCard2 data={item as TListingBase} />
    }
  }

  return (
    <div className={clsx('relative', className)}>
      <div className="min-w-0 max-w-full overflow-x-clip">
        <div
          ref={sliderRef}
          className="hidden-scrollbar relative -mx-2 flex max-w-full snap-x snap-mandatory overflow-x-auto overscroll-x-contain lg:-mx-3.5"
        >
          {listings.map((item) => (
            <div className={`mySnapItem px-2 lg:px-3.5 ${itemClassName}`} key={item.id}>
              {renderCard(item)}
            </div>
          ))}
        </div>
      </div>

      <div className="absolute start-0 top-[40%] z-1 -translate-y-1/2 ltr:-translate-x-1/2 rtl:translate-x-1/2">
        <ButtonCircle color="white" onClick={scrollToPrevSlide} className={'xl:size-11'} disabled={isAtStart} aria-label={pag.previous}>
          <HugeiconsIcon icon={ArrowLeft02Icon} className="size-5 rtl:rotate-180" strokeWidth={1.75} />
        </ButtonCircle>
      </div>

      <div className="absolute end-0 top-[40%] z-1 -translate-y-1/2 ltr:translate-x-1/2 rtl:-translate-x-1/2">
        <ButtonCircle color="white" onClick={scrollToNextSlide} className={'xl:size-11'} disabled={isAtEnd} aria-label={pag.next}>
          <HugeiconsIcon icon={ArrowRight02Icon} className="size-5 rtl:rotate-180" strokeWidth={1.75} />
        </ButtonCircle>
      </div>
    </div>
  )
}

export default SectionSliderCards
