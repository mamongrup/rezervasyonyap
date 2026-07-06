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
import { useEffect, useState } from 'react'
import GuestsInputPopover from './components/GuestsInputPopover'
import TourPeriodSelect from './components/TourPeriodSelect'
import { useTourPeriodSelection } from './TourPeriodContext'
import { useCruiseCabinSelection } from './CruiseCabinContext'
import CruiseSidebarCabinPicker from './CruiseSidebarCabinPicker'
import {
  DEFAULT_CRUISE_CABIN_CAPACITY,
  requiredAccommodationUnits,
} from '@/lib/accommodation-units'
import { cabinDisplayPrice } from '@/lib/cruise-meta'
import { interpolate } from '@/utils/interpolate'
import {
  useConvertedListingPrice,
  useCheckoutPaymentAmount,
  useFormatMoneyInPreferredCurrency,
} from '@/contexts/preferred-currency-context'

export default function CruiseBookingSidebar({
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
  const cabinCtx = useCruiseCabinSelection()
  const m = getMessages(locale)
  const td = m.listing.tourDetail
  const cd = m.listing.cruiseDetail
  const router = useRouter()
  const vitrinHref = useVitrinHref()
  const [guests, setGuests] = useState<GuestsObject>(DEFAULT_GUESTS_EXPERIENCE)

  const hasCabins = Boolean(cabinCtx?.cabins.length)
  const cabinChosen = !hasCabins || Boolean(cabinCtx?.selectedCabin)
  const showCabinStep = Boolean(selected && isTourPeriodBookable(selected) && hasCabins)
  const showGuestStep = Boolean(selected && isTourPeriodBookable(selected) && cabinChosen)

  const setSelectedCabinId = cabinCtx?.setSelectedCabinId

  useEffect(() => {
    setSelectedCabinId?.('')
  }, [selected?.id, setSelectedCabinId])

  const bookable = isTourPeriodBookable(selected)
  const guestCount = Math.max(1, totalGuestCount(guests))
  const cabinCount =
    cabinChosen && hasCabins
      ? requiredAccommodationUnits(guestCount, DEFAULT_CRUISE_CABIN_CAPACITY)
      : 1
  const fallbackAmount =
    fallbackPriceAmount != null && Number.isFinite(fallbackPriceAmount) && fallbackPriceAmount > 0
      ? fallbackPriceAmount
      : null
  const cabinAmount = cabinCtx?.selectedCabin
    ? (cabinDisplayPrice(cabinCtx.selectedCabin)?.amount ?? null)
    : null
  const cabinCurrency = cabinCtx?.selectedCabin
    ? cabinDisplayPrice(cabinCtx.selectedCabin)?.currency
    : undefined
  const personPrice = cabinAmount ?? selected?.price ?? fallbackAmount
  const periodCurrency = (
    cabinCurrency ||
    selected?.currencyCode ||
    fallbackPriceCurrency ||
    'TRY'
  )
    .trim()
    .toUpperCase()
  const unitTotal =
    bookable && cabinChosen && personPrice != null && Number.isFinite(personPrice)
      ? personPrice * guestCount
      : 0

  const convertedFallback = useConvertedListingPrice(
    fallbackPrice,
    fallbackPriceAmount,
    fallbackPriceCurrency,
  )
  const convertedPeriodPrice = useFormatMoneyInPreferredCurrency(personPrice, periodCurrency)
  const convertedUnitTotal = useFormatMoneyInPreferredCurrency(unitTotal, periodCurrency)
  const checkoutPayment = useCheckoutPaymentAmount(periodCurrency, unitTotal)

  const displayPrice =
    cabinChosen && personPrice != null
      ? convertedPeriodPrice
      : bookable && !hasCabins
        ? convertedFallback
        : '—'

  const canCheckout =
    Boolean(listingId.trim()) &&
    bookable &&
    selected?.startDate &&
    selected?.endDate &&
    unitTotal > 0 &&
    cabinChosen

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
        extra: {
          tour_period_id: selected.id,
          ...(cabinCtx?.selectedCabin
            ? {
                cruise_cabin_id: cabinCtx.selectedCabin.id,
                cruise_cabin_name: cabinCtx.selectedCabin.name,
                ...(cabinCount > 1 ? { cruise_cabin_count: String(cabinCount) } : {}),
              }
            : {}),
        },
      }),
    )
  }

  return (
    <div id="cruise-reservation-card" className="listingSection__wrap scroll-mt-28 sm:shadow-xl">
      {cabinCtx?.selectedCabin ? (
        <p className="mb-2 text-sm font-medium text-neutral-700 dark:text-neutral-300">
          {cd.selectedCabin}: {cabinCtx.selectedCabin.name}
          {cabinCount > 1
            ? ` · ${interpolate(cd.cabinUnitCount, { count: String(cabinCount) })}`
            : ''}
        </p>
      ) : showCabinStep ? (
        <p className="mb-2 text-sm text-neutral-600 dark:text-neutral-400">{cd.selectCabinPrompt}</p>
      ) : null}
      <div>
        <span className="text-3xl font-semibold">
          {displayPrice}
          <span className="ml-1 text-base font-normal text-neutral-500 dark:text-neutral-400">
            {cabinChosen && bookable ? td.pricePerPerson : ''}
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
        {showCabinStep ? <CruiseSidebarCabinPicker locale={locale} /> : null}
        {showGuestStep ? (
          <>
            <div className="w-full border-b border-neutral-200 dark:border-neutral-700" />
            <GuestsInputPopover
              className="flex-1"
              guestDefaults={DEFAULT_GUESTS_EXPERIENCE}
              value={guests}
              onChange={setGuests}
            />
          </>
        ) : null}
      </div>

      {showGuestStep && cabinCount > 1 && hasCabins ? (
        <p className="mt-3 text-xs text-neutral-600 dark:text-neutral-400">
          {interpolate(cd.autoCabinCountNote, {
            cabins: String(cabinCount),
            guests: String(guestCount),
          })}
        </p>
      ) : null}

      {showGuestStep && unitTotal > 0 ? (
        <p className="mt-4 text-sm text-neutral-600 dark:text-neutral-400">
          {td.pricePerPerson}: {convertedUnitTotal} ({guestCount} {m.HeroSearchForm.Guests.toLowerCase()})
        </p>
      ) : null}

      {showGuestStep ? (
        <ButtonPrimary type="button" className="mt-4 w-full" disabled={!canCheckout} onClick={goCheckout}>
          {m.common.Reserve}
        </ButtonPrimary>
      ) : bookable && showCabinStep && !cabinCtx?.selectedCabin ? (
        <ButtonPrimary type="button" disabled className="mt-4 w-full cursor-not-allowed opacity-60">
          {cd.selectCabinPrompt}
        </ButtonPrimary>
      ) : bookable && !showCabinStep && !hasCabins ? (
        <ButtonPrimary type="button" className="mt-4 w-full" disabled={!canCheckout} onClick={goCheckout}>
          {m.common.Reserve}
        </ButtonPrimary>
      ) : !bookable ? (
        <ButtonPrimary type="button" disabled className="mt-4 w-full cursor-not-allowed opacity-60">
          {td.salesClosed}
        </ButtonPrimary>
      ) : null}
    </div>
  )
}
