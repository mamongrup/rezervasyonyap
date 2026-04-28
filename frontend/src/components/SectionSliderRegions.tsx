'use client'

import convertNumbThousand from '@/utils/convertNumbThousand'
import { useLocaleSegment } from '@/contexts/locale-context'
import useSnapSlider from '@/hooks/useSnapSlider'
import { ButtonCircle } from '@/shared/Button'
import { getMessages } from '@/utils/getT'
import { ArrowLeft02Icon, ArrowRight02Icon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import Image from 'next/image'
import Link from 'next/link'
import listingPlaceholder from '@/images/hero-right.png'
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
  /** Bölgedeki ilan sayısının birimi, ör. "otel" */
  unit?: string
  className?: string
}

export default function SectionSliderRegions({
  regions,
  categoryRoute,
  unit = 'ilan',
  className = '',
}: Props) {
  const sliderRef = useRef<HTMLDivElement>(null)
  const [brokenThumbs, setBrokenThumbs] = useState<Record<string, boolean>>({})
  const { scrollToNextSlide, scrollToPrevSlide, isAtEnd, isAtStart } = useSnapSlider({ sliderRef })
  const locale = useLocaleSegment()
  const pag = getMessages(locale).common.pagination
  const fallbackSrc =
    typeof listingPlaceholder === 'string' ? listingPlaceholder : listingPlaceholder.src

  if (!regions.length) return null

  return (
    <div className={`relative ${className}`}>
      <div
        ref={sliderRef}
        className="hidden-scrollbar relative -mx-2 flex snap-x snap-mandatory overflow-x-auto lg:-mx-3.5"
      >
        {regions.map((region) => (
          <div
            key={region.slug}
            className="mySnapItem w-[17rem] shrink-0 px-2 lg:w-1/4 lg:px-3.5 xl:w-1/5"
          >
            <div className="group relative flex flex-col">
              <div className="relative aspect-square w-full overflow-hidden rounded-2xl">
                {region.thumbnail || brokenThumbs[region.slug] ? (
                  <Image
                    src={brokenThumbs[region.slug] ? fallbackSrc : region.thumbnail}
                    alt={region.name}
                    fill
                    className="rounded-2xl object-cover transition-transform duration-300 group-hover:scale-105"
                    sizes="(max-width: 400px) 100vw, 300px"
                    onError={() =>
                      setBrokenThumbs((prev) =>
                        prev[region.slug] ? prev : { ...prev, [region.slug]: true },
                      )
                    }
                    unoptimized
                  />
                ) : (
                  <div className="h-full w-full bg-neutral-200 dark:bg-neutral-700" />
                )}
                <span className="absolute inset-0 bg-black/10 opacity-0 transition-opacity group-hover:opacity-100 rounded-2xl" />
              </div>
              <div className="mt-4">
                <h2 className="text-base font-medium text-neutral-900 dark:text-neutral-100">
                  <Link href={`${categoryRoute}/${region.slug}`} className="absolute inset-0" />
                  <span className="line-clamp-1">{region.name}</span>
                </h2>
                <span className="mt-1.5 block text-sm text-neutral-600 dark:text-neutral-400">
                  {convertNumbThousand(region.count)}+ {unit}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="absolute -start-3 top-[40%] z-1 -translate-y-1/2 sm:-start-5 xl:-start-5">
        <ButtonCircle color="white" onClick={scrollToPrevSlide} className="xl:size-11" disabled={isAtStart} aria-label={pag.previous}>
          <HugeiconsIcon icon={ArrowLeft02Icon} className="size-5 rtl:rotate-180" strokeWidth={1.75} />
        </ButtonCircle>
      </div>

      <div className="absolute -end-3 top-[40%] z-1 -translate-y-1/2 sm:-end-5 xl:-end-6">
        <ButtonCircle color="white" onClick={scrollToNextSlide} className="xl:size-11" disabled={isAtEnd} aria-label={pag.next}>
          <HugeiconsIcon icon={ArrowRight02Icon} className="size-5 rtl:rotate-180" strokeWidth={1.75} />
        </ButtonCircle>
      </div>
    </div>
  )
}
