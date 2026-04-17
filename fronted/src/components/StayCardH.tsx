'use client'

import BtnLikeIcon from '@/components/BtnLikeIcon'
import GallerySlider from '@/components/GallerySlider'
import SaleOffBadge from '@/components/SaleOffBadge'
import StartRating from '@/components/StartRating'
import { TStayListing } from '@/data/listings'
import { Badge } from '@/shared/Badge'
import Link from 'next/link'
import { FC } from 'react'
import { useVitrinHref } from '@/hooks/use-vitrin-href'
import { normalizeCatalogVertical } from '@/lib/catalog-listing-vertical'
import { stayDetailPathForVertical } from '@/lib/stay-detail-routes'

interface StayCardHProps {
  className?: string
  data: TStayListing
}

const StayCardH: FC<StayCardHProps> = ({ className = '', data }) => {
  const vitrinHref = useVitrinHref()

  const {
    galleryImgs,
    listingCategory,
    address,
    title,
    handle: listingHandle,
    like,
    saleOff,
    isAds,
    price,
    reviewStart,
    reviewCount,
    id,
    listingVertical,
  } = data

  const detailBase = stayDetailPathForVertical(normalizeCatalogVertical(listingVertical))
  const listingHref = vitrinHref(`${detailBase}/${listingHandle}`)

  const renderSliderGallery = () => {
    return (
      <div className="relative w-full shrink-0 md:w-72">
        <GallerySlider ratioClass="aspect-w-6 aspect-h-5" galleryImgs={galleryImgs} href={listingHref} />
        <BtnLikeIcon isLiked={like} className="absolute top-3 right-3" />
        {saleOff && <SaleOffBadge className="absolute top-3 left-3" />}
      </div>
    )
  }

  const renderTienIch = () => {
    return (
      <div className="hidden flex-wrap gap-x-6 gap-y-3 sm:flex">
        <div className="flex items-center space-x-3">
          <i className="las la-user text-lg"></i>
          <span className="text-sm text-neutral-500 dark:text-neutral-400">6 guests</span>
        </div>
        <div className="flex items-center space-x-3">
          <i className="las la-smoking-ban text-lg"></i>
          <span className="text-sm text-neutral-500 dark:text-neutral-400">No smoking</span>
        </div>
        <div className="flex items-center space-x-3">
          <i className="las la-wifi text-lg"></i>
          <span className="text-sm text-neutral-500 dark:text-neutral-400">Wifi</span>
        </div>
      </div>
    )
  }

  const renderContent = () => {
    return (
      <div className="flex grow flex-col p-3 sm:p-5">
        <div className="space-y-2">
          <div className="text-sm text-neutral-500 dark:text-neutral-400">
            <span>
              {listingCategory} in {address}
            </span>
          </div>
          <div className="flex items-center space-x-2">
            {isAds && <Badge color="green">ADS</Badge>}
            <h2 className="text-lg font-medium capitalize">
              <span className="line-clamp-1">{title}</span>
            </h2>
          </div>
        </div>
        <div className="my-4 hidden w-14 border-b border-neutral-100 sm:block dark:border-neutral-800"></div>
        {renderTienIch()}
        <div className="my-4 w-14 border-b border-neutral-100 dark:border-neutral-800"></div>
        <div className="flex items-end justify-between gap-2">
          <span className="text-base font-semibold text-secondary-500">
            {price}
            {` `}
            <span className="text-sm font-normal text-neutral-500 dark:text-neutral-400">/night</span>
          </span>
          {!!reviewStart && <StartRating reviewCount={reviewCount} point={reviewStart} />}
        </div>
      </div>
    )
  }

  return (
    <div
      className={`nc-StayCardH group relative overflow-hidden rounded-2xl border border-neutral-100 bg-white transition-shadow hover:shadow-xl dark:border-neutral-800 dark:bg-neutral-900 ${className}`}
    >
      <Link href={listingHref} className="absolute inset-0"></Link>
      <div className="grid grid-cols-1 md:flex md:flex-row">
        {renderSliderGallery()}
        {renderContent()}
      </div>
    </div>
  )
}

export default StayCardH
