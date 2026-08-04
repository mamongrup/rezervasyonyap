'use client'

import ListingPrice from '@/components/ListingPrice'
import BtnLikeIcon from '@/components/BtnLikeIcon'
import SaleOffBadge from '@/components/SaleOffBadge'
import StartRating from '@/components/StartRating'
import { listingCardImageCandidates } from '@/lib/listing-card-image-candidates'
import { displayListingCategoryLine } from '@/lib/listing-category-display'
import { holidayHomeCapacitySummary } from '@/lib/holiday-home-capacity-summary'
import { nextListingImageUrlFallback } from '@/lib/listing-image-url-fallbacks'
import { shouldUnoptimizeListingImage } from '@/lib/listing-image-optimization'
import type { TListingBase, TListingHolidayHome } from '@/types/listing-types'
import { Badge } from '@/shared/Badge'
import { getMessages } from '@/utils/getT'
import { Location06Icon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import clsx from 'clsx'
import Image from 'next/image'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { FC, useEffect, useMemo, useState } from 'react'
import { useVitrinHref } from '@/hooks/use-vitrin-href'
import { normalizeCatalogVertical } from '@/lib/catalog-listing-vertical'
import { detailPathForVertical } from '@/lib/listing-detail-routes'
interface StayCard2Props {
  className?: string
  data: TListingBase
  size?: 'default' | 'small'
  /** Above-the-fold kartlarda eager yükleme (lazy boş gri kartı azaltır). */
  priority?: boolean
}

const StayCard2: FC<StayCard2Props> = ({ size = 'default', className = '', data, priority = false }) => {
  const params = useParams()
  const locale = typeof params?.locale === 'string' ? params.locale : 'tr'
  const vitrinHref = useVitrinHref()
  const messages = getMessages(locale)
  const nightLabel = messages.common.night ?? 'gece'
  const categoryLine = displayListingCategoryLine(data, locale)

  const {
    galleryImgs,
    featuredImage,
    address,
    title,
    handle: listingHandle,
    like,
    saleOff,
    isAds,
    price,
    priceAmount,
    priceAmountMax,
    priceCurrency,
    reviewStart,
    reviewCount,
    listingVertical,
  } = data

  const holidayCapacityLine =
    listingVertical === 'holiday_home'
      ? holidayHomeCapacitySummary(data as TListingHolidayHome, messages.listing.capacitySpec, false)
      : null

  const detailBase = detailPathForVertical(normalizeCatalogVertical(listingVertical))
  const listingHref = vitrinHref(`${detailBase}/${listingHandle}`)
  const imageCandidates = useMemo(
    () => listingCardImageCandidates(galleryImgs, featuredImage),
    [galleryImgs, featuredImage],
  )
  const initialSrc = imageCandidates[0] ?? ''
  const [candidateIndex, setCandidateIndex] = useState(0)
  const [imageSrc, setImageSrc] = useState(initialSrc)
  const [tried, setTried] = useState<string[]>(() => (initialSrc ? [initialSrc] : []))
  const [brokenImage, setBrokenImage] = useState(false)
  const [imageLoaded, setImageLoaded] = useState(false)

  useEffect(() => {
    setCandidateIndex(0)
    setImageSrc(initialSrc)
    setTried(initialSrc ? [initialSrc] : [])
    setBrokenImage(false)
    setImageLoaded(false)
  }, [initialSrc])

  const showRemoteImage = Boolean(imageSrc) && !brokenImage

  const renderSliderGallery = () => {
    return (
      <div className="relative w-full">
        <Link href={listingHref} className="block">
          <div
            className={clsx(
              'relative w-full overflow-hidden rounded-xl bg-neutral-200 dark:bg-neutral-700',
              showRemoteImage && !imageLoaded && 'animate-pulse',
            )}
            style={{ paddingBottom: '75%' }}
          >
            {showRemoteImage ? (
              <Image
                src={imageSrc}
                fill
                alt={title ?? 'listing'}
                className={clsx(
                  'object-cover transition-[transform,opacity] duration-300 group-hover:scale-105',
                  imageLoaded ? 'opacity-100' : 'opacity-0',
                )}
                sizes="(max-width: 640px) 92vw, (max-width: 1024px) 46vw, (max-width: 1280px) 31vw, 24vw"
                unoptimized={shouldUnoptimizeListingImage(imageSrc)}
                priority={priority}
                loading={priority ? 'eager' : 'lazy'}
                onLoad={() => setImageLoaded(true)}
                onError={() => {
                  const next = nextListingImageUrlFallback(imageSrc, new Set(tried))
                  if (next) {
                    setTried((prev) => [...prev, next])
                    setImageSrc(next)
                    setImageLoaded(false)
                    return
                  }
                  const nextCandidateIndex = candidateIndex + 1
                  const nextCandidate = imageCandidates[nextCandidateIndex]
                  if (nextCandidate) {
                    setCandidateIndex(nextCandidateIndex)
                    setTried((prev) => [...prev, nextCandidate])
                    setImageSrc(nextCandidate)
                    setImageLoaded(false)
                    return
                  }
                  setBrokenImage(true)
                }}
              />
            ) : null}
          </div>
        </Link>
        <BtnLikeIcon isLiked={like} className="absolute end-3 top-3 z-1" />
        {saleOff ? <SaleOffBadge desc={saleOff} className="absolute start-3 top-3" /> : null}
      </div>
    )
  }

  const renderContent = () => {
    return (
      <div className={clsx(size === 'default' ? 'mt-3 gap-y-3' : 'mt-2 gap-y-2', 'flex flex-col')}>
        <div className="flex flex-col gap-y-2">
          {categoryLine ? (
            <span className="text-sm text-neutral-500 dark:text-neutral-400">{categoryLine}</span>
          ) : null}
          <div className="flex items-center gap-x-2">
            {isAds && <Badge color="green">ADS</Badge>}
            <h2 className={`text-base font-semibold text-neutral-900 capitalize dark:text-white`}>
              <span className="line-clamp-1">{title}</span>
            </h2>
          </div>
          <div className="flex items-center gap-x-1.5 text-sm text-neutral-500 dark:text-neutral-400">
            {size === 'default' && (
              <HugeiconsIcon
                className="mb-0.5"
                icon={Location06Icon}
                size={16}
                color="currentColor"
                strokeWidth={1.5}
              />
            )}
            <span>{address}</span>
          </div>
          {holidayCapacityLine && (
            <div className="text-sm text-neutral-500 dark:text-neutral-400">{holidayCapacityLine}</div>
          )}
        </div>
        <div className="w-14 border-b border-neutral-100 dark:border-neutral-800"></div>
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 flex-1 flex-wrap items-baseline gap-x-1">
            <ListingPrice
              className="shrink-0 text-base font-semibold"
              price={price}
              priceAmount={priceAmount}
              priceAmountMax={priceAmountMax}
              priceCurrency={priceCurrency}
            />
            {size === 'default' && (
              <span className="shrink-0 text-sm font-normal whitespace-nowrap text-neutral-500 dark:text-neutral-400">
                {' / '}
                {nightLabel}
              </span>
            )}
          </div>
          {!!reviewStart && <StartRating reviewCount={reviewCount} point={reviewStart} />}
        </div>
      </div>
    )
  }

  return (
    <div className={`group relative ${className}`}>
      {renderSliderGallery()}
      <Link href={listingHref}>{renderContent()}</Link>
    </div>
  )
}

export default StayCard2
