'use client'

import { airlineLogoUrl } from '@/lib/flight-display-assets'
import { findAirportByCode } from '@/lib/flight-airports'
import {
  formatTurnaClock,
  formatTurnaDateLabel,
  offerDurationLabelTurna,
  type TurnaFlightOffer,
} from '@/lib/turna-flight-offers'
import { formatMoneyIntl } from '@/lib/parse-listing-price'
import { Disclosure, DisclosureButton, DisclosurePanel } from '@headlessui/react'
import {
  AirplaneTakeOffIcon,
  ArrowDown01Icon,
  Luggage01Icon,
} from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import T from '@/utils/getT'
import Image from 'next/image'
import { FC, type ReactNode } from 'react'

const LOGO_PX = 28

type TurnaFlightCardProps = {
  offer: TurnaFlightOffer
  locale?: string
  priceLabel?: string
  action?: ReactNode
  booking?: boolean
}

function cabinClassLabel(raw: string, locale: string): string {
  const c = raw.trim().toLowerCase()
  if (locale === 'tr') {
    if (c.includes('business')) return 'Business'
    if (c.includes('first')) return 'First'
    if (c.includes('premium')) return 'Premium Ekonomi'
    return 'Ekonomi'
  }
  if (c.includes('business')) return 'Business'
  if (c.includes('first')) return 'First'
  if (c.includes('premium')) return 'Premium Economy'
  return 'Economy'
}

function airportLine(code: string, city: string, label: string): string {
  const c = city.trim()
  const name = label.trim() || findAirportByCode(code)?.label || code
  if (c && c !== name) return `${name} (${code}), ${c}`
  return code ? `${name} (${code})` : name
}

