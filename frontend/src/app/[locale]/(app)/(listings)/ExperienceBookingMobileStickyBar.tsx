'use client'

import { useConvertedListingPrice, useFormatMoneyInPreferredCurrency } from '@/contexts/preferred-currency-context'
import {
  DEFAULT_CRUISE_CABIN_CAPACITY,
  requiredAccommodationUnits,
} from '@/lib/accommodation-units'
import { cabinDisplayPrice } from '@/lib/cruise-meta'
import { DEFAULT_GUESTS_EXPERIENCE, totalGuestCount } from '@/lib/guest-search-defaults'
import { formatTourPeriodDateRange, isTourPeriodBookable } from '@/lib/tour-periods'
import ButtonPrimary from '@/shared/ButtonPrimary'
import { getMessages } from '@/utils/getT'
import { interpolate } from '@/utils/interpolate'
import clsx from 'clsx'
import { useCruiseCabinSelection } from './CruiseCabinContext'
import { useTourPeriodSelection } from './TourPeriodContext'

type Props = {
  locale: string
  variant: 'tour' | 'cruise'
  fallbackPrice?: string
  fallbackPriceAmount?: number
  fallbackPriceCurrency?: string
  reservationAnchorId: string
}

export default function ExperienceBookingMobileStickyBar({
  locale,
  variant,
  fallbackPrice,
  fallbackPriceAmount,
  fallbackPriceCurrency,
  reservationAnchorId,
}: Props) {
  const m = getMessages(locale)
  const td = m.listing.tourDetail
  const cd = m.listing.cruiseDetail
  const { selected } = useTourPeriodSelection()
  const cabinCtx = useCruiseCabinSelection()

  const bookable = isTourPeriodBookable(selected)
  const hasCabins = variant === 'cruise' && Boolean(cabinCtx?.cabins.length)
  const cabinChosen = !hasCabins || Boolean(cabinCtx?.selectedCabin)
  const guestCount = Math.max(1, totalGuestCount(DEFAULT_GUESTS_EXPERIENCE))
  const cabinCount =
    variant === 'cruise' && cabinChosen && hasCabins
      ? requiredAccommodationUnits(guestCount, DEFAULT_CRUISE_CABIN_CAPACITY)
      : 1

  const fallbackAmount =
    fallbackPriceAmount != null && Number.isFinite(fallbackPriceAmount) && fallbackPriceAmount > 0
      ? fallbackPriceAmount
      : null
  const cabinAmount = cabinCtx?.selectedCabin
    ? (cabinDisplayPrice(cabinCtx.selectedCabin)?.amount ?? null)
    : null
  const personPrice = cabinAmount ?? selected?.price ?? fallbackAmount
  const cabinCurrency = cabinCtx?.selectedCabin
    ? cabinDisplayPrice(cabinCtx.selectedCabin)?.currency
    : undefined
  const periodCurrency = (cabinCurrency || selected?.currencyCode || fallbackPriceCurrency || 'TRY')
    .trim()
    .toUpperCase()

  const convertedFallback = useConvertedListingPrice(
    fallbackPrice,
    fallbackPriceAmount,
    fallbackPriceCurrency,
  )
  const convertedPeriodPrice = useFormatMoneyInPreferredCurrency(personPrice, periodCurrency)
  const displayPrice =
    variant === 'cruise' && cabinChosen && personPrice != null
      ? convertedPeriodPrice
      : bookable && personPrice != null
        ? convertedPeriodPrice
        : convertedFallback !== '—'
          ? convertedFallback
          : '—'

  const priceSuffix = bookable && (variant !== 'cruise' || cabinChosen) ? td.pricePerPerson : ''

  const periodLabel =
    selected?.startDate && selected?.endDate
      ? formatTourPeriodDateRange(selected.startDate, selected.endDate)
      : selected?.monthLabel?.trim() || ''

  const subline =
    variant === 'cruise' && cabinCount > 1
      ? interpolate(cd.autoCabinCountNote, {
          cabins: String(cabinCount),
          guests: String(guestCount),
        })
      : periodLabel || td.periodSelectHint

  function scrollToForm() {
    document.getElementById(reservationAnchorId)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
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
          <p className="truncate text-xl font-bold tabular-nums tracking-tight text-neutral-900 dark:text-white">
            {displayPrice}
            {priceSuffix ? (
              <span className="ml-1 text-xs font-medium text-neutral-500 dark:text-neutral-400">
                {priceSuffix}
              </span>
            ) : null}
          </p>
          <p className="mt-1 truncate text-[11px] text-neutral-500 dark:text-neutral-400">{subline}</p>
        </div>
        <ButtonPrimary
          type="button"
          className="shrink-0 rounded-2xl px-5! py-2.5! text-sm font-semibold shadow-lg shadow-neutral-900/15"
          onClick={scrollToForm}
        >
          {m.common.Reserve}
        </ButtonPrimary>
      </div>
    </div>
  )
}
