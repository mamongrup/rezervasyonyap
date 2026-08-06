'use client'

import ListingPrice from '@/components/ListingPrice'
import BtnLikeIcon from '@/components/BtnLikeIcon'
import GallerySlider from '@/components/GallerySlider'
import SaleOffBadge from '@/components/SaleOffBadge'
import StartRating from '@/components/StartRating'
import { listingCardImageCandidates } from '@/lib/listing-card-image-candidates'
import type { TListingBase } from '@/types/listing-types'
import { Badge } from '@/shared/Badge'
import { Location06Icon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import Link from 'next/link'
import { FC, useMemo } from 'react'
import { useVitrinHref } from '@/hooks/use-vitrin-href'
import { normalizeCatalogVertical } from '@/lib/catalog-listing-vertical'
import { detailPathForVertical } from '@/lib/listing-detail-routes'

interface StayCardProps {
  className?: string
  data: TListingBase
  size?: 'default' | 'small'
  priority?: boolean
}

const StayCard: FC<StayCardProps> = ({ size = 'default', className = '', data }) => {
  const vitrinHref = useVitrinHref()
  const {
    id,
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
  const sliderImages = useMemo(
    () => listingCardImageCandidates(galleryImgs, featuredImage).slice(0, 5),
    [galleryImgs, featuredImage],
  )

  const renderSliderGallery = () => {
    return (
      <div className="relative w-full">
        <GallerySlider
          uniqueID={String(id)}
          ratioClass="aspect-w-4 aspect-h-3"
          galleryImgs={sliderImages}
          href={listingHref}
        />
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
