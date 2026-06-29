'use client'

import ButtonPrimary from '@/shared/ButtonPrimary'
import type { FerryTicketFare } from '@/lib/travel-api'
import { DEFAULT_GUESTS_STAY, totalGuestCount } from '@/lib/guest-search-defaults'
import type { GuestsObject } from '@/type'
import { buildListingCheckoutUrl } from '@/lib/stay-checkout-url'
import { useVitrinHref } from '@/hooks/use-vitrin-href'
import { getMessages } from '@/utils/getT'
import { useRouter } from 'next/navigation'
import { useMemo, useState } from 'react'
import DatesRangeInputPopover from './components/DatesRangeInputPopover'
import GuestsInputPopover from './components/GuestsInputPopover'
import {
  useConvertedListingPrice,
  useCheckoutPaymentAmount,
  useFormatMoneyInPreferredCurrency,
} from '@/contexts/preferred-currency-context'

export default function FerryBookingSidebar({
  listingId,
  fares,
  currencyCode,
  fallbackPrice,
  fallbackPriceAmount,
  locale = 'tr',
}: {
  listingId: string
  fares: FerryTicketFare[]
  currencyCode: string
  fallbackPrice?: string
  fallbackPriceAmount?: number
  locale?: string
}) {
  const fd = getMessages(locale).listing.ferryDetail
  const m = getMessages(locale)
  const router = useRouter()
  const vitrinHref = useVitrinHref()
  const ticketLabels = fd.ticketType as Record<string, string>
  const listingCurrency = currencyCode.trim().toUpperCase() || 'TRY'

  const options = useMemo(
    () =>
      fares.map((fare) => ({
        id: fare.type,
        label: ticketLabels[fare.type] ?? fare.label_tr ?? fare.type,
        price: fare.official.adult,
      })),
    [fares, ticketLabels],
  )

  const [selectedType, setSelectedType] = useState(options[0]?.id ?? 'OW')
  const [rangeStart, setRangeStart] = useState<Date | null>(null)
  const [rangeEnd, setRangeEnd] = useState<Date | null>(null)
  const [guests, setGuests] = useState<GuestsObject>(DEFAULT_GUESTS_STAY)

  const selected = options.find((o) => o.id === selectedType) ?? options[0]
  const guestCount = Math.max(1, totalGuestCount(guests))
  const unitTotal =
    selected != null && Number.isFinite(selected.price) ? selected.price * guestCount : 0

  const convertedFallback = useConvertedListingPrice(
    fallbackPrice,
    fallbackPriceAmount,
    listingCurrency,
  )
  const convertedSelected = useFormatMoneyInPreferredCurrency(selected?.price, listingCurrency)
  const convertedUnitTotal = useFormatMoneyInPreferredCurrency(unitTotal, listingCurrency)
  const checkoutPayment = useCheckoutPaymentAmount(listingCurrency, unitTotal)

  const displayPrice = selected != null ? convertedSelected : convertedFallback

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
        extra: { ticket_type: selectedType },
      }),
    )
  }

  return (
    <div className="sticky top-5 listingSection__wrap sm:shadow-xl">
      <div>
        <span className="text-3xl font-semibold">
          {displayPrice}
          <span className="ml-1 text-base font-normal text-neutral-500 dark:text-neutral-400">
            {fd.pricePerPerson}
          </span>
        </span>
      </div>

      <div className="mt-4 flex flex-col rounded-3xl border border-neutral-200 dark:border-neutral-700">
        {options.length > 1 ? (
          <>
            <label className="sr-only" htmlFor="ferry-ticket-type">
              {fd.selectTicketType}
            </label>
            <select
              id="ferry-ticket-type"
              name="ticket_type"
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="w-full border-0 bg-transparent px-4 py-4 text-sm font-medium focus:ring-0"
            >
              {options.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {opt.label}
                </option>
              ))}
            </select>
            <div className="w-full border-b border-neutral-200 dark:border-neutral-700" />
          </>
        ) : (
          <input type="hidden" name="ticket_type" value={selectedType} />
        )}

        <DatesRangeInputPopover
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
          guestDefaults={DEFAULT_GUESTS_STAY}
          value={guests}
          onChange={setGuests}
        />
      </div>

      {hasDates && unitTotal > 0 ? (
        <p className="mt-4 text-sm text-neutral-600 dark:text-neutral-400">
          {fd.pricePerPerson}: {convertedUnitTotal} ({guestCount}{' '}
          {m.HeroSearchForm.Guests.toLowerCase()})
        </p>
      ) : (
        <p className="mt-4 rounded-2xl bg-neutral-50 px-4 py-3 text-sm text-neutral-600 dark:bg-neutral-800/50 dark:text-neutral-400">
          {m.listing.sidebar.addDates}
        </p>
      )}

      <ButtonPrimary type="button" className="mt-4 w-full" disabled={!canCheckout} onClick={goCheckout}>
        {m.common.Reserve}
      </ButtonPrimary>
    </div>
  )
}
