'use client'

import ListingPrice from '@/components/ListingPrice'
import BtnLikeIcon from '@/components/BtnLikeIcon'
import GallerySlider from '@/components/GallerySlider'
import SaleOffBadge from '@/components/SaleOffBadge'
import StartRating from '@/components/StartRating'
import { displayListingCategoryLine } from '@/lib/listing-category-display'
import { holidayHomeCapacitySummary } from '@/lib/holiday-home-capacity-summary'
import type { TListingBase, TListingHolidayHome } from '@/types/listing-types'
import { Badge } from '@/shared/Badge'
import { getMessages } from '@/utils/getT'
import { Location06Icon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import clsx from 'clsx'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { FC } from 'react'
import { useVitrinHref } from '@/hooks/use-vitrin-href'
import { normalizeCatalogVertical } from '@/lib/catalog-listing-vertical'
import { stayDetailPathForVertical } from '@/lib/stay-detail-routes'

interface StayCard2Props {
  className?: string
  data: TListingBase
  size?: 'default' | 'small'
}

const StayCard2: FC<StayCard2Props> = ({ size = 'default', className = '', data }) => {
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
    priceCurrency,
    reviewStart,
    reviewCount,
    id,
    listingVertical,
  } = data

  const holidayCapacityLine =
    listingVertical === 'holiday_home'
      ? holidayHomeCapacitySummary(data as TListingHolidayHome, messages.listing.capacitySpec, true)
      : null

  const detailBase = stayDetailPathForVertical(normalizeCatalogVertical(listingVertical))
  const listingHref = vitrinHref(`${detailBase}/${listingHandle}`)
  const sliderImages = galleryImgs?.length ? galleryImgs : featuredImage ? [featuredImage] : []

  const renderSliderGallery = () => {
    return (
      <div className="relative w-full">
        <GallerySlider ratioClass="aspect-w-12 aspect-h-11" galleryImgs={sliderImages} href={listingHref} />
        <BtnLikeIcon isLiked={like} className="absolute end-3 top-3 z-1" />
        {saleOff && <SaleOffBadge className="absolute start-3 top-3" />}
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
