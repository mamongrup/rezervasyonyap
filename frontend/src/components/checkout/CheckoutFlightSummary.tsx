'use client'

import { airlineLogoUrl, resolveAirlineIataCode } from '@/lib/flight-display-assets'
import { findAirportByCode } from '@/lib/flight-airports'
import { checkoutT, fmtCheckout, formatCheckoutMoney } from '@/lib/checkout-i18n'
import {
  formatFlightNumberDisplay,
  formatTurnaClock,
  formatTurnaDateLabel,
  offerDurationLabelTurna,
} from '@/lib/turna-flight-offers'
import type { FlightCheckoutSnapshot } from '@/lib/turna-flight-booking'
import { DescriptionDetails, DescriptionList, DescriptionTerm } from '@/shared/description-list'
import { Divider } from '@/shared/divider'
import { AirplaneTakeOffIcon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import clsx from 'clsx'
import Image from 'next/image'

const LOGO_PX = 56

type Props = {
  locale: string
  offer: FlightCheckoutSnapshot
  departureDate: string
  currencyCode: string
  totalPrice: number
  passengers?: { adults: number; children: number; infants: number }
  className?: string
}

export default function CheckoutFlightSummary({
  locale,
  offer,
  departureDate,
  currencyCode,
  totalPrice,
  passengers,
  className,
}: Props) {
  const C = checkoutT(locale)
  const iata = resolveAirlineIataCode(offer)
  const logo = airlineLogoUrl(iata)
  const duration = offerDurationLabelTurna({ durationMinutes: offer.durationMinutes ?? null }, locale)
  const depClock = formatTurnaClock(offer.departureTime)
  const arrClock = formatTurnaClock(offer.arrivalTime)
  const depDate = formatTurnaDateLabel(offer.departureTime ?? departureDate, locale)

  const fromCity =
    offer.originCity || findAirportByCode(offer.origin)?.city || findAirportByCode(offer.origin)?.label || ''
  const toCity =
    offer.destinationCity ||
    findAirportByCode(offer.destination)?.city ||
    findAirportByCode(offer.destination)?.label ||
    ''

  const stopLabel =
    offer.stopCount === 0 ? C.flightDirect : fmtCheckout(C.flightStopsLabel, { n: offer.stopCount })

  const paxCount =
    (passengers?.adults ?? 0) + (passengers?.children ?? 0) + (passengers?.infants ?? 0) || 1

  const metaParts: string[] = []
  if (offer.cabinClass) metaParts.push(offer.cabinClass)
  const metaLine = metaParts.join(' · ')

  const flightNo = formatFlightNumberDisplay(iata, offer.flightNumber)
  const baggageLines: string[] = []
  if (offer.handBaggageKg) {
    baggageLines.push(fmtCheckout(C.flightBaggageCabinLine, { kg: offer.handBaggageKg }))
  }
  if (offer.checkedBaggageKg) {
    baggageLines.push(fmtCheckout(C.flightBaggageCheckedLine, { kg: offer.checkedBaggageKg }))
  }
  if (baggageLines.length === 0 && offer.baggageLabel?.trim()) {
    baggageLines.push(offer.baggageLabel.trim())
  }

  return (
    <div className={clsx('listingSection__wrap sm:shadow-xl', className)}>
      <div className="flex flex-col items-center gap-2 rounded-2xl border border-neutral-100 bg-white px-4 py-5 dark:border-neutral-800 dark:bg-neutral-900">
        {logo ? (
          <div className="flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white ring-1 ring-neutral-200 dark:ring-neutral-700">
            <Image
              src={logo}
              alt={offer.airlineName || iata}
              width={LOGO_PX}
              height={LOGO_PX}
              className="size-full object-cover"
              sizes="56px"
            />
          </div>
        ) : (
          <div className="flex size-14 items-center justify-center rounded-full bg-neutral-100 ring-1 ring-neutral-200 dark:bg-neutral-800 dark:ring-neutral-700">
            <HugeiconsIcon icon={AirplaneTakeOffIcon} className="size-6 text-neutral-400" strokeWidth={1.5} />
          </div>
        )}
        {offer.airlineName ? (
          <p className="text-center text-sm font-semibold text-neutral-800 dark:text-neutral-200">
            {offer.airlineName}
          </p>
        ) : null}
        {metaLine ? (
          <p className="text-center text-xs text-neutral-500 dark:text-neutral-400">{metaLine}</p>
        ) : null}
      </div>

      <div className="space-y-1">
        {depDate ? (
          <p className="text-sm text-neutral-500 dark:text-neutral-400">{depDate}</p>
        ) : null}
        <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
          {fromCity && toCity ? `${fromCity} → ${toCity}` : `${offer.origin} → ${offer.destination}`}
        </h3>
      </div>

      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 rounded-2xl border border-neutral-200 bg-neutral-50/60 px-3 py-3 dark:border-neutral-700 dark:bg-neutral-900/40">
        <div>
          <p className="text-lg font-bold tabular-nums text-neutral-900 dark:text-neutral-100">{depClock}</p>
          <p className="text-xs font-medium text-neutral-500">{offer.origin}</p>
        </div>
        <div className="min-w-[4.5rem] text-center">
          {duration ? <p className="text-[10px] font-medium text-neutral-500">{duration}</p> : null}
          <div className="my-0.5 flex items-center gap-0.5">
            <span className="h-px flex-1 bg-neutral-300 dark:bg-neutral-600" />
            <HugeiconsIcon icon={AirplaneTakeOffIcon} className="size-3 text-neutral-400" strokeWidth={1.75} />
            <span className="h-px flex-1 bg-neutral-300 dark:bg-neutral-600" />
          </div>
          <p className="text-[10px] text-neutral-500">{stopLabel}</p>
        </div>
        <div className="text-end">
          <p className="text-lg font-bold tabular-nums text-neutral-900 dark:text-neutral-100">
            {arrClock}
            {offer.arrivesNextDay ? (
              <sup className="ms-0.5 text-[10px] font-semibold text-primary-600">+1</sup>
            ) : null}
          </p>
          <p className="text-xs font-medium text-neutral-500">{offer.destination}</p>
        </div>
      </div>

      <Divider />

      <div className="space-y-3 rounded-2xl bg-neutral-50 p-4 dark:bg-neutral-800/50">
        <DescriptionList>
          <DescriptionTerm className="text-sm text-neutral-600 dark:text-neutral-400">
            {fmtCheckout(C.flightFareLine, { n: paxCount })}
          </DescriptionTerm>
          <DescriptionDetails className="text-sm text-neutral-800 sm:text-right dark:text-neutral-200">
            {formatCheckoutMoney(locale, totalPrice, currencyCode)}
          </DescriptionDetails>
        </DescriptionList>

        {flightNo || baggageLines.length > 0 ? (
          <>
            <Divider />
            <DescriptionList>
              {flightNo ? (
                <>
                  <DescriptionTerm className="text-sm text-neutral-600 dark:text-neutral-400">
                    {C.flightNoShortLabel}
                  </DescriptionTerm>
                  <DescriptionDetails className="text-sm font-medium text-neutral-800 sm:text-right dark:text-neutral-200">
                    {flightNo}
                  </DescriptionDetails>
                </>
              ) : null}
              {baggageLines.length > 0 ? (
                <>
                  <DescriptionTerm className="text-sm text-neutral-600 dark:text-neutral-400">
                    {C.flightBaggageShortLabel}
                  </DescriptionTerm>
                  <DescriptionDetails className="text-sm text-neutral-800 sm:text-right dark:text-neutral-200">
                    <span className="block space-y-0.5">
                      {baggageLines.map((line) => (
                        <span key={line} className="block">
                          {line}
                        </span>
                      ))}
                    </span>
                  </DescriptionDetails>
                </>
              ) : null}
            </DescriptionList>
          </>
        ) : null}

        <Divider />

        <DescriptionList>
          <DescriptionTerm className="font-semibold text-neutral-900 dark:text-white">{C.total}</DescriptionTerm>
          <DescriptionDetails className="font-semibold text-neutral-900 sm:text-right dark:text-white">
            {formatCheckoutMoney(locale, totalPrice, currencyCode)}
          </DescriptionDetails>
        </DescriptionList>

        <p className="text-xs text-neutral-500 dark:text-neutral-400">{C.flightTaxesIncluded}</p>
      </div>
    </div>
  )
}
