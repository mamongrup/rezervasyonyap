'use client'

import CardRegion3 from '@/components/CardRegion3'
import CardRegion4 from '@/components/CardRegion4'
import CardRegion5 from '@/components/CardRegion5'
import { useLocaleSegment } from '@/contexts/locale-context'
import useSnapSlider from '@/hooks/useSnapSlider'
import { ButtonCircle } from '@/shared/Button'
import { getMessages } from '@/utils/getT'
import { ArrowLeft02Icon, ArrowRight02Icon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { useRef, useState } from 'react'

export interface RegionSliderItem {
  name: string
  slug: string
  count: number
  thumbnail: string
}

interface Props {
  regions: RegionSliderItem[]
  /** Hangi kategori sayfasına link verilecek, ör. "oteller" */
  categoryRoute: string
  /** Varsayılan `${categoryRoute}/${region.slug}` yerine (ör. bölge vitrinı `regionPublicHref`) */
  resolveHref?: (region: RegionSliderItem) => string
  /** Bölgedeki ilan sayısının birimi, ör. "otel" */
  unit?: string
  /** 'card3' | 'card4' | 'card5' */
  cardType?: 'card3' | 'card4' | 'card5'
  className?: string
}

export default function SectionSliderRegions({
  regions,
  categoryRoute,
  resolveHref,
  unit = 'ilan',
  cardType = 'card3',
  className = '',
}: Props) {
  const sliderRef = useRef<HTMLDivElement>(null)
  const [brokenThumbs, setBrokenThumbs] = useState<Record<string, boolean>>({})
  const { scrollToNextSlide, scrollToPrevSlide, isAtEnd, isAtStart } = useSnapSlider({ sliderRef })
  const locale = useLocaleSegment()
  const pag = getMessages(locale).common.pagination

  if (!regions.length) return null

  function hrefFor(region: RegionSliderItem) {
    return resolveHref ? resolveHref(region) : `${categoryRoute}/${region.slug}`
  }

  function markBroken(slug: string) {
    setBrokenThumbs((prev) => (prev[slug] ? prev : { ...prev, [slug]: true }))
  }

  function renderCard(region: RegionSliderItem) {
    const props = {
      region,
      href: hrefFor(region),
      unit,
      isThumbBroken: Boolean(brokenThumbs[region.slug]),
      onThumbError: () => markBroken(region.slug),
    }
    switch (cardType) {
      case 'card4':
        return <CardRegion4 {...props} />
      case 'card5':
        return <CardRegion5 {...props} />
      default:
        return <CardRegion3 {...props} />
    }
  }

  const itemClassName =
    cardType === 'card4'
      ? // Kompakt: daha dar kart
        'w-[14.5rem] lg:w-1/5 xl:w-1/6'
      : cardType === 'card5'
        ? // Büyük görsel: daha geniş kart
          'w-[19rem] lg:w-1/3 xl:w-1/4'
        : // Varsayılan: mevcut davranış
          'w-[17rem] lg:w-1/4 xl:w-1/5'

  return (
    <div className={`relative ${className}`}>
      <div
        ref={sliderRef}
        className="hidden-scrollbar relative -mx-2 flex snap-x snap-mandatory overflow-x-auto lg:-mx-3.5"
      >
        {regions.map((region) => (
          <div
            key={region.slug}
            className={`mySnapItem shrink-0 px-2 lg:px-3.5 ${itemClassName}`}
            data-region-card-type={cardType}
          >
            {renderCard(region)}
          </div>
        ))}
      </div>

      <div className="absolute -start-3 top-[40%] z-[1] -translate-y-1/2 sm:-start-5 xl:-start-5">
        <ButtonCircle color="white" onClick={scrollToPrevSlide} className="xl:size-11" disabled={isAtStart} aria-label={pag.previous}>
          <HugeiconsIcon icon={ArrowLeft02Icon} className="size-5 rtl:rotate-180" strokeWidth={1.75} />
        </ButtonCircle>
      </div>

      <div className="absolute -end-3 top-[40%] z-[1] -translate-y-1/2 sm:-end-5 xl:-end-6">
        <ButtonCircle color="white" onClick={scrollToNextSlide} className="xl:size-11" disabled={isAtEnd} aria-label={pag.next}>
          <HugeiconsIcon icon={ArrowRight02Icon} className="size-5 rtl:rotate-180" strokeWidth={1.75} />
        </ButtonCircle>
      </div>
    </div>
  )
}
