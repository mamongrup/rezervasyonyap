'use client'

import { checkoutT, fmtCheckout, formatCheckoutDate } from '@/lib/checkout-i18n'
import { findAirportByCode } from '@/lib/flight-airports'
import type { FlightCheckoutSnapshot } from '@/lib/turna-flight-booking'
import { getMessages } from '@/utils/getT'
import { PencilEdit02Icon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import Link from 'next/link'

type Props = {
  locale: string
  offer: FlightCheckoutSnapshot
  departureDate: string
  passengers: { adults: number; children: number; infants: number }
  backHref: string
}

function passengerSummary(
  locale: string,
  p: { adults: number; children: number; infants: number },
): string {
  const C = checkoutT(locale)
  const parts: string[] = []
  if (p.adults > 0) parts.push(fmtCheckout(C.flightPassengerAdult, { n: p.adults }))
  if (p.children > 0) parts.push(fmtCheckout(C.flightPassengerChild, { n: p.children }))
  if (p.infants > 0) parts.push(fmtCheckout(C.flightPassengerInfant, { n: p.infants }))
  return parts.join(', ') || fmtCheckout(C.flightPassengerAdult, { n: 1 })
}

const tripCellClass =
  'flex w-full flex-1 justify-between gap-x-5 p-5 sm:flex-col sm:justify-start'

export default function CheckoutFlightTrip({
  locale,
  offer,
  departureDate,
  passengers,
  backHref,
}: Props) {
  const C = checkoutT(locale)
  const H = getMessages(locale).HeroSearchForm
  const dateLabel = formatCheckoutDate(locale, departureDate)
  const fromCity =
    offer.originCity || findAirportByCode(offer.origin)?.city || offer.origin
  const toCity =
    offer.destinationCity || findAirportByCode(offer.destination)?.city || offer.destination
  const routeLabel = `${fromCity} (${offer.origin}) → ${toCity} (${offer.destination})`
  const guestSummary = passengerSummary(locale, passengers)

  return (
    <div>
      <h3 className="text-2xl font-semibold">{C.yourTrip}</h3>
      {dateLabel ? (
        <p className="mt-1.5 text-sm font-medium text-neutral-700 dark:text-neutral-200">{dateLabel}</p>
      ) : null}
      <div className="relative z-10 mt-6 flex flex-col divide-y divide-neutral-200 overflow-hidden rounded-3xl border border-neutral-200 sm:flex-row sm:divide-x sm:divide-y-0 sm:rtl:divide-x-reverse dark:divide-neutral-700 dark:border-neutral-700">
        <div className={tripCellClass}>
          <span className="flex min-w-0 flex-col">
            <span className="text-sm text-neutral-400">{H['Date range']}</span>
            <span className="mt-1.5 text-lg font-semibold text-neutral-900 dark:text-neutral-100">
              {dateLabel}
            </span>
          </span>
        </div>

        <Link href={backHref} className={`${tripCellClass} hover:bg-neutral-50 dark:hover:bg-neutral-800`}>
          <span className="flex min-w-0 flex-col">
            <span className="text-sm text-neutral-400">{C.flightRoute}</span>
            <span className="mt-1.5 line-clamp-2 text-lg font-semibold text-neutral-900 dark:text-neutral-100">
              {routeLabel}
            </span>
          </span>
          <HugeiconsIcon
            icon={PencilEdit02Icon}
            className="h-6 w-6 shrink-0 text-neutral-600 dark:text-neutral-400"
            strokeWidth={1.75}
          />
        </Link>

        <div className={tripCellClass}>
          <span className="flex min-w-0 flex-col">
            <span className="text-sm text-neutral-400">{H.Guests}</span>
            <span className="mt-1.5 line-clamp-1 text-lg font-semibold text-neutral-900 dark:text-neutral-100">
              {guestSummary}
            </span>
          </span>
        </div>
      </div>

      <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-400">{C.flightTripHint}</p>
    </div>
  )
}
