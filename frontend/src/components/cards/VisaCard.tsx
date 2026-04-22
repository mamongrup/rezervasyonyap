'use client'

import BtnLikeIcon from '@/components/BtnLikeIcon'
import { DiscountBadgeLabel } from '@/components/DiscountBadgeLabel'
import { TListingVisa } from '@/types/listing-types'
import { useVitrinHref } from '@/hooks/use-vitrin-href'
import { detailPathForVertical } from '@/lib/listing-detail-routes'
import { Badge } from '@/shared/Badge'
import Link from 'next/link'
import { FC } from 'react'

interface VisaCardProps {
  className?: string
  data: TListingVisa
  size?: 'default' | 'small'
}

const FLAG_BASE = 'https://flagcdn.com/w80'

const VisaCard: FC<VisaCardProps> = ({ size = 'default', className = '', data }) => {
  const vitrinHref = useVitrinHref()
  const {
    title,
    handle,
    country,
    countryCode,
    visaType,
    processingDays,
    maxStayDays,
    price,
    isOnlineApplicable,
    reviewStart,
    reviewCount,
    like,
    saleOff,
    isAds,
  } = data

  const href = vitrinHref(`${detailPathForVertical('visa')}/${handle}`)

  return (
    <Link href={href}>
      <div
        className={`group relative flex flex-col overflow-hidden rounded-2xl border border-neutral-100 bg-white transition-shadow hover:shadow-xl dark:border-neutral-800 dark:bg-neutral-900 ${className}`}
      >
        {/* Flag banner */}
        <div className="relative flex h-28 items-center justify-center overflow-hidden bg-gradient-to-br from-primary-50 to-primary-100 dark:from-neutral-800 dark:to-neutral-700">
          {countryCode && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={`${FLAG_BASE}/${countryCode.toLowerCase()}.png`}
              alt={country ?? title}
              className="h-16 w-auto rounded shadow-lg"
            />
          )}
          <BtnLikeIcon isLiked={like} className="absolute end-3 top-3 z-1" />
          {saleOff && (
            <span className="absolute start-3 top-3 rounded-full bg-secondary-500 px-2 py-1 text-xs font-medium text-white">
              <DiscountBadgeLabel text={saleOff} />
            </span>
          )}
          {isOnlineApplicable && (
            <span className="absolute bottom-2 start-3 rounded-full bg-green-500 px-2 py-0.5 text-xs font-medium text-white">
              Online Başvuru
            </span>
          )}
        </div>

        {/* Content */}
        <div className={size === 'default' ? 'space-y-3 p-4' : 'space-y-2 p-3'}>
          <div className="space-y-1">
            {isAds && <Badge color="green">REKLAM</Badge>}
            <div className="flex items-start justify-between gap-2">
              <h2 className="text-base font-semibold capitalize text-neutral-900 dark:text-white">
                <span className="line-clamp-1">{country ?? title}</span>
              </h2>
            </div>
            {visaType && (
              <span className="inline-block rounded-full bg-primary-50 px-2.5 py-0.5 text-xs font-medium text-primary-700 dark:bg-primary-900/30 dark:text-primary-300">
                {visaType}
              </span>
            )}
          </div>

          <div className="w-14 border-b border-neutral-100 dark:border-neutral-800" />

          <div className="space-y-1 text-sm text-neutral-500 dark:text-neutral-400">
            {processingDays != null && (
              <div className="flex items-center justify-between">
                <span>İşlem süresi</span>
                <span className="font-medium text-neutral-700 dark:text-neutral-300">
                  {processingDays} iş günü
                </span>
              </div>
            )}
            {maxStayDays != null && (
              <div className="flex items-center justify-between">
                <span>Kalış süresi</span>
                <span className="font-medium text-neutral-700 dark:text-neutral-300">
                  {maxStayDays} gün
                </span>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between gap-2 pt-1">
            <div>
              <span className="text-base font-semibold text-primary-600">{price}</span>
              {size === 'default' && (
                <span className="ml-1 text-sm text-neutral-500 dark:text-neutral-400">/kişi</span>
              )}
            </div>
            {!!reviewStart && (
              <div className="flex items-center gap-1 text-sm">
                <span className="text-yellow-400">★</span>
                <span className="font-medium">{reviewStart.toFixed(1)}</span>
                {reviewCount != null && (
                  <span className="text-neutral-400">({reviewCount})</span>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </Link>
  )
}

export default VisaCard
