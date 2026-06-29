'use client'

import ButtonPrimary from '@/shared/ButtonPrimary'
import StartRating from '@/components/StartRating'
import { parseListingPriceString } from '@/lib/parse-listing-price'
import { buildListingCheckoutUrl } from '@/lib/stay-checkout-url'
import { useVitrinHref } from '@/hooks/use-vitrin-href'
import { getMessages } from '@/utils/getT'
import { useRouter } from 'next/navigation'
import { useMemo, useState } from 'react'
import DatesRangeInputPopover from './components/DatesRangeInputPopover'
import type { ListingAvailabilityDay } from '@/lib/travel-api'
import { useConvertedListingPrice, useCheckoutPaymentAmount } from '@/contexts/preferred-currency-context'

function rentalDays(start: Date, end: Date): number {
  const diff = Math.round((end.getTime() - start.getTime()) / 86400000)
  return diff > 0 ? diff : 0
}

export default function CarCatalogBookingSidebar({
  listingId,
  price,
  priceAmount,
  priceCurrency,
  availabilityDays,
  reviewStart,
  reviewCount,
  locale = 'tr',
}: {
  listingId: string
  price?: string
  priceAmount?: number
  priceCurrency?: string
  availabilityDays?: ListingAvailabilityDay[]
  reviewStart?: number
  reviewCount?: number
  locale?: string
}) {
  const m = getMessages(locale)
  const cd = m.listing.carDetail
  const router = useRouter()
  const vitrinHref = useVitrinHref()

  const parsed = useMemo(() => (price ? parseListingPriceString(price) : null), [price])
  const currencyCode = (priceCurrency || parsed?.currency || 'TRY').trim().toUpperCase()
  const dailyRate = priceAmount ?? parsed?.amount ?? 0

  const displayPrice = useConvertedListingPrice(
    price,
    dailyRate > 0 ? dailyRate : undefined,
    currencyCode,
  )

  const [rangeStart, setRangeStart] = useState<Date | null>(null)
  const [rangeEnd, setRangeEnd] = useState<Date | null>(null)

  const days = rangeStart && rangeEnd ? rentalDays(rangeStart, rangeEnd) : 0
  const unitTotal = dailyRate > 0 && days > 0 ? dailyRate * days : 0
  const checkoutPayment = useCheckoutPaymentAmount(currencyCode, unitTotal)
  const hasDates = rangeStart != null && rangeEnd != null && days > 0
  const canCheckout = Boolean(listingId.trim()) && hasDates && unitTotal > 0

  function goCheckout() {
    if (!canCheckout || !rangeStart || !rangeEnd) return
    router.push(
      buildListingCheckoutUrl(vitrinHref('/checkout'), {
        listingId,
        startDate: rangeStart,
        endDate: rangeEnd,
        currencyCode: checkoutPayment.currencyCode,
        unitPrice: checkoutPayment.unitPrice,
      }),
    )
  }

  return (
    <div className="sticky top-5 mt-10 listingSection__wrap sm:shadow-xl">
      <div className="flex justify-between">
        <span className="text-3xl font-semibold">
          {displayPrice}
          <span className="ml-1 text-base font-normal text-neutral-500 dark:text-neutral-400">
            {cd.pricePerDay}
          </span>
        </span>
        <StartRating size="lg" point={reviewStart ?? 0} reviewCount={reviewCount ?? 0} />
      </div>

      <div className="mt-4 rounded-2xl border border-neutral-200 dark:border-neutral-700">
        <DatesRangeInputPopover
          locale={locale}
          rangeStart={rangeStart}
          rangeEnd={rangeEnd}
          availabilityDays={availabilityDays}
          onRangeChange={([s, e]) => {
            setRangeStart(s)
            setRangeEnd(e)
          }}
        />
      </div>

      <ButtonPrimary type="button" className="mt-4 w-full" disabled={!canCheckout} onClick={goCheckout}>
        {m.common.Reserve}
      </ButtonPrimary>
    </div>
  )
}
