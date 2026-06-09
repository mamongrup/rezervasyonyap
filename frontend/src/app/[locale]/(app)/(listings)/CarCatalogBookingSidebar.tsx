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

function rentalDays(start: Date, end: Date): number {
  const diff = Math.round((end.getTime() - start.getTime()) / 86400000)
  return diff > 0 ? diff : 0
}

export default function CarCatalogBookingSidebar({
  listingId,
  price,
  priceCurrency,
  reviewStart,
  reviewCount,
  locale = 'tr',
}: {
  listingId: string
  price?: string
  priceCurrency?: string
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
  const dailyRate = parsed?.amount ?? 0

  const [rangeStart, setRangeStart] = useState<Date | null>(null)
  const [rangeEnd, setRangeEnd] = useState<Date | null>(null)

  const days = rangeStart && rangeEnd ? rentalDays(rangeStart, rangeEnd) : 0
  const unitTotal = dailyRate > 0 && days > 0 ? dailyRate * days : 0
  const hasDates = rangeStart != null && rangeEnd != null && days > 0
  const canCheckout = Boolean(listingId.trim()) && hasDates && unitTotal > 0

  function goCheckout() {
    if (!canCheckout || !rangeStart || !rangeEnd) return
    router.push(
      buildListingCheckoutUrl(vitrinHref('/checkout'), {
        listingId,
        startDate: rangeStart,
        endDate: rangeEnd,
        currencyCode,
        unitPrice: unitTotal,
      }),
    )
  }

  return (
    <div className="sticky top-5 mt-10 listingSection__wrap sm:shadow-xl">
      <div className="flex justify-between">
        <span className="text-3xl font-semibold">
          {price ?? '—'}
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
          onRangeChange={([s, e]) => {
            setRangeStart(s)
            setRangeEnd(e)
          }}
        />
      </div>

      {!hasDates ? (
        <p className="mt-4 rounded-2xl bg-neutral-50 px-4 py-3 text-sm text-neutral-600 dark:bg-neutral-800/50 dark:text-neutral-400">
          {m.listing.sidebar.addDates}
        </p>
      ) : null}

      <ButtonPrimary type="button" className="mt-4 w-full" disabled={!canCheckout} onClick={goCheckout}>
        {m.common.Reserve}
      </ButtonPrimary>
    </div>
  )
}
