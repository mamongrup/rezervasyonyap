'use client'

import CardCategory3 from '@/components/CardCategory3'
import CardCategory4 from '@/components/CardCategory4'
import CardCategory5 from '@/components/CardCategory5'
import { useLocaleSegment } from '@/contexts/locale-context'
import { TCategory } from '@/data/categories'
import useSnapSlider from '@/hooks/useSnapSlider'
import { ButtonCircle } from '@/shared/Button'
import { getMessages } from '@/utils/getT'
import { ArrowLeft02Icon, ArrowRight02Icon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import clsx from 'clsx'
import { FC, useCallback, useLayoutEffect, useRef, useState } from 'react'

const CATEGORY_CARD_MEDIA_SELECTOR = '[data-category-card-media]'

interface Props {
  className?: string
  itemClassName?: string
  categories: TCategory[]
  categoryCardType?: 'card3' | 'card4' | 'card5'
}

const SectionSliderNewCategories: FC<Props> = ({
  className,
  itemClassName = 'w-[17rem] lg:w-1/4 xl:w-1/5',
  categories = [],
  categoryCardType = 'card3',
}) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const sliderRef = useRef<HTMLDivElement>(null)
  const [arrowMidYpx, setArrowMidYpx] = useState<number | null>(null)
  const { scrollToNextSlide, scrollToPrevSlide, isAtEnd, isAtStart } = useSnapSlider({ sliderRef })
  const locale = useLocaleSegment()
  const pag = getMessages(locale).common.pagination

  const syncArrowMidY = useCallback(() => {
    const root = containerRef.current
    const track = sliderRef.current
    if (!root || !track) return
    const media = track.querySelector(CATEGORY_CARD_MEDIA_SELECTOR)
    if (!(media instanceof HTMLElement)) return
    const rootRect = root.getBoundingClientRect()
    const mediaRect = media.getBoundingClientRect()
    setArrowMidYpx(mediaRect.top - rootRect.top + mediaRect.height / 2)
  }, [])

  useLayoutEffect(() => {
    syncArrowMidY()
    const ro = new ResizeObserver(() => syncArrowMidY())
    const root = containerRef.current
    const track = sliderRef.current
    if (root) ro.observe(root)
    if (track) ro.observe(track)
    window.addEventListener('resize', syncArrowMidY)
    return () => {
      ro.disconnect()
      window.removeEventListener('resize', syncArrowMidY)
    }
  }, [categories, categoryCardType, syncArrowMidY])

  const renderCard = (item: TCategory) => {
    switch (categoryCardType) {
      case 'card4':
        return <CardCategory4 category={item} />
      case 'card5':
        return <CardCategory5 category={item} />
      default:
        return <CardCategory3 category={item} />
    }
  }

  const arrowTopPxStyle = arrowMidYpx != null ? ({ top: arrowMidYpx } as const) : undefined
  const arrowTopFallback = arrowMidYpx == null ? 'top-[40%]' : ''

  return (
    <div ref={containerRef} className={clsx('relative', className)}>
      <div className="min-w-0 max-w-full overflow-x-clip">
        <div
          ref={sliderRef}
          className="hidden-scrollbar relative -mx-2 flex max-w-full snap-x snap-mandatory overflow-x-auto overscroll-x-contain lg:-mx-3.5"
        >
          {categories.map((item) => (
            <div className={`mySnapItem px-2 lg:px-3.5 ${itemClassName}`} key={item.id}>
              {renderCard(item)}
            </div>
          ))}
        </div>
      </div>

      <div
        className={clsx(
          'absolute start-0 z-1 -translate-y-1/2 ltr:-translate-x-1/2 rtl:translate-x-1/2',
          arrowTopFallback,
        )}
        style={arrowTopPxStyle}
      >
        <ButtonCircle color="white" onClick={scrollToPrevSlide} className={'xl:size-11'} disabled={isAtStart} aria-label={pag.previous}>
          <HugeiconsIcon icon={ArrowLeft02Icon} className="size-5 rtl:rotate-180" strokeWidth={1.75} />
        </ButtonCircle>
      </div>

      <div
        className={clsx(
          'absolute end-0 z-1 -translate-y-1/2 ltr:translate-x-1/2 rtl:-translate-x-1/2',
          arrowTopFallback,
        )}
        style={arrowTopPxStyle}
      >
        <ButtonCircle color="white" onClick={scrollToNextSlide} className={'xl:size-11'} disabled={isAtEnd} aria-label={pag.next}>
          <HugeiconsIcon icon={ArrowRight02Icon} className="size-5 rtl:rotate-180" strokeWidth={1.75} />
        </ButtonCircle>
      </div>
    </div>
  )
}

export default SectionSliderNewCategories
