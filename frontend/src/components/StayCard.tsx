'use client'

import ListingPrice from '@/components/ListingPrice'
import BtnLikeIcon from '@/components/BtnLikeIcon'
import SaleOffBadge from '@/components/SaleOffBadge'
import StartRating from '@/components/StartRating'
import type { TListingBase } from '@/types/listing-types'
import { nextListingImageUrlFallback } from '@/lib/listing-image-url-fallbacks'
import { preferListingCardImageUrl } from '@/lib/prefer-listing-card-image'
import { Badge } from '@/shared/Badge'
import { Location06Icon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import Image from 'next/image'
import Link from 'next/link'
import { FC, useEffect, useState } from 'react'
import { useVitrinHref } from '@/hooks/use-vitrin-href'
import { normalizeCatalogVertical } from '@/lib/catalog-listing-vertical'
import { detailPathForVertical } from '@/lib/listing-detail-routes'
interface StayCardProps {
  className?: string
  data: TListingBase
  size?: 'default' | 'small'
}

const StayCard: FC<StayCardProps> = ({ size = 'default', className = '', data }) => {
  const vitrinHref = useVitrinHref()
  const {
    galleryImgs,
    featuredImage,
    listingCategory,
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

  const detailBase = detailPathForVertical(normalizeCatalogVertical(listingVertical))
  const listingHref = vitrinHref(`${detailBase}/${listingHandle}`)
  const imgSrcRaw =
    (galleryImgs?.[0] && typeof galleryImgs[0] === 'string'
      ? galleryImgs[0]
      : (galleryImgs?.[0] as { src: string } | undefined)?.src) || featuredImage
  const trimmedRaw = typeof imgSrcRaw === 'string' ? imgSrcRaw.trim() : ''
  const initialSrc = preferListingCardImageUrl(trimmedRaw)
  const [imageSrc, setImageSrc] = useState(initialSrc)
  const [tried, setTried] = useState<string[]>(() => (initialSrc ? [initialSrc] : []))
  const [brokenImage, setBrokenImage] = useState(false)

  useEffect(() => {
    setImageSrc(initialSrc)
    setTried(initialSrc ? [initialSrc] : [])
    setBrokenImage(false)
  }, [initialSrc])

  const showRemoteImage = Boolean(imageSrc) && !brokenImage

  const renderSliderGallery = () => {
    return (
      <div className="relative w-full">
        <Link href={listingHref} className="block">
          <div
            className={`relative w-full overflow-hidden rounded-xl`}
            style={{ paddingBottom: '75%' }}
          >
            {showRemoteImage ? (
              <Image
                src={imageSrc}
                fill
                alt={title ?? 'listing'}
                className="object-cover transition-transform duration-300 group-hover:scale-105"
                sizes="(max-width: 640px) 92vw, (max-width: 1024px) 46vw, (max-width: 1280px) 31vw, 24vw"
                unoptimized={
                  imageSrc.startsWith('data:') ||
                  imageSrc.startsWith('/uploads/') ||
                  imageSrc.startsWith('/api/listing-ext-image') ||
                  /^https?:\/\//i.test(imageSrc)
                }
                onError={() => {
                  const next = nextListingImageUrlFallback(imageSrc, new Set(tried))
                  if (next) {
                    setTried((prev) => [...prev, next])
                    setImageSrc(next)
                    return
                  }
                  setBrokenImage(true)
                }}
              />
            ) : (
              <div className="absolute inset-0 bg-neutral-200 dark:bg-neutral-700" aria-hidden />
            )}
          </div>
        </Link>
        <BtnLikeIcon isLiked={like} className="absolute end-3 top-3 z-1" />
        {saleOff ? <SaleOffBadge desc={saleOff} className="absolute start-3 top-3" /> : null}
      </div>
    )
  }

  const renderContent = () => {
    return (
      <div className={size === 'default' ? 'space-y-4 p-4' : 'space-y-1 p-3'}>
        <div className={size === 'default' ? 'space-y-2' : 'space-y-1'}>
          <span className="text-sm text-neutral-500 dark:text-neutral-400">{listingCategory}</span>
          <div className="flex items-center gap-x-2">
            {isAds && <Badge color="green">ADS</Badge>}
            <h2 className={`text-base font-semibold text-neutral-900 capitalize dark:text-white`}>
              <span className="line-clamp-1">{title}</span>
            </h2>
          </div>
          <div className="flex items-center gap-x-1.5 text-sm text-neutral-500 dark:text-neutral-400">
            {size === 'default' && (
              <HugeiconsIcon icon={Location06Icon} size={16} color="currentColor" strokeWidth={1.5} />
            )}
            {address}
          </div>
        </div>
        <div className="w-14 border-b border-neutral-100 dark:border-neutral-800"></div>
        <div className="flex items-center justify-between">
          <span className="text-base font-semibold">
            <ListingPrice
              price={price}
              priceAmount={priceAmount}
              priceAmountMax={priceAmountMax}
              priceCurrency={priceCurrency}
            />
            {size === 'default' && (
              <span className="text-sm font-normal text-neutral-500 dark:text-neutral-400"> /night</span>
            )}
          </span>
          {!!reviewStart && <StartRating reviewCount={reviewCount} point={reviewStart} />}
        </div>
      </div>
    )
  }

  return (
    <div
      className={`group relative bg-white dark:bg-neutral-900 ${
        size === 'default' ? 'border border-neutral-100 dark:border-neutral-800' : ''
      } overflow-hidden rounded-2xl transition-shadow hover:shadow-xl ${className}`}
    >
      {renderSliderGallery()}
      <Link href={listingHref}>{renderContent()}</Link>
    </div>
  )
}

export default StayCard
