'use client'

import { airlineLogoUrl, resolveAirlineIataCode } from '@/lib/flight-display-assets'
import { findAirportByCode } from '@/lib/flight-airports'
import { checkoutT, fmtCheckout, formatCheckoutDate, formatCheckoutMoney } from '@/lib/checkout-i18n'
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
import Link from 'next/link'

type Props = {
  locale: string
  offer: FlightCheckoutSnapshot
  departureDate: string
  currencyCode: string
  totalPrice: number
  passengers?: { adults: number; children: number; infants: number }
  couponCode?: string | null
  couponDiscount?: number
  backHref?: string
  className?: string
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

export default function CheckoutFlightSummary({
  locale,
  offer,
  departureDate,
  currencyCode,
  totalPrice,
  passengers,
  couponCode,
  couponDiscount = 0,
  backHref,
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

  const pax = {
    adults: passengers?.adults ?? 1,
    children: passengers?.children ?? 0,
    infants: passengers?.infants ?? 0,
  }
  const paxCount = pax.adults + pax.children + pax.infants || 1
  const guestLine = passengerSummary(locale, pax)

  const metaParts: string[] = []
  if (offer.cabinClass) metaParts.push(offer.cabinClass)
  const metaLine = metaParts.join(' · ')

  const flightNo = formatFlightNumberDisplay(iata, offer.flightNumber)
  const routeTitle =
    fromCity && toCity ? `${fromCity} → ${toCity}` : `${offer.origin} → ${offer.destination}`

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

  const fareSubtotal = totalPrice + couponDiscount

  return (
    <div className={clsx('space-y-5', className)}>
      <div
        className={clsx(
          'listingSection__wrap sm:shadow-xl',
          'rounded-3xl border border-neutral-200/90 bg-white p-5 ring-1 ring-black/5 dark:border-neutral-600 dark:bg-neutral-900 dark:ring-white/10 sm:p-6',
        )}
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
          <div className="w-full shrink-0 sm:w-36">
            <div className="relative flex aspect-[4/3] items-center justify-center overflow-hidden rounded-2xl bg-neutral-50 dark:bg-neutral-800">
              {logo ? (
                <Image
                  src={logo}
                  alt={offer.airlineName || iata}
                  width={72}
                  height={72}
                  className="size-[4.5rem] object-contain"
                  sizes="144px"
                />
              ) : (
                <HugeiconsIcon icon={AirplaneTakeOffIcon} className="size-10 text-neutral-400" strokeWidth={1.5} />
              )}
            </div>
          </div>
          <div className="min-w-0 flex-1 space-y-2">
            {offer.airlineName ? (
              <p className="text-sm text-neutral-500 dark:text-neutral-400">{offer.airlineName}</p>
            ) : null}
            <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">{routeTitle}</h3>
            {metaLine ? (
              <p className="text-sm text-neutral-600 dark:text-neutral-300">{metaLine}</p>
            ) : null}
          </div>
        </div>

        {depDate || departureDate ? (
          <p className="mt-4 text-sm text-neutral-600 dark:text-neutral-400">
            {depDate || formatCheckoutDate(locale, departureDate)}
            <span className="text-neutral-500"> · {guestLine}</span>
          </p>
        ) : null}

        <div className="mt-4 grid grid-cols-[1fr_auto_1fr] items-center gap-2 rounded-2xl border border-neutral-200 bg-neutral-50/80 px-3 py-3 dark:border-neutral-700 dark:bg-neutral-900/40">
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

        <div className="mt-4 space-y-3 rounded-2xl bg-neutral-50 p-4 dark:bg-neutral-800/50">
          <DescriptionList>
            <DescriptionTerm className="text-sm text-neutral-600 dark:text-neutral-400">
              {fmtCheckout(C.flightFareLine, { n: paxCount })}
            </DescriptionTerm>
            <DescriptionDetails className="text-sm text-neutral-800 sm:text-right dark:text-neutral-200">
              {fareSubtotal > 0 ? formatCheckoutMoney(locale, fareSubtotal, currencyCode) : '—'}
            </DescriptionDetails>
            {flightNo ? (
              <>
                <DescriptionTerm className="text-sm text-neutral-600 dark:text-neutral-400">
                  {C.flightNoShortLabel}
                </DescriptionTerm>
                <DescriptionDetails className="text-sm text-neutral-800 sm:text-right dark:text-neutral-200">
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
            {couponDiscount > 0 ? (
              <>
                <DescriptionTerm className="text-sm text-neutral-600 dark:text-neutral-400">
                  {couponCode?.trim()
                    ? fmtCheckout(C.couponLine, { code: couponCode.trim() })
                    : C.couponLine.replace(/\(\{code\}\)/, '').trim()}
                </DescriptionTerm>
                <DescriptionDetails className="text-sm text-emerald-700 sm:text-right dark:text-emerald-300">
                  −{formatCheckoutMoney(locale, couponDiscount, currencyCode)}
                </DescriptionDetails>
              </>
            ) : null}
          </DescriptionList>
          <Divider />
          <DescriptionList>
            <DescriptionTerm className="font-semibold text-neutral-900 dark:text-white">{C.total}</DescriptionTerm>
            <DescriptionDetails className="font-semibold text-neutral-900 sm:text-right dark:text-white">
              {totalPrice > 0 ? formatCheckoutMoney(locale, totalPrice, currencyCode) : '—'}
            </DescriptionDetails>
          </DescriptionList>
        </div>

        <p className="mt-3 text-xs text-neutral-500 dark:text-neutral-400">{C.flightTaxesIncluded}</p>

        {backHref ? (
          <Link href={backHref} className="mt-4 inline-flex text-sm text-link-muted-underline">
            {C.flightBackToSearch} →
          </Link>
        ) : null}
      </div>
    </div>
  )
}
