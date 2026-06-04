'use client'

import { TFlightListing } from '@/data/listings'
import { ButtonCircle } from '@/shared/Button'
import { Disclosure, DisclosureButton, DisclosurePanel } from '@headlessui/react'
import { Airplane02Icon, ArrowRight02Icon, ArrowUpRight01Icon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import T from '@/utils/getT'
import Image from 'next/image'
import { FC } from 'react'

type FlightCardMessages = typeof T.flightCard

interface FlightCardProps {
  className?: string
  data: TFlightListing
  /** Locale-aware translations â€” passed from server page via getMessages(locale).flightCard */
  msgs?: FlightCardMessages
}

function formatListingTime(value: unknown): string {
  if (value == null) return '--:--'
  const d = value instanceof Date ? value : new Date(value as string | number)
  return Number.isNaN(d.getTime())
    ? '--:--'
    : d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
}

/** Parse "IST â†’ ESB" or "Istanbul â†’ Ankara" into [from, to] parts */
function parseRoute(raw: string | undefined): [string, string] {
  if (!raw) return ['', '']
  const sep = raw.includes('â†’') ? 'â†’' : raw.includes('â€”') ? 'â€”' : raw.includes('-') ? '-' : null
  if (!sep) return [raw.trim(), '']
  const parts = raw.split(sep)
  return [parts[0]?.trim() ?? '', parts[1]?.trim() ?? '']
}

const FlightCard: FC<FlightCardProps> = ({ className = '', data, msgs }) => {
  const m = msgs ?? T.flightCard

  const {
    departure,
    arrival,
    airlines,
    duration,
    href,
    id,
    layover,
    name,
    price,
    stopAirport,
    stopNumber,
    arrivalTime,
    departureTime,
    featuredImage,
    galleryImgs,
    address,
    title,
    handle,
  } = data

  // Resolve from/to: prefer explicit fields, fallback to parsing address (location_name) or title
  const [fromParsed, toParsed] = parseRoute(address ?? title)
  const fromCode = departure?.trim() || fromParsed
  const toCode = arrival?.trim() || toParsed

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

  const coverImage = featuredImage ?? galleryImgs?.[0]

  return (
    <Disclosure
      as={'div'}
      className={`relative overflow-hidden rounded-2xl border border-neutral-100 bg-white transition-shadow hover:shadow-lg dark:border-neutral-800 dark:bg-neutral-900 ${className}`}
    >
      {/* Cover image */}
      {coverImage ? (
        <div className="relative h-40 w-full overflow-hidden sm:h-48">
          <Image
            src={coverImage}
            alt={title ?? fromCode}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, 800px"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/10 to-black/40" />
          {/* Overlay route badge */}
          <div className="absolute bottom-3 start-4 flex items-center gap-2 text-white">
            <span className="rounded bg-black/40 px-2 py-0.5 text-sm font-semibold backdrop-blur-sm">
              {fromCode}
            </span>
            <HugeiconsIcon icon={ArrowRight02Icon} className="size-4" strokeWidth={2} />
            <span className="rounded bg-black/40 px-2 py-0.5 text-sm font-semibold backdrop-blur-sm">
              {toCode}
            </span>
          </div>
        </div>
      ) : (
        <div className="flex h-28 w-full items-center justify-center bg-gradient-to-r from-sky-50 to-blue-100 dark:from-sky-950 dark:to-blue-900">
          <HugeiconsIcon icon={Airplane02Icon} className="size-12 text-sky-300 dark:text-sky-600" strokeWidth={1} />
          {(fromCode || toCode) && (
            <div className="ms-4 flex items-center gap-2 text-sky-700 dark:text-sky-300">
              <span className="text-lg font-bold">{fromCode}</span>
              <HugeiconsIcon icon={ArrowRight02Icon} className="size-5" strokeWidth={2} />
              <span className="text-lg font-bold">{toCode}</span>
            </div>
          )}
        </div>
      )}

      {/* Card body */}
      <DisclosureButton as="div" tabIndex={0} className="relative p-4 sm:p-6 sm:pe-20">
        <div className="absolute end-4 top-4 sm:end-6 sm:top-1/2 sm:-translate-y-1/2">
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

        <div className="flex flex-col gap-y-4 md:flex-row md:items-center">
          {/* Airline logo */}
          <div className="w-20 shrink-0 lg:w-24">
            {logoSrc ? (
              <Image src={logoSrc} width={40} height={40} className="w-10" alt={airlineName} sizes="40px" />
            ) : (
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-sky-100 dark:bg-sky-900">
                <HugeiconsIcon icon={Airplane02Icon} className="size-5 text-sky-500" strokeWidth={1.5} />
              </div>
            )}
          </div>

          {/* Mobile: compact route */}
          <div className="block space-y-1 lg:hidden">
            <div className="flex font-semibold">
              <div>
                {departureTime ? (
                  <span>{departureTimeFormatted}</span>
                ) : (
                  <span>{fromCode || title}</span>
                )}
                {airlineName && (
                  <span className="mt-0.5 flex items-center text-sm font-normal text-neutral-500">
                    {airlineName}
                  </span>
                )}
              </div>
              {(departureTime || (fromCode && toCode)) && (
                <span className="flex w-12 justify-center">
                  <HugeiconsIcon icon={ArrowRight02Icon} className="mt-0.5 size-4" strokeWidth={1.75} />
                </span>
              )}
              {departureTime ? (
                <div>
                  <span>{arrivalTimeFormatted}</span>
                  {toCode && (
                    <span className="mt-0.5 flex items-center text-sm font-normal text-neutral-500">{toCode}</span>
                  )}
                </div>
              ) : toCode ? (
                <div>
                  <span>{toCode}</span>
                </div>
              ) : null}
            </div>
            <div className="mt-0.5 text-sm font-normal text-neutral-500">
              <span>{stopLabel}</span>
              {duration && <><span className="mx-2">Â·</span><span>{duration}</span></>}
            </div>
          </div>

          {/* Desktop: departure / arrival times + airline */}
          <div className="hidden min-w-[150px] flex-4 lg:block">
            <div className="text-lg font-medium">
              {departureTime ? `${departureTimeFormatted} - ${arrivalTimeFormatted}` : (name ?? title ?? '')}
            </div>
            <div className="mt-0.5 text-sm font-normal text-neutral-500">{airlineName}</div>
          </div>

          {/* Desktop: duration */}
          <div className="hidden flex-4 whitespace-nowrap lg:block">
            <div className="text-lg font-medium">{duration ?? (fromCode && toCode ? `${fromCode} â†’ ${toCode}` : '')}</div>
            {address && <div className="mt-0.5 text-sm font-normal text-neutral-500">{address}</div>}
          </div>

          {/* Desktop: stop info */}
          <div className="hidden flex-4 whitespace-nowrap lg:block">
            <div className="text-lg font-medium">{stopLabel}</div>
            {stopAirport && (
              <div className="mt-0.5 text-sm font-normal text-neutral-500">{stopAirport}</div>
            )}
          </div>

          {/* Price */}
          <div className="flex-4 whitespace-nowrap sm:text-right">
            {price && (
              <p className="text-lg font-semibold text-secondary-600">{price}</p>
            )}
            <div className="mt-0.5 text-xs font-normal text-neutral-500 lg:text-sm">
              {m.includesTaxes}
            </div>
          </div>
        </div>
      </DisclosureButton>

      {/* Expanded detail panel */}
      {(layover || stopAirport || (fromCode && toCode)) && (
        <DisclosurePanel className="border-t border-neutral-100 p-4 dark:border-neutral-800 md:p-6 md:ps-24">
          <div className="space-y-3 text-sm text-neutral-600 dark:text-neutral-400">
            {fromCode && toCode && (
              <div className="flex items-center gap-3">
                <span className="font-semibold uppercase text-neutral-800 dark:text-neutral-200">{fromCode}</span>
                <HugeiconsIcon icon={ArrowRight02Icon} className="size-4 shrink-0" strokeWidth={1.75} />
                <span className="font-semibold uppercase text-neutral-800 dark:text-neutral-200">{toCode}</span>
                {duration && <span className="text-neutral-500">Â· {duration}</span>}
              </div>
            )}
            {(layover || stopAirport) && (
              <div>
                <span className="font-medium">{m.transitTime}:</span>{' '}
                {layover ?? ''}{stopAirport ? ` Â· ${stopAirport}` : ''}
              </div>
            )}
          </div>
        </DisclosurePanel>
      )}
    </Disclosure>
  )
}

export default FlightCard

