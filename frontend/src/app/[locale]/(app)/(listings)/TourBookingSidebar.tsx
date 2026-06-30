'use client'

import ButtonPrimary from '@/shared/ButtonPrimary'
import {
  isTourPeriodBookable,
} from '@/lib/tour-periods'
import { DEFAULT_GUESTS_EXPERIENCE, totalGuestCount } from '@/lib/guest-search-defaults'
import type { GuestsObject } from '@/type'
import { buildListingCheckoutUrl } from '@/lib/stay-checkout-url'
import { useVitrinHref } from '@/hooks/use-vitrin-href'
import { getMessages } from '@/utils/getT'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import GuestsInputPopover from './components/GuestsInputPopover'
import TourPeriodSelect from './components/TourPeriodSelect'
import { useTourPeriodSelection } from './TourPeriodContext'
import {
  useConvertedListingPrice,
  useCheckoutPaymentAmount,
  useFormatMoneyInPreferredCurrency,
} from '@/contexts/preferred-currency-context'

export default function TourBookingSidebar({
  listingId,
  fallbackPrice,
  fallbackPriceAmount,
  fallbackPriceCurrency,
  locale = 'tr',
}: {
  listingId: string
  fallbackPrice?: string
  fallbackPriceAmount?: number
  fallbackPriceCurrency?: string
  locale?: string
}) {
  const { options, selected, setSelected } = useTourPeriodSelection()
  const m = getMessages(locale)
  const td = m.listing.tourDetail
  const router = useRouter()
  const vitrinHref = useVitrinHref()
  const [guests, setGuests] = useState<GuestsObject>(DEFAULT_GUESTS_EXPERIENCE)

  const bookable = isTourPeriodBookable(selected)
  const guestCount = Math.max(1, totalGuestCount(guests))
  const fallbackAmount =
    fallbackPriceAmount != null && Number.isFinite(fallbackPriceAmount) && fallbackPriceAmount > 0
      ? fallbackPriceAmount
      : null
  const personPrice = selected?.price ?? fallbackAmount
  const periodCurrency = (selected?.currencyCode || fallbackPriceCurrency || 'TRY').trim().toUpperCase()
  const unitTotal =
    bookable && personPrice != null && Number.isFinite(personPrice) ? personPrice * guestCount : 0

  const convertedFallback = useConvertedListingPrice(
    fallbackPrice,
    fallbackPriceAmount,
    fallbackPriceCurrency,
  )
  const convertedPeriodPrice = useFormatMoneyInPreferredCurrency(personPrice, periodCurrency)
  const convertedUnitTotal = useFormatMoneyInPreferredCurrency(unitTotal, periodCurrency)
  const checkoutPayment = useCheckoutPaymentAmount(
    selected?.currencyCode || fallbackPriceCurrency || 'TRY',
    unitTotal,
  )

  const displayPrice =
    personPrice != null
      ? convertedPeriodPrice
      : bookable
        ? convertedFallback
        : '—'

  const canCheckout =
    Boolean(listingId.trim()) &&
    bookable &&
    selected?.startDate &&
    selected?.endDate &&
    unitTotal > 0

  function goCheckout() {
    if (!canCheckout || !selected?.startDate || !selected?.endDate) return
    const start = new Date(`${selected.startDate}T12:00:00`)
    const end = new Date(`${selected.endDate}T12:00:00`)
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return
    router.push(
      buildListingCheckoutUrl(vitrinHref('/checkout'), {
        listingId,
        startDate: start,
        endDate: end,
        currencyCode: checkoutPayment.currencyCode,
        unitPrice: checkoutPayment.unitPrice,
        guests,
        extra: { tour_period_id: selected.id },
      }),
    )
  }

  return (
    <div className="listingSection__wrap sm:shadow-xl">
      <div>
        <span className="text-3xl font-semibold">
          {bookable ? displayPrice : '—'}
          <span className="ml-1 text-base font-normal text-neutral-500 dark:text-neutral-400">
            {bookable ? td.pricePerPerson : ''}
          </span>
        </span>
      </div>

      <div className="mt-4 flex flex-col rounded-3xl border border-neutral-200 dark:border-neutral-700">
        <TourPeriodSelect
          className="z-11 flex-1"
          periods={options}
          selectedId={selected?.id}
          onChange={setSelected}
        />
        <div className="w-full border-b border-neutral-200 dark:border-neutral-700" />
        <GuestsInputPopover
          className="flex-1"
          guestDefaults={DEFAULT_GUESTS_EXPERIENCE}
          value={guests}
          onChange={setGuests}
        />
      </div>

      {bookable && unitTotal > 0 ? (
        <p className="mt-4 text-sm text-neutral-600 dark:text-neutral-400">
          {td.pricePerPerson}: {convertedUnitTotal} ({guestCount} {m.HeroSearchForm.Guests.toLowerCase()})
        </p>
      ) : null}

      {bookable ? (
        <ButtonPrimary type="button" className="mt-4 w-full" disabled={!canCheckout} onClick={goCheckout}>
          {m.common.Reserve}
        </ButtonPrimary>
      ) : (
        <ButtonPrimary type="button" disabled className="mt-4 w-full cursor-not-allowed opacity-60">
          {td.salesClosed}
        </ButtonPrimary>
      )}
    </div>
  )
}
