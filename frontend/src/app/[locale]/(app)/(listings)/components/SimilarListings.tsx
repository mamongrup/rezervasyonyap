'use client'

import ListingPrice from '@/components/ListingPrice'
import StartRating from '@/components/StartRating'
import { useLocaleSegment } from '@/contexts/locale-context'
import useSnapSlider from '@/hooks/useSnapSlider'
import { ButtonCircle } from '@/shared/Button'
import { getMessages } from '@/utils/getT'
import { ArrowLeft02Icon, ArrowRight02Icon, Location06Icon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import clsx from 'clsx'
import Image from 'next/image'
import Link from 'next/link'
import { useRef, useState } from 'react'

interface SimilarListing {
  id: string
  title: string
  handle: string
  address: string
  price: string
  priceAmount?: number
  priceAmountMax?: number
  priceCurrency?: string
  reviewStart: number
  reviewCount: number
  featuredImage: string
  listingCategory: string
  linkBase: string
  /** Tatil evi / yat: misafir · oda · banyo — StayCard2 ile aynı satır */
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
  const imgSrc = item.featuredImage?.trim() ?? ''
  const [brokenImage, setBrokenImage] = useState(false)
  const showImage = Boolean(imgSrc) && !brokenImage

  return (
    <Link href={`${item.linkBase}/${item.handle}`} className="group block">
      <div className="relative w-full overflow-hidden rounded-xl" style={{ paddingBottom: '75%' }}>
        {showImage ? (
          <Image
            src={imgSrc}
            alt={item.title}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-105"
            sizes="(max-width: 640px) 78vw, (max-width: 1024px) 46vw, 25vw"
            unoptimized={
              imgSrc.startsWith('data:') ||
              imgSrc.startsWith('/uploads/') ||
              /^https?:\/\//i.test(imgSrc)
            }
            onError={() => setBrokenImage(true)}
          />
        ) : (
          <div className="absolute inset-0 bg-neutral-200 dark:bg-neutral-700" aria-hidden />
        )}
      </div>

      <div className="mt-3 flex flex-col gap-y-3 px-0.5">
        <div className="flex flex-col gap-y-2">
          {item.listingCategory ? (
            <span className="text-sm text-neutral-500 dark:text-neutral-400">{item.listingCategory}</span>
          ) : null}
          <h3 className="text-base font-semibold text-neutral-900 dark:text-white">
            <span className="line-clamp-2">{item.title}</span>
          </h3>
          {item.address ? (
            <div className="flex items-start gap-x-1.5 text-sm text-neutral-500 dark:text-neutral-400">
              <HugeiconsIcon
                icon={Location06Icon}
                className="mt-0.5 shrink-0"
                size={16}
                color="currentColor"
                strokeWidth={1.5}
              />
              <span className="line-clamp-2 min-w-0">{item.address}</span>
            </div>
          ) : null}
          {item.capacityLine?.trim() ? (
            <p className="text-sm text-neutral-500 dark:text-neutral-400">{item.capacityLine}</p>
          ) : null}
        </div>

        <div className="w-14 border-b border-neutral-100 dark:border-neutral-800" />

        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 flex-1 flex-wrap items-baseline gap-x-1">
            <ListingPrice
              className="shrink-0 text-base font-semibold text-neutral-900 dark:text-white"
              price={item.price}
              priceAmount={item.priceAmount}
              priceAmountMax={item.priceAmountMax}
              priceCurrency={item.priceCurrency}
            />
            {perNightSuffix ? (
              <span className="shrink-0 text-sm font-normal whitespace-nowrap text-neutral-500 dark:text-neutral-400">
                {perNightSuffix}
              </span>
            ) : null}
          </div>
          {item.reviewStart > 0 ? (
            <StartRating
              className="shrink-0"
              point={item.reviewStart}
              reviewCount={item.reviewCount}
            />
          ) : null}
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
