'use client'

import ButtonPrimary from '@/shared/ButtonPrimary'
import { DEFAULT_GUESTS_EXPERIENCE, totalGuestCount } from '@/lib/guest-search-defaults'
import type { GuestsObject } from '@/type'
import { parseListingPriceString } from '@/lib/parse-listing-price'
import { buildListingCheckoutUrl } from '@/lib/stay-checkout-url'
import { useVitrinHref } from '@/hooks/use-vitrin-href'
import { getMessages } from '@/utils/getT'
import { useRouter } from 'next/navigation'
import { useMemo, useState } from 'react'
import DatesRangeInputPopover from './components/DatesRangeInputPopover'
import GuestsInputPopover from './components/GuestsInputPopover'
import { useConvertedListingPrice, useCheckoutPaymentAmount } from '@/contexts/preferred-currency-context'

export default function ExperienceBookingSidebar({
  listingId,
  price,
  priceAmount,
  priceCurrency,
  locale = 'tr',
}: {
  listingId: string
  price?: string
  priceAmount?: number
  priceCurrency?: string
  locale?: string
}) {
  const m = getMessages(locale)
  const td = m.listing.tourDetail
  const router = useRouter()
  const vitrinHref = useVitrinHref()

  const parsed = useMemo(() => (price ? parseListingPriceString(price) : null), [price])
  const currencyCode = (priceCurrency || parsed?.currency || 'TRY').trim().toUpperCase()
  const personPrice = priceAmount ?? parsed?.amount ?? 0

  const displayPrice = useConvertedListingPrice(price, personPrice > 0 ? personPrice : undefined, currencyCode)

  const [rangeStart, setRangeStart] = useState<Date | null>(null)
  const [rangeEnd, setRangeEnd] = useState<Date | null>(null)
  const [guests, setGuests] = useState<GuestsObject>(DEFAULT_GUESTS_EXPERIENCE)

  const guestCount = Math.max(1, totalGuestCount(guests))
  const unitTotal = personPrice > 0 ? personPrice * guestCount : 0
  const checkoutPayment = useCheckoutPaymentAmount(currencyCode, unitTotal)
  const hasDates = rangeStart != null && rangeEnd != null
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
        guests,
      }),
    )
  }

  return (
    <div className="listingSection__wrap sm:shadow-xl">
      <div className="flex justify-between">
        <span className="text-3xl font-semibold">
          {displayPrice}
          <span className="ml-1 text-base font-normal text-neutral-500 dark:text-neutral-400">
            {td.pricePerPerson}
          </span>
        </span>
      </div>

      <div className="mt-4 flex flex-col rounded-3xl border border-neutral-200 dark:border-neutral-700">
        <DatesRangeInputPopover
          className="z-11 flex-1"
          locale={locale}
          rangeStart={rangeStart}
          rangeEnd={rangeEnd}
          onRangeChange={([s, e]) => {
            setRangeStart(s)
            setRangeEnd(e)
          }}
        />
        <div className="w-full border-b border-neutral-200 dark:border-neutral-700" />
        <GuestsInputPopover
          className="flex-1"
          guestDefaults={DEFAULT_GUESTS_EXPERIENCE}
          value={guests}
          onChange={setGuests}
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
