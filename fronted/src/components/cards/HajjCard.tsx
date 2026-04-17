'use client'

import BtnLikeIcon from '@/components/BtnLikeIcon'
import { DiscountBadgeLabel } from '@/components/DiscountBadgeLabel'
import StartRating from '@/components/StartRating'
import { TListingHajj } from '@/types/listing-types'
import { useVitrinHref } from '@/hooks/use-vitrin-href'
import { detailPathForVertical } from '@/lib/listing-detail-routes'
import { Badge } from '@/shared/Badge'
import Link from 'next/link'
import Image from 'next/image'
import { FC } from 'react'

interface HajjCardProps {
  className?: string
  data: TListingHajj
  size?: 'default' | 'small'
}

function StarRow({ count }: { count: number }) {
  return (
    <span className="text-yellow-400 text-xs">
      {'★'.repeat(Math.min(count, 5))}
      {'☆'.repeat(Math.max(0, 5 - count))}
    </span>
  )
}

const HajjCard: FC<HajjCardProps> = ({ size = 'default', className = '', data }) => {
  const vitrinHref = useVitrinHref()
  const {
    title,
    handle,
    featuredImage,
    packageType = 'umre',
    departureCity,
    departureDate,
    nights,
    hotelStars,
    flightIncluded,
    transportIncluded,
    visaIncluded,
    price,
    reviewStart,
    reviewCount,
    like,
    saleOff,
    isAds,
    listingCategory,
  } = data

  const href = vitrinHref(`${detailPathForVertical('hajj')}/${handle}`)
  const typeLabel = packageType === 'hac' ? 'Hac' : 'Umre'
  const typeColor = packageType === 'hac' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'

  return (
    <Link href={href}>
      <div
        className={`group relative overflow-hidden rounded-2xl border border-neutral-100 bg-white transition-shadow hover:shadow-xl dark:border-neutral-800 dark:bg-neutral-900 ${className}`}
      >
        {/* Image */}
        <div className="relative aspect-w-4 aspect-h-3 w-full overflow-hidden">
          {featuredImage ? (
            <Image
              fill
              src={featuredImage}
              alt={title}
              sizes="(max-width: 640px) 100vw, 350px"
              className="object-cover transition-transform duration-300 group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full items-center justify-center bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-neutral-800 dark:to-neutral-700">
              <span className="text-5xl">🕌</span>
            </div>
          )}
          <BtnLikeIcon isLiked={like} className="absolute end-3 top-3 z-1" />
          {saleOff && (
            <span className="absolute start-3 top-3 rounded-full bg-secondary-500 px-2 py-1 text-xs font-medium text-white">
              <DiscountBadgeLabel text={saleOff} />
            </span>
          )}
          <span className={`absolute bottom-3 start-3 rounded-full px-2.5 py-1 text-xs font-semibold ${typeColor}`}>
            {typeLabel}
          </span>
        </div>

        {/* Content */}
        <div className={size === 'default' ? 'space-y-3 p-4' : 'space-y-2 p-3'}>
          <div className="space-y-1">
            <span className="text-xs font-medium uppercase tracking-wide text-neutral-400">
              {listingCategory ?? typeLabel + ' Paketi'}
            </span>
            {isAds && <Badge color="green">REKLAM</Badge>}
            <h2 className="text-base font-semibold text-neutral-900 dark:text-white">
              <span className="line-clamp-1">{title}</span>
            </h2>
          </div>

          <div className="space-y-1 text-sm text-neutral-500 dark:text-neutral-400">
            {departureCity && (
              <div className="flex items-center justify-between">
                <span>Kalkış</span>
                <span className="font-medium text-neutral-700 dark:text-neutral-300">{departureCity}</span>
              </div>
            )}
            {nights != null && (
              <div className="flex items-center justify-between">
                <span>Süre</span>
                <span className="font-medium text-neutral-700 dark:text-neutral-300">{nights} gece</span>
              </div>
            )}
            {hotelStars != null && (
              <div className="flex items-center justify-between">
                <span>Otel</span>
                <StarRow count={hotelStars} />
              </div>
            )}
          </div>

          {/* Included badges */}
          <div className="flex flex-wrap gap-1.5">
            {flightIncluded && (
              <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs text-blue-600 dark:bg-blue-900/20 dark:text-blue-400">
                ✈ Uçak dahil
              </span>
            )}
            {transportIncluded && (
              <span className="rounded-full bg-purple-50 px-2 py-0.5 text-xs text-purple-600 dark:bg-purple-900/20 dark:text-purple-400">
                🚌 Ulaşım dahil
              </span>
            )}
            {visaIncluded && (
              <span className="rounded-full bg-green-50 px-2 py-0.5 text-xs text-green-600 dark:bg-green-900/20 dark:text-green-400">
                📋 Vize dahil
              </span>
            )}
          </div>

          <div className="w-14 border-b border-neutral-100 dark:border-neutral-800" />

          <div className="flex items-center justify-between gap-2">
            <div>
              <span className="text-base font-semibold text-primary-600">{price}</span>
              {size === 'default' && (
                <span className="ml-1 text-sm text-neutral-500 dark:text-neutral-400">/kişi</span>
              )}
            </div>
            {!!reviewStart && <StartRating reviewCount={reviewCount} point={reviewStart} />}
          </div>
        </div>
      </div>
    </Link>
  )
}

export default HajjCard
