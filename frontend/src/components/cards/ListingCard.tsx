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

function normalizeHolidayHomeLocationPin(raw: string | null | undefined): string {
  const text = String(raw ?? '').trim()
  if (!text) return ''
  const parts = text
    .split(',')
    .map((segment) => segment.trim())
    .filter(Boolean)
    .map((segment) => segment.replace(/\b\d{4,6}\b/g, '').replace(/\s{2,}/g, ' ').trim())
    .flatMap((segment) => segment.split('/').map((piece) => piece.trim()).filter(Boolean))
  if (!parts.length) return ''
  const deduped: string[] = []
  for (const part of parts) {
    if (!deduped.some((x) => x.toLocaleLowerCase('tr') === part.toLocaleLowerCase('tr'))) {
      deduped.push(part)
    }
  }
  return deduped.join(', ')
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
    priceAmountMax,
    priceCurrency,
    reviewStart,
    reviewCount,
    mealPlanSummary,
    themeChipLabels,
  } = data

  const maxThemeChips = 4
  const themeChipsVisible = themeChipLabels?.slice(0, maxThemeChips) ?? []
  const themeChipsOverflow =
    themeChipLabels && themeChipLabels.length > maxThemeChips
      ? themeChipLabels.length - maxThemeChips
      : 0

  const listingHref = vitrinHref(`${config.linkBase}/${handle}`)
  const ratioClass = config.ratioClass ?? 'aspect-w-4 aspect-h-3'
  const priceUnit = config.priceUnit ?? ''
  const extraInfo = config.extraInfo ? config.extraInfo(data, locale) : null
  const isHolidayHomeCard =
    data.listingVertical === 'holiday_home' || config.linkBase.includes('/tatil-evi')
  const normalizedAddress =
    isHolidayHomeCard ? normalizeHolidayHomeLocationPin(address) : address

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
          uniqueID={String(data.id)}
          ratioClass={ratioClass}
          galleryImgs={galleryImgs}
          href={listingHref}
          galleryClass={size === 'default' ? undefined : ''}
        />
        <BtnLikeIcon listingId={data.id} className="absolute end-3 top-3 z-1" />
        {saleOff ? <SaleOffBadge desc={saleOff} className="absolute start-3 top-3" /> : null}
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
            {normalizedAddress && (
              <div className="flex items-center gap-x-1.5 text-sm text-neutral-500 dark:text-neutral-400">
                {size === 'default' && (
                  <HugeiconsIcon icon={Location06Icon} size={14} color="currentColor" strokeWidth={1.5} />
                )}
                <span className="line-clamp-1">{normalizedAddress}</span>
              </div>
            )}
            {themeChipsVisible.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {themeChipsVisible.map((label) => (
                  <span
                    key={label}
                    className="inline-flex items-center rounded-full border border-primary-200/90 bg-primary-50 px-2 py-0.5 text-xs font-medium text-primary-950 shadow-sm dark:border-primary-800/70 dark:bg-primary-950/35 dark:text-primary-100"
                  >
                    {label}
                  </span>
                ))}
                {themeChipsOverflow > 0 && (
                  <span className="inline-flex items-center rounded-full border border-neutral-200 bg-neutral-50 px-2 py-0.5 text-xs font-medium text-neutral-600 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300">
                    +{themeChipsOverflow}
                  </span>
                )}
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
                priceAmountMax={priceAmountMax}
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
