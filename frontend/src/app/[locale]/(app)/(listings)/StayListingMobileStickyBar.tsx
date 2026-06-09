'use client'

import { useStayListingQuote } from '@/hooks/use-stay-listing-quote'
import { buildStayCheckoutUrl } from '@/lib/stay-checkout-url'
import type { MealPlanItem } from '@/lib/travel-api'
import type { StayBookingRules } from '@/types/listing-types'
import ButtonPrimary from '@/shared/ButtonPrimary'
import { getMessages } from '@/utils/getT'
import { useVitrinHref } from '@/hooks/use-vitrin-href'
import clsx from 'clsx'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

export type StayListingMobileStickyBarProps = {
  locale: string
  listingId?: string
  mealPlans: MealPlanItem[]
  price: string
  priceAmount: number | undefined
  priceCurrency: string | undefined
  saleOff: string | null | undefined
  discountPercent: number | null | undefined
  poolHeating?: { dailyAmount: number; feeSummary: string; currencyCode: string } | null
  stayBookingRules?: StayBookingRules
  cleaningFeeAmount?: number
  damageDepositAmount?: number
  ruleFallbackNightly?: number
  ruleNightlyRange?: { min: number; max: number }
  reservationAnchorId?: string
}

export default function StayListingMobileStickyBar({
  locale,
  listingId,
  mealPlans,
  price,
  priceAmount,
  priceCurrency,
  saleOff,
  discountPercent,
  poolHeating = null,
  stayBookingRules,
  cleaningFeeAmount,
  damageDepositAmount,
  ruleFallbackNightly,
  ruleNightlyRange,
  reservationAnchorId = 'stay-reservation-card',
}: StayListingMobileStickyBarProps) {
  const messages = getMessages(locale)
  const router = useRouter()
  const vitrinHref = useVitrinHref()

  const [rangeStart] = useState<Date | null>(null)
  const [rangeEnd] = useState<Date | null>(null)
  const [poolHeatingSelected] = useState(false)

  const {
    nights,
    displayMainPrice,
    grandTotal,
    currencyCode,
    showDiscountRow,
    originalPriceNum,
    basePriceNum,
    discountPct,
    formatConverted,
  } = useStayListingQuote({
    mealPlans,
    price,
    priceAmount,
    priceCurrency,
    saleOff,
    discountPercent,
    rangeStart,
    rangeEnd,
    poolHeating,
    poolHeatingSelected,
    minShortStayNights: stayBookingRules?.minShortStayNights,
    shortStayFeeAmount: stayBookingRules?.shortStayFeeAmount,
    cleaningFeeAmount,
    damageDepositAmount,
    ruleFallbackNightly,
    ruleNightlyRange,
  })

  const sidebar = messages.listing.sidebar
  const showDiscount =
    showDiscountRow &&
    originalPriceNum != null &&
    Number.isFinite(originalPriceNum) &&
    originalPriceNum > basePriceNum
  const showStayTotal = nights > 0 && grandTotal > 0

  const canCheckout =
    Boolean(listingId?.trim()) && rangeStart != null && rangeEnd != null && grandTotal > 0

  function onReserve() {
    if (canCheckout && listingId && rangeStart && rangeEnd) {
      router.push(
        buildStayCheckoutUrl(vitrinHref('/checkout'), {
          listingId,
          startDate: rangeStart,
          endDate: rangeEnd,
          currencyCode,
          unitPrice: grandTotal,
        }),
      )
      return
    }
    const el = document.getElementById(reservationAnchorId)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  return (
    <div
      className={clsx(
        'fixed inset-x-0 z-40 border-t border-neutral-200/80 bg-white/95 px-4 py-3.5 shadow-[0_-12px_40px_rgba(15,23,42,0.12)] backdrop-blur-md lg:hidden dark:border-neutral-700/80 dark:bg-neutral-950/95',
        'bottom-above-mobile-nav',
      )}
    >
      <div className="mx-auto flex max-w-lg items-center gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-end gap-x-2 gap-y-1">
            {showDiscount ? (
              <div className="flex min-w-0 flex-col gap-0.5">
                {discountPct != null ? (
                  <span className="inline-flex w-fit items-center rounded-full bg-red-500 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white shadow-sm">
                    {sidebar.discountBadge.replace('{percent}', String(discountPct))}
                  </span>
                ) : null}
                <span className="text-xs font-medium tabular-nums leading-none line-through text-neutral-400 dark:text-neutral-500">
                  {formatConverted(originalPriceNum!, currencyCode)}
                </span>
              </div>
            ) : null}
            <div className="flex min-w-0 items-baseline gap-1.5">
              <p className="truncate text-xl font-bold tabular-nums tracking-tight text-neutral-900 dark:text-white">
                {displayMainPrice}
              </p>
              <span className="shrink-0 text-xs font-medium text-neutral-500 dark:text-neutral-400">
                {sidebar.perNight}
              </span>
            </div>
          </div>
          {showStayTotal ? (
            <p className="mt-1 text-xs font-medium text-primary-700 dark:text-primary-300">
              {nights} {sidebar.nightsWord} · {sidebar.total}{' '}
              <span className="font-semibold tabular-nums text-neutral-900 dark:text-white">
                {formatConverted(grandTotal, currencyCode)}
              </span>
            </p>
          ) : (
            <p className="mt-1 text-[11px] text-neutral-500 dark:text-neutral-400">
              {sidebar.reservationNoFeeNote}
            </p>
          )}
        </div>
        <ButtonPrimary
          type="button"
          className="shrink-0 rounded-2xl px-5! py-2.5! text-sm font-semibold shadow-lg shadow-neutral-900/15"
          onClick={onReserve}
        >
          {messages.common.Reserve}
        </ButtonPrimary>
      </div>
    </div>
  )
}