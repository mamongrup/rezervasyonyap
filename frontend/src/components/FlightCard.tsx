'use client'

import { TFlightListing } from '@/data/listings'
import { ButtonCircle } from '@/shared/Button'
import { Disclosure, DisclosureButton, DisclosurePanel } from '@headlessui/react'
import { ArrowRight02Icon, ArrowUpRight01Icon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import T from '@/utils/getT'
import Image from 'next/image'
import { FC, type ReactNode } from 'react'

type FlightCardMessages = typeof T.flightCard

interface FlightCardProps {
  className?: string
  data: TFlightListing
  msgs?: FlightCardMessages
  /** Canlı arama: detay oku yerine seç / devam */
  action?: ReactNode
  hideDetailLink?: boolean
  hideExpandedPanel?: boolean
}

function formatListingTime(value: unknown): string {
  if (value == null) return '--:--'
  const d = value instanceof Date ? value : new Date(value as string | number)
  return Number.isNaN(d.getTime())
    ? '--:--'
    : d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
}

function parseRoute(raw: string | undefined): [string, string] {
  if (!raw) return ['', '']
  const normalized = raw
    .replace(/\u2192/g, '→')
    .replace(/â†’/g, '→')
    .replace(/â€"/g, '—')
  const sep = normalized.includes('→')
    ? '→'
    : normalized.includes('—')
      ? '—'
      : normalized.includes('-')
        ? '-'
        : null
  if (!sep) return [normalized.trim(), '']
  const parts = normalized.split(sep)
  return [parts[0]?.trim() ?? '', parts[1]?.trim() ?? '']
}

const FlightCard: FC<FlightCardProps> = ({
  className = '',
  data,
  msgs,
  action,
  hideDetailLink = false,
  hideExpandedPanel = false,
}) => {
  const m = msgs ?? T.flightCard

  const {
    departure,
    arrival,
    airlines,
    duration,
    href,
    layover,
    name,
    price,
    stopAirport,
    stopNumber,
    arrivalTime,
    departureTime,
    address,
    title,
    handle,
  } = data

  const [fromParsed, toParsed] = parseRoute(address ?? title)
  const fromCode = departure?.trim() || fromParsed
  const toCode = arrival?.trim() || toParsed
  const routeLabel =
    name?.trim() || (fromCode && toCode ? `${fromCode} - ${toCode}` : fromCode || toCode || title || '')

  const airlinesSafe = airlines ?? { logo: '', name: '' }
  const logoSrc = airlinesSafe.logo?.trim() ?? ''
  const airlineName = airlinesSafe.name?.trim() ?? ''

  const hrefSafe =
    typeof href === 'string' && href.trim() !== ''
      ? href
      : handle
        ? `/ucak-ilan/${handle}`
        : '#'

  const departureTimeFormatted = formatListingTime(departureTime)
  const arrivalTimeFormatted = formatListingTime(arrivalTime)
  const stopCount = typeof stopNumber === 'number' ? stopNumber : 0

  const stopLabel =
    stopCount === 0
      ? m.nonStop
      : stopCount === 1
        ? m.stop
        : m.stops.replace('{n}', String(stopCount))

  const stopSubline = [duration, stopAirport || toCode].filter(Boolean).join(' · ')

  const renderFlightLeg = () => (
    <div className="flex flex-col md:flex-row">
      <div className="w-24 shrink-0 md:w-20 md:pt-7 lg:w-24">
        {logoSrc ? (
          <Image src={logoSrc} className="w-10" alt={airlineName} sizes="40px" width={40} height={40} />
        ) : (
          <div className="h-10 w-10 rounded bg-neutral-200 dark:bg-neutral-700" aria-hidden />
        )}
      </div>
      <div className="my-5 flex md:my-0">
        <div className="flex shrink-0 flex-col items-center py-2">
          <span className="block h-6 w-6 rounded-full border border-neutral-400" />
          <span className="my-1 block grow border-l border-dashed border-neutral-400" />
          <span className="block h-6 w-6 rounded-full border border-neutral-400" />
        </div>
        <div className="ms-4 space-y-10 text-sm">
          <div className="flex flex-col space-y-1">
            <span className="text-neutral-500 dark:text-neutral-400">
              {departureTime ? departureTimeFormatted : fromCode}
            </span>
            <span className="font-semibold">{fromCode || routeLabel}</span>
          </div>
          <div className="flex flex-col space-y-1">
            <span className="text-neutral-500 dark:text-neutral-400">
              {arrivalTime ? arrivalTimeFormatted : toCode}
            </span>
            <span className="font-semibold">{toCode || routeLabel}</span>
          </div>
        </div>
      </div>
      <div className="border-l border-neutral-200 md:mx-6 lg:mx-10 dark:border-neutral-700" />
      <ul className="space-y-1 text-sm text-neutral-500 md:space-y-2 dark:text-neutral-400">
        {duration ? <li>{duration}</li> : null}
        {airlineName ? <li>{airlineName}</li> : null}
        {routeLabel ? <li>{routeLabel}</li> : null}
      </ul>
    </div>
  )

  return (
    <Disclosure
      as={'div'}
      className={`relative space-y-6 rounded-2xl border border-neutral-100 bg-white p-4 transition-shadow hover:shadow-lg sm:p-6 dark:border-neutral-800 dark:bg-neutral-900 ${className}`}
    >
      <DisclosureButton as="div" tabIndex={0} className={`relative ${hideDetailLink && !action ? '' : 'sm:pe-20'}`}>
        {!hideDetailLink ? (
          <div className="absolute end-0 bottom-0 md:top-1/2 md:bottom-auto md:-translate-y-1/2">
            <ButtonCircle color="white" href={hrefSafe} aria-label={m.viewDetails}>
              <HugeiconsIcon
                icon={ArrowUpRight01Icon}
                size={20}
                color="currentColor"
                className="rtl:rotate-270"
                strokeWidth={1.5}
              />
            </ButtonCircle>
          </div>
        ) : null}

        <div className="flex flex-col gap-y-6 sm:gap-y-0 md:flex-row md:items-center">
          <div className="w-24 shrink-0 lg:w-32">
            {logoSrc ? (
              <Image src={logoSrc} width={40} height={40} className="w-10" alt={airlineName} sizes="40px" />
            ) : (
              <div className="h-10 w-10 rounded bg-neutral-200 dark:bg-neutral-700" aria-hidden />
            )}
          </div>

          <div className="block space-y-1 lg:hidden">
            <div className="flex font-semibold">
              <div>
                <span>{departureTimeFormatted}</span>
                <span className="mt-0.5 flex items-center text-sm font-normal text-neutral-500">{airlineName}</span>
              </div>
              <span className="flex w-12 justify-center">
                <HugeiconsIcon icon={ArrowRight02Icon} className="mt-0.5 size-4" strokeWidth={1.75} />
              </span>
              <div>
                <span>{arrivalTimeFormatted}</span>
                <span className="mt-0.5 flex items-center text-sm font-normal text-neutral-500">{toCode}</span>
              </div>
            </div>
            <div className="mt-0.5 text-sm font-normal text-neutral-500">
              <span>{stopLabel}</span>
              {duration ? (
                <>
                  <span className="mx-2">·</span>
                  <span>{duration}</span>
                </>
              ) : null}
            </div>
            {price ? <p className="pt-1 text-lg font-semibold text-secondary-600">{price}</p> : null}
          </div>

          <div className="hidden min-w-[150px] flex-4 lg:block">
            <div className="text-lg font-medium">
              {departureTime ? `${departureTimeFormatted} - ${arrivalTimeFormatted}` : routeLabel}
            </div>
            <div className="mt-0.5 text-sm font-normal text-neutral-500">{airlineName}</div>
          </div>

          <div className="hidden flex-4 whitespace-nowrap lg:block">
            <div className="text-lg font-medium">{routeLabel}</div>
            {duration ? <div className="mt-0.5 text-sm font-normal text-neutral-500">{duration}</div> : null}
          </div>

          <div className="hidden flex-4 whitespace-nowrap lg:block">
            <div className="text-lg font-medium">{stopLabel}</div>
            {stopSubline ? <div className="mt-0.5 text-sm font-normal text-neutral-500">{stopSubline}</div> : null}
          </div>

          <div className="ms-auto flex shrink-0 flex-col gap-2 sm:min-w-[9.5rem] sm:text-right">
            {price ? (
              <p className="text-lg font-semibold tabular-nums text-secondary-600">{price}</p>
            ) : null}
            <div className="text-xs font-normal text-neutral-500 lg:text-sm">{m.includesTaxes}</div>
            {action ? <div className="sm:flex sm:justify-end">{action}</div> : null}
          </div>
        </div>
      </DisclosureButton>

      {!hideExpandedPanel && (layover || stopAirport || (fromCode && toCode)) ? (
        <DisclosurePanel className="rounded-2xl border border-neutral-200 p-4 md:p-8 dark:border-neutral-700">
          {renderFlightLeg()}
          {layover || stopAirport ? (
            <div className="my-7 space-y-5 md:my-10 md:ps-24">
              <div className="border-t border-neutral-200 dark:border-neutral-700" />
              <div className="text-sm text-neutral-700 md:text-base dark:text-neutral-300">
                {m.transitTime}: {layover ?? ''}
                {stopAirport ? ` - ${stopAirport}` : ''}
              </div>
              <div className="border-t border-neutral-200 dark:border-neutral-700" />
            </div>
          ) : null}
          {stopCount > 0 ? renderFlightLeg() : null}
        </DisclosurePanel>
      ) : null}
    </Disclosure>
  )
}

export default FlightCard
