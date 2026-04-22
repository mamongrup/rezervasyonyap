'use client'

import ListingPrice from '@/components/ListingPrice'
import BtnLikeIcon from '@/components/BtnLikeIcon'
import GallerySlider from '@/components/GallerySlider'
import SaleOffBadge from '@/components/SaleOffBadge'
import StartRating from '@/components/StartRating'
import { TExperienceListing } from '@/data/listings'
import { Badge } from '@/shared/Badge'
import { useVitrinHref } from '@/hooks/use-vitrin-href'
import { normalizeCatalogVertical } from '@/lib/catalog-listing-vertical'
import { detailPathForVertical } from '@/lib/listing-detail-routes'
import Link from 'next/link'
import { FC } from 'react'

interface Props {
  className?: string
  ratioClass?: string
  data: TExperienceListing
  size?: 'default' | 'small'
}

const ExperiencesCard: FC<Props> = ({
  size = 'default',
  className = '',
  data,
  ratioClass = 'aspect-w-3 aspect-h-3',
}) => {
  const vitrinHref = useVitrinHref()
  const {
    galleryImgs,
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
    id,
    listingVertical,
  } = data as TExperienceListing & { priceAmount?: number; priceCurrency?: string }

  const base = detailPathForVertical(normalizeCatalogVertical(listingVertical) ?? 'activity')
  const listingHref = vitrinHref(`${base}/${listingHandle}`)

  const renderSliderGallery = () => {
    return (
      <div className="relative w-full overflow-hidden rounded-2xl">
        <GallerySlider ratioClass={ratioClass} galleryImgs={galleryImgs} href={listingHref} />
        <BtnLikeIcon isLiked={like} className="absolute top-3 right-3" />
        {saleOff && <SaleOffBadge className="absolute top-3 left-3" />}
      </div>
    )
  }

  const renderContent = () => {
    return (
      <div className={size === 'default' ? 'space-y-2.5 px-1 pt-4' : 'space-y-1 p-3'}>
        <div>
          <div className="text-sm text-neutral-500 dark:text-neutral-400">{address}</div>

          <div className="mt-1.5 flex items-center gap-x-2">
            {isAds && <Badge color="green">ADS</Badge>}
            <h2 className={`text-base font-medium capitalize`}>
              <span className="line-clamp-1">{title}</span>
            </h2>
          </div>
        </div>
        <div className="w-14 border-b border-neutral-100 dark:border-neutral-800"></div>
        <div className="flex items-center justify-between gap-2">
          <div>
            <ListingPrice
              className="text-base font-semibold"
              price={price}
              priceAmount={priceAmount}
              priceCurrency={priceCurrency}
            />
            {size === 'default' && (
              <>
                <span className="mx-1 text-xs font-light text-neutral-400 dark:text-neutral-500">/</span>
                <span className="text-sm font-normal text-neutral-500 dark:text-neutral-400">guest</span>
              </>
            )}
          </div>
          <StartRating reviewCount={reviewCount} point={reviewStart} />
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

export default ExperiencesCard