const TurnaFlightCard: FC<TurnaFlightCardProps> = ({
  offer,
  locale = 'tr',
  priceLabel,
  action,
  booking = false,
}) => {
  const m = T.flightLiveSearch ?? {}
  const card = T.flightCard

  const logo = airlineLogoUrl(offer.airlineCode)
  const duration = offerDurationLabelTurna(offer, locale)
  const depClock = formatTurnaClock(offer.departureTime)
  const arrClock = formatTurnaClock(offer.arrivalTime)
  const depDate = formatTurnaDateLabel(offer.departureTime, locale)
  const arrDate = formatTurnaDateLabel(offer.arrivalTime, locale)

  const fromCity =
    offer.originCity || findAirportByCode(offer.origin)?.city || findAirportByCode(offer.origin)?.label || ''
  const toCity =
    offer.destinationCity ||
    findAirportByCode(offer.destination)?.city ||
    findAirportByCode(offer.destination)?.label ||
    ''

  const fromLine = airportLine(offer.origin, fromCity, offer.originAirportLabel)
  const toLine = airportLine(offer.destination, toCity, offer.destinationAirportLabel)

  const stopLabel =
    offer.stopCount === 0
      ? (m.directFlight ?? card.nonStop)
      : offer.stopCount === 1
        ? card.stop
        : card.stops.replace('{n}', String(offer.stopCount))

  const price =
    priceLabel ??
    (offer.price != null ? formatMoneyIntl(offer.price, offer.currency || 'TRY') : undefined)

  const cabin = cabinClassLabel(offer.cabinClass, locale)
  const baggage = offer.baggageLabel?.trim()

  return (
    <Disclosure
      as="div"
      className="overflow-hidden rounded-2xl border border-neutral-100 bg-white shadow-sm transition-shadow hover:shadow-md dark:border-neutral-800 dark:bg-neutral-900"
    >
      <div className="flex flex-col md:flex-row">
        <div className="min-w-0 flex-1 border-b border-neutral-100 md:border-b-0 md:border-e dark:border-neutral-800">
          <DisclosureButton className="w-full px-4 py-4 text-start sm:px-5 sm:py-5">
            {/* Havayolu */}
            <div className="mb-4 flex items-center gap-2.5">
              {logo ? (
                <div className="flex size-7 shrink-0 items-center justify-center overflow-hidden rounded-full ring-1 ring-neutral-100 dark:ring-neutral-700">
                  <Image
                    src={logo}
                    alt={offer.airlineName}
                    width={LOGO_PX}
                    height={LOGO_PX}
                    className="size-full object-cover"
                    sizes="28px"
                  />
                </div>
              ) : (
                <div className="size-7 shrink-0 rounded-full bg-neutral-200 dark:bg-neutral-700" />
              )}
              <span className="text-sm font-medium text-neutral-800 dark:text-neutral-200">
                {offer.airlineName}
              </span>
            </div>

            {/* Turna zaman çizgisi */}
            <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 sm:gap-6">
              <div>
                <p className="text-xl font-bold tabular-nums text-neutral-900 dark:text-white">{depClock}</p>
                <p className="mt-0.5 text-sm font-medium text-neutral-500">{offer.origin}</p>
              </div>

              <div className="min-w-[7rem] text-center">
                {duration ? (
                  <p className="text-xs font-medium text-neutral-600 dark:text-neutral-400">{duration}</p>
                ) : null}
                <div className="my-1.5 flex items-center gap-1">
                  <span className="h-px flex-1 bg-neutral-300 dark:bg-neutral-600" />
                  <HugeiconsIcon
                    icon={AirplaneTakeOffIcon}
                    className="size-3.5 shrink-0 text-neutral-400"
                    strokeWidth={1.75}
                  />
                  <span className="h-px flex-1 bg-neutral-300 dark:bg-neutral-600" />
                </div>
                <p className="text-xs text-neutral-500">{stopLabel}</p>
              </div>

              <div className="text-end">
                <p className="text-xl font-bold tabular-nums text-neutral-900 dark:text-white">
                  {arrClock}
                  {offer.arrivesNextDay ? (
                    <sup className="ms-0.5 text-xs font-semibold text-primary-600">+1</sup>
                  ) : null}
                </p>
                <p className="mt-0.5 text-sm font-medium text-neutral-500">{offer.destination}</p>
              </div>
            </div>

            {/* Bagaj özeti + genişlet */}
            {(baggage || offer.flightNumber) && (
              <div className="mt-4 flex items-center gap-2 text-xs text-neutral-500">
                <HugeiconsIcon icon={ArrowDown01Icon} className="size-3.5 shrink-0" strokeWidth={2} />
                {baggage ? (
                  <span className="inline-flex items-center gap-1">
                    <HugeiconsIcon icon={Luggage01Icon} className="size-3.5" strokeWidth={1.75} />
                    {baggage}
                  </span>
                ) : null}
                {!baggage && offer.flightNumber ? <span>{offer.flightNumber}</span> : null}
              </div>
            )}
          </DisclosureButton>
        </div>

        {/* Fiyat + seç */}
        <div className="flex shrink-0 flex-row items-center justify-between gap-3 px-4 py-4 sm:w-44 sm:flex-col sm:items-stretch sm:justify-center sm:px-5 sm:py-5 md:w-48">
          {price ? (
            <p className="text-xl font-bold tabular-nums text-secondary-600 sm:text-2xl">{price}</p>
          ) : (
            <p className="text-sm text-neutral-400">—</p>
          )}
          <p className="hidden text-xs text-neutral-500 sm:block">{card.includesTaxes}</p>
          {action ? (
            <div
              className="shrink-0"
              onClick={(e) => e.stopPropagation()}
              onKeyDown={(e) => e.stopPropagation()}
            >
              {action}
            </div>
          ) : null}
        </div>
      </div>

      {/* Gidiş detayı — Turna genişletilmiş panel */}
      <DisclosurePanel className="border-t border-neutral-100 bg-neutral-50 px-4 py-4 sm:px-5 dark:border-neutral-800 dark:bg-neutral-950/40">
        <p className="mb-4 text-sm font-semibold text-neutral-800 dark:text-neutral-200">
          {m.outbound ?? 'Gidiş'}
        </p>

        <div className="flex gap-4">
          <div className="flex shrink-0 flex-col items-center py-1">
            <span className="size-2.5 rounded-full border-2 border-neutral-400 bg-white dark:bg-neutral-900" />
            <span className="my-1 w-px grow bg-neutral-300 dark:bg-neutral-600" />
            <span className="size-2.5 rounded-full border-2 border-neutral-400 bg-white dark:bg-neutral-900" />
          </div>

          <div className="min-w-0 flex-1 space-y-6">
            <div>
              <p className="text-lg font-bold tabular-nums text-neutral-900 dark:text-white">{depClock}</p>
              {depDate ? <p className="text-sm text-neutral-500">{depDate}</p> : null}
              <p className="mt-1 text-sm font-medium text-neutral-800 dark:text-neutral-200">{fromLine}</p>
            </div>

            <div className="flex items-center gap-2 text-sm text-neutral-600 dark:text-neutral-400">
              {logo ? (
                <Image
                  src={logo}
                  alt=""
                  width={20}
                  height={20}
                  className="size-5 rounded-full object-cover"
                  sizes="20px"
                />
              ) : null}
              <span>
                {duration ? `${duration} · ` : ''}
                {offer.airlineName}
                {cabin ? ` · ${cabin}` : ''}
                {offer.flightNumber ? ` · ${offer.flightNumber}` : ''}
              </span>
            </div>

            <div>
              <p className="text-lg font-bold tabular-nums text-neutral-900 dark:text-white">
                {arrClock}
                {offer.arrivesNextDay ? (
                  <sup className="ms-0.5 text-xs font-semibold text-primary-600">+1</sup>
                ) : null}
              </p>
              {arrDate ? <p className="text-sm text-neutral-500">{arrDate}</p> : null}
              <p className="mt-1 text-sm font-medium text-neutral-800 dark:text-neutral-200">{toLine}</p>
            </div>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-neutral-200 pt-4 text-sm dark:border-neutral-700">
          {offer.arrivesNextDay ? (
            <span className="rounded-full bg-primary-50 px-2.5 py-1 text-xs font-medium text-primary-700 dark:bg-primary-950/50 dark:text-primary-300">
              {m.arrivesNextDay ?? 'Ertesi gün varış'}
            </span>
          ) : null}
          <span className="text-neutral-600 dark:text-neutral-400">
            {m.classLabel ?? 'Sınıf'}: {cabin}
          </span>
          {offer.flightNumber ? (
            <span className="text-neutral-600 dark:text-neutral-400">
              {m.flightNo ?? 'Uçuş No'}: {offer.flightNumber}
            </span>
          ) : null}
          {baggage ? (
            <span className="inline-flex items-center gap-1 text-neutral-600 dark:text-neutral-400">
              <HugeiconsIcon icon={Luggage01Icon} className="size-4" strokeWidth={1.75} />
              {m.baggage ?? 'Bagaj'}: {baggage}
            </span>
          ) : null}
        </div>

        {booking ? (
          <p className="mt-3 text-xs text-neutral-500">{m.configuring ?? 'Fiyat kontrol ediliyor…'}</p>
        ) : null}
      </DisclosurePanel>
    </Disclosure>
  )
}

export default TurnaFlightCard
