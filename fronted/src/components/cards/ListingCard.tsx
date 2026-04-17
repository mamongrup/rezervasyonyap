'use client'

import ListingPrice from '@/components/ListingPrice'
import BtnLikeIcon from '@/components/BtnLikeIcon'
import GallerySlider from '@/components/GallerySlider'
import SaleOffBadge from '@/components/SaleOffBadge'
import StartRating from '@/components/StartRating'
import { TListingBase, CardConfig } from '@/types/listing-types'
import { Badge } from '@/shared/Badge'
import { Location06Icon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import Link from 'next/link'
import { FC } from 'react'
import { useParams } from 'next/navigation'
import { useVitrinHref } from '@/hooks/use-vitrin-href'
import { getMessages } from '@/utils/getT'

interface ListingCardProps {
  className?: string
  data: TListingBase
  config: CardConfig
  size?: 'default' | 'small'
}

/**
 * Universal gallery-based listing card.
 * All category cards (Hotel, HolidayHome, Yacht, Tour, Activity, etc.) use this as base.
 */
const ListingCard: FC<ListingCardProps> = ({
  size = 'default',
  className = '',
  data,
  config,
}) => {
  const params = useParams()
  const locale = typeof params?.locale === 'string' ? params.locale : 'tr'
  const vitrinHref = useVitrinHref()
  const m = getMessages(locale)

  const {
    galleryImgs = [],
    listingCategory,
    address,
    title,
    handle,
    like,
    saleOff,
    isAds,
    price,
    priceAmount,
    priceCurrency,
    reviewStart,
    reviewCount,
    mealPlanSummary,
  } = data

  const listingHref = vitrinHref(`${config.linkBase}/${handle}`)
  const ratioClass = config.ratioClass ?? 'aspect-w-4 aspect-h-3'
  const priceUnit = config.priceUnit ?? ''
  const extraInfo = config.extraInfo ? config.extraInfo(data, locale) : null

  // Yemek planı rozeti
  const mealBadge =
    mealPlanSummary === 'meal_only' ? (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500 px-2 py-0.5 text-xs font-semibold text-white shadow-sm">
        🍽️ {m.listing.meal_only}
      </span>
    ) : mealPlanSummary === 'both' ? (
      <span className="inline-flex items-center gap-1 rounded-full bg-amber-500 px-2 py-0.5 text-xs font-semibold text-white shadow-sm">
        🍽️ {m.listing.both}
      </span>
    ) : null

  return (
    <div
      className={`group relative bg-white dark:bg-neutral-900 ${
        size === 'default' ? 'border border-neutral-100 dark:border-neutral-800' : ''
      } overflow-hidden rounded-2xl transition-shadow hover:shadow-xl ${className}`}
    >
      {/* Gallery */}
      <div className="relative w-full">
        <GallerySlider
          ratioClass={ratioClass}
          galleryImgs={galleryImgs}
          href={listingHref}
          galleryClass={size === 'default' ? undefined : ''}
        />
        <BtnLikeIcon listingId={data.id} className="absolute end-3 top-3 z-1" />
        {saleOff && <SaleOffBadge className="absolute start-3 top-3" />}
        {/* Yemek planı rozeti — görselin sol alt köşesi */}
        {mealBadge && !saleOff && (
          <div className="absolute start-3 top-3 z-1">{mealBadge}</div>
        )}
        {mealBadge && saleOff && (
          <div className="absolute start-3 top-9 z-1">{mealBadge}</div>
        )}
      </div>

      {/* Content */}
      <Link href={listingHref}>
        <div className={size === 'default' ? 'space-y-3 p-4' : 'space-y-1 p-3'}>
          <div className={size === 'default' ? 'space-y-1.5' : 'space-y-1'}>
            <span className="text-xs font-medium uppercase tracking-wide text-neutral-400 dark:text-neutral-500">
              {listingCategory ?? config.categoryLabel}
            </span>
            <div className="flex items-center gap-x-2">
              {isAds && <Badge color="green">REKLAM</Badge>}
              <h2 className="text-base font-semibold capitalize text-neutral-900 dark:text-white">
                <span className="line-clamp-1">{title}</span>
              </h2>
            </div>
            {address && (
              <div className="flex items-center gap-x-1.5 text-sm text-neutral-500 dark:text-neutral-400">
                {size === 'default' && (
                  <HugeiconsIcon icon={Location06Icon} size={14} color="currentColor" strokeWidth={1.5} />
                )}
                <span className="line-clamp-1">{address}</span>
              </div>
            )}
            {extraInfo && (
              <div className="text-sm text-neutral-500 dark:text-neutral-400">{extraInfo}</div>
            )}
          </div>
          <div className="w-14 border-b border-neutral-100 dark:border-neutral-800" />
          <div className="flex items-center justify-between gap-2">
            <div className="flex flex-wrap items-baseline gap-x-1.5 gap-y-1">
              <ListingPrice
                className="text-base font-semibold"
                price={price}
                priceAmount={priceAmount}
                priceCurrency={priceCurrency}
              />
              {priceUnit && size === 'default' && (
                <span className="text-sm font-normal text-neutral-500 dark:text-neutral-400">
                  {priceUnit}
                </span>
              )}
            </div>
            {!!reviewStart && <StartRating reviewCount={reviewCount} point={reviewStart} />}
          </div>
        </div>
      </Link>
    </div>
  )
}

export default ListingCard
