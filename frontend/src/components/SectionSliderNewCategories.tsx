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
import { type CSSProperties, FC, useCallback, useLayoutEffect, useRef, useState } from 'react'

const CATEGORY_CARD_MEDIA_SELECTOR = '[data-category-card-media]'

type ArrowLayout = {
  top: number
  prevLeft: number
  nextLeft: number
}

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
  const clipRef = useRef<HTMLDivElement>(null)
  const sliderRef = useRef<HTMLDivElement>(null)
  const [arrowLayout, setArrowLayout] = useState<ArrowLayout | null>(null)
  const { scrollToNextSlide, scrollToPrevSlide, isAtEnd, isAtStart } = useSnapSlider({ sliderRef })
  const locale = useLocaleSegment()
  const pag = getMessages(locale).common.pagination

  const syncArrowLayout = useCallback(() => {
    const root = containerRef.current
    const clip = clipRef.current
    const track = sliderRef.current
    if (!root || !clip || !track) return

    const rootRect = root.getBoundingClientRect()
    const clipRect = clip.getBoundingClientRect()

    const medias = [...track.querySelectorAll(CATEGORY_CARD_MEDIA_SELECTOR)].filter(
      (n): n is HTMLElement => n instanceof HTMLElement,
    )

    const visible = medias.filter((m) => {
      const r = m.getBoundingClientRect()
      return r.right > clipRect.left && r.left < clipRect.right
    })

    if (visible.length === 0) {
      setArrowLayout(null)
      return
    }

    let leftmostEl = visible[0]
    let rightmostEl = visible[0]
    let minLeft = Infinity
    let maxRight = -Infinity

    for (const m of visible) {
      const r = m.getBoundingClientRect()
      if (r.left < minLeft) {
        minLeft = r.left
        leftmostEl = m
      }
      if (r.right > maxRight) {
        maxRight = r.right
        rightmostEl = m
      }
    }

    const lr = leftmostEl.getBoundingClientRect()
    const rr = rightmostEl.getBoundingClientRect()

    setArrowLayout({
      top: lr.top - rootRect.top + lr.height / 2,
      prevLeft: lr.left - rootRect.left,
      nextLeft: rr.right - rootRect.left,
    })
  }, [])

  useLayoutEffect(() => {
    syncArrowLayout()
    const ro = new ResizeObserver(() => syncArrowLayout())
    const root = containerRef.current
    const clip = clipRef.current
    const track = sliderRef.current
    if (root) ro.observe(root)
    if (clip) ro.observe(clip)
    if (track) ro.observe(track)
    track?.addEventListener('scroll', syncArrowLayout, { passive: true })
    window.addEventListener('resize', syncArrowLayout)
    return () => {
      ro.disconnect()
      track?.removeEventListener('scroll', syncArrowLayout)
      window.removeEventListener('resize', syncArrowLayout)
    }
  }, [categories, categoryCardType, syncArrowLayout])

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

  const measured = arrowLayout != null
  const measuredStyle = (axis: 'prev' | 'next'): CSSProperties | undefined =>
    arrowLayout
      ? {
          left: axis === 'prev' ? arrowLayout.prevLeft : arrowLayout.nextLeft,
          top: arrowLayout.top,
          transform: 'translate(-50%, -50%)',
        }
      : undefined

  return (
    <div ref={containerRef} className={clsx('relative', className)}>
      <div ref={clipRef} className="min-w-0 max-w-full overflow-x-clip">
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
          'absolute z-1',
          !measured && 'start-0 top-[40%] -translate-y-1/2 ltr:-translate-x-1/2 rtl:translate-x-1/2',
        )}
        style={measuredStyle('prev')}
      >
        <ButtonCircle color="white" onClick={scrollToPrevSlide} className={'xl:size-11'} disabled={isAtStart} aria-label={pag.previous}>
          <HugeiconsIcon icon={ArrowLeft02Icon} className="size-5 rtl:rotate-180" strokeWidth={1.75} />
        </ButtonCircle>
      </div>

      <div
        className={clsx(
          'absolute z-1',
          !measured && 'end-0 top-[40%] -translate-y-1/2 ltr:translate-x-1/2 rtl:-translate-x-1/2',
        )}
        style={measuredStyle('next')}
      >
        <ButtonCircle color="white" onClick={scrollToNextSlide} className={'xl:size-11'} disabled={isAtEnd} aria-label={pag.next}>
          <HugeiconsIcon icon={ArrowRight02Icon} className="size-5 rtl:rotate-180" strokeWidth={1.75} />
        </ButtonCircle>
      </div>
    </div>
  )
}

export default SectionSliderNewCategories
