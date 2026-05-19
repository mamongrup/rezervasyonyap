'use client'

import { useStayListingQuote } from '@/hooks/use-stay-listing-quote'
import { defaultStayDateRange } from '@/lib/stay-booking-rules'
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

  const [rangeStart] = useState<Date | null>(() => defaultStayDateRange(stayBookingRules)[0])
  const [rangeEnd] = useState<Date | null>(() => defaultStayDateRange(stayBookingRules)[1])
  const [poolHeatingSelected] = useState(false)

  const { displayMainPrice, grandTotal, currencyCode } = useStayListingQuote({
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
        'fixed inset-x-0 z-40 border-t border-neutral-200/90 bg-white/95 px-4 py-3 shadow-[0_-8px_30px_rgba(0,0,0,0.08)] backdrop-blur-md lg:hidden dark:border-neutral-700 dark:bg-neutral-900/95',
        'bottom-[calc(4.25rem+env(safe-area-inset-bottom,0px))]',
      )}
    >
      <div className="mx-auto flex max-w-lg items-center gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-xs text-neutral-500 dark:text-neutral-400">
            {messages.listing.sidebar.perNight}
          </p>
          <p className="truncate text-lg font-semibold text-neutral-900 dark:text-neutral-100">
            {displayMainPrice}
          </p>
        </div>
        <ButtonPrimary type="button" className="shrink-0 px-5!" onClick={onReserve}>
          {messages.common.Reserve}
        </ButtonPrimary>
      </div>
    </div>
  )
}