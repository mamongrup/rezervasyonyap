'use client'

import { useLocaleSegment } from '@/contexts/locale-context'
import useSnapSlider from '@/hooks/useSnapSlider'
import { ButtonCircle } from '@/shared/Button'
import { getMessages } from '@/utils/getT'
import { ArrowLeft02Icon, ArrowRight02Icon, MapPinIcon, StarIcon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import clsx from 'clsx'
import Image from 'next/image'
import Link from 'next/link'
import { useRef } from 'react'

interface SimilarListing {
  id: string
  title: string
  handle: string
  address: string
  price: string
  reviewStart: number
  reviewCount: number
  featuredImage: string
  listingCategory: string
  linkBase: string
  /** Tatil evi: misafir · oda · banyo (StayCard2 ile aynı `capacitySpec`) */
  capacityLine?: string | null
}

interface Props {
  listings: SimilarListing[]
  title?: string
  /** Örn. `/ gece` — vitrin dili */
  perNightSuffix?: string
  /** Varsayılan `listingSection__wrap` */
  sectionClassName?: string
}

function SimilarListingCard({
  item,
  perNightSuffix,
}: {
  item: SimilarListing
  perNightSuffix: string
}) {
  return (
    <Link href={`${item.linkBase}/${item.handle}`} className="group block">
      <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl">
        <Image
          src={item.featuredImage}
          alt={item.title}
          fill
          className="object-cover transition-transform duration-300 group-hover:scale-105"
          sizes="(max-width: 640px) 78vw, (max-width: 1024px) 46vw, 25vw"
        />
      </div>
      <div className="mt-3 space-y-1 px-1">
        <p className="text-xs font-medium uppercase tracking-wide text-primary-500">
          {item.listingCategory}
        </p>
        <h3 className="line-clamp-1 font-semibold text-neutral-900 transition-colors group-hover:text-primary-600 dark:text-white">
          {item.title}
        </h3>
        <div className="flex items-center gap-1 text-sm text-neutral-500 dark:text-neutral-400">
          <HugeiconsIcon icon={MapPinIcon} className="h-3.5 w-3.5 shrink-0" strokeWidth={1.75} />
          <span className="line-clamp-1">{item.address}</span>
        </div>
        <div className="flex items-center justify-between gap-2 pt-1">
          <div className="flex min-w-0 flex-1 items-center gap-2">
            {item.capacityLine ? (
              <span className="line-clamp-1 text-sm text-neutral-500 dark:text-neutral-400">
                {item.capacityLine}
              </span>
            ) : null}
            <div className="flex shrink-0 items-center gap-1">
              <HugeiconsIcon icon={StarIcon} className="h-4 w-4 text-yellow-400" strokeWidth={1.75} />
              <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                {item.reviewStart.toFixed(1)}
              </span>
              <span className="text-sm text-neutral-400">({item.reviewCount})</span>
            </div>
          </div>
          <p className="shrink-0 font-semibold text-neutral-900 dark:text-white">
            <span>{item.price}</span>
            {perNightSuffix ? (
              <span className="text-sm font-normal text-neutral-500"> {perNightSuffix}</span>
            ) : null}
          </p>
        </div>
      </div>
    </Link>
  )
}

const SimilarListings = ({
  listings,
  title = 'Similar listings',
  perNightSuffix = '/ night',
  sectionClassName = 'listingSection__wrap',
}: Props) => {
  const sliderRef = useRef<HTMLDivElement>(null)
  const { scrollToNextSlide, scrollToPrevSlide, isAtEnd, isAtStart } = useSnapSlider({ sliderRef })
  const locale = useLocaleSegment()
  const dp = getMessages(locale).listing.detailPage

  if (!listings.length) return null

  const showArrows = listings.length > 1

  return (
    <div className={clsx(sectionClassName, 'min-w-0')}>
      <h2 className="text-2xl font-semibold">{title}</h2>

      <div className="relative mt-4">
        <div
          ref={sliderRef}
          className="hidden-scrollbar relative flex snap-x snap-mandatory gap-5 overflow-x-auto pb-1"
        >
          {listings.map((item) => (
            <div
              key={item.id}
              className="mySnapItem w-[78%] shrink-0 snap-start sm:w-[calc(50%-0.625rem)] lg:w-[calc(25%-0.9375rem)]"
            >
              <SimilarListingCard item={item} perNightSuffix={perNightSuffix} />
            </div>
          ))}
        </div>

        {showArrows ? (
          <>
            <div className="pointer-events-none absolute inset-y-0 start-0 z-[1] hidden w-12 sm:flex sm:items-center">
              <div className="pointer-events-auto">
                <ButtonCircle
                  color="white"
                  onClick={scrollToPrevSlide}
                  className="shadow-md xl:size-11"
                  disabled={isAtStart}
                  aria-label={dp.carouselPrevAria ?? 'Previous listings'}
                >
                  <HugeiconsIcon icon={ArrowLeft02Icon} className="size-5 rtl:rotate-180" strokeWidth={1.75} />
                </ButtonCircle>
              </div>
            </div>
            <div className="pointer-events-none absolute inset-y-0 end-0 z-[1] hidden w-12 sm:flex sm:items-center sm:justify-end">
              <div className="pointer-events-auto">
                <ButtonCircle
                  color="white"
                  onClick={scrollToNextSlide}
                  className="shadow-md xl:size-11"
                  disabled={isAtEnd}
                  aria-label={dp.carouselNextAria ?? 'Next listings'}
                >
                  <HugeiconsIcon icon={ArrowRight02Icon} className="size-5 rtl:rotate-180" strokeWidth={1.75} />
                </ButtonCircle>
              </div>
            </div>
          </>
        ) : null}
      </div>
    </div>
  )
}

export default SimilarListings
