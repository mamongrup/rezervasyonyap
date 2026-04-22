'use client'

import ListingPrice from '@/components/ListingPrice'
import BtnLikeIcon from '@/components/BtnLikeIcon'
import SaleOffBadge from '@/components/SaleOffBadge'
import StartRating from '@/components/StartRating'
import type { TListingBase } from '@/types/listing-types'
import { Badge } from '@/shared/Badge'
import { Location06Icon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import Image from 'next/image'
import Link from 'next/link'
import { FC } from 'react'
import { useVitrinHref } from '@/hooks/use-vitrin-href'
import { normalizeCatalogVertical } from '@/lib/catalog-listing-vertical'
import { stayDetailPathForVertical } from '@/lib/stay-detail-routes'
import listingPlaceholder from '@/images/hero-right.png'

const FALLBACK_IMG =
  typeof listingPlaceholder === 'string' ? listingPlaceholder : listingPlaceholder.src

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
    priceCurrency,
    reviewStart,
    reviewCount,
    listingVertical,
  } = data

  const detailBase = stayDetailPathForVertical(normalizeCatalogVertical(listingVertical))
  const listingHref = vitrinHref(`${detailBase}/${listingHandle}`)
  const imgSrc =
    (galleryImgs?.[0] && typeof galleryImgs[0] === 'string'
      ? galleryImgs[0]
      : (galleryImgs?.[0] as { src: string } | undefined)?.src) ||
    featuredImage ||
    FALLBACK_IMG

  const renderSliderGallery = () => {
    return (
      <div className="relative w-full">
        <Link href={listingHref} className="block">
          <div
            className={`relative w-full overflow-hidden rounded-xl`}
            style={{ paddingBottom: '75%' }}
          >
            <Image
              src={imgSrc}
              fill
              alt={title ?? 'listing'}
              className="object-cover transition-transform duration-300 group-hover:scale-105"
              sizes="(max-width: 1025px) 100vw, 25vw"
              unoptimized={
                imgSrc.startsWith('http') ||
                imgSrc.startsWith('/uploads/') ||
                imgSrc.startsWith('data:')
              }
            />
          </div>
        </Link>
        <BtnLikeIcon isLiked={like} className="absolute end-3 top-3 z-1" />
        {saleOff && <SaleOffBadge className="absolute start-3 top-3" />}
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
            <ListingPrice price={price} priceAmount={priceAmount} priceCurrency={priceCurrency} />
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
