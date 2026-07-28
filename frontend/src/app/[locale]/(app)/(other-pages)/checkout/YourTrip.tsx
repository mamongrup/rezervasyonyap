'use client'

import DatesRangeInputPopover from '@/app/[locale]/(app)/(listings)/components/DatesRangeInputPopover'
import GuestsInputPopover from '@/app/[locale]/(app)/(listings)/components/GuestsInputPopover'
import { checkoutT, formatCheckoutDate } from '@/lib/checkout-i18n'
import { DEFAULT_GUESTS_STAY, formatStayGuestSummary, mergeGuestDefaults } from '@/lib/guest-search-defaults'
import { syncChildAges } from '@/lib/hotel-child-policy'
import { getMessages } from '@/utils/getT'
import { GuestsObject } from '@/type'
import converSelectedDateToString from '@/utils/converSelectedDateToString'
import { PencilEdit02Icon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { appendCheckoutGuestParams, checkoutDateYmd, parseCheckoutTripDate } from '@/lib/stay-checkout-url'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'

const CHECKOUT_DATE_PANEL =
  'absolute start-0 top-full z-[100] mt-3 w-[min(100vw-2rem,42rem)] transition duration-150 data-closed:translate-y-1 data-closed:opacity-0'

function tripDateFromSearchParams(sp: URLSearchParams): { start: Date | null; end: Date | null } {
  const checkIn = sp.get('checkIn')
  const checkOut = sp.get('checkOut')
  if (checkIn && checkOut) {
    return {
      start: parseCheckoutTripDate(checkIn),
      end: parseCheckoutTripDate(checkOut),
    }
  }
  return {
    start: parseCheckoutTripDate(sp.get('startDate')),
    end: parseCheckoutTripDate(sp.get('endDate')),
  }
}

function parseGuestInt(sp: URLSearchParams, ...keys: string[]): number | undefined {
  for (const key of keys) {
    const raw = sp.get(key)
    if (raw == null || raw === '') continue
    const n = Number.parseInt(raw, 10)
    if (!Number.isNaN(n) && n >= 0) return n
  }
  return undefined
}

function parseChildAges(sp: URLSearchParams, guestChildren: number): number[] | undefined {
  const raw = sp.get('childAges')?.trim()
  if (!raw) return guestChildren > 0 ? syncChildAges({ guestChildren }) : undefined
  const ages = raw
    .split(',')
    .map((s) => Number.parseInt(s.trim(), 10))
    .filter((n) => Number.isFinite(n) && n >= 0 && n <= 17)
  return syncChildAges({ guestChildren, childAges: ages })
}

function guestsFromSearchParams(sp: URLSearchParams): GuestsObject {
  const guestChildren = parseGuestInt(sp, 'children', 'guestChildren') ?? 0
  return mergeGuestDefaults({
    guestAdults: parseGuestInt(sp, 'adults', 'guestAdults', 'guests'),
    guestChildren,
    guestInfants: parseGuestInt(sp, 'infants', 'guestInfants'),
    childAges: parseChildAges(sp, guestChildren),
  })
}

type Props = {
  locale: string
  onGuestsChange?: (guests: GuestsObject) => void
}

const YourTrip = ({ locale, onGuestsChange }: Props) => {
  const C = checkoutT(locale)
  const H = getMessages(locale).HeroSearchForm
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [startDate, setStartDate] = useState<Date | null>(() => tripDateFromSearchParams(searchParams).start)
  const [endDate, setEndDate] = useState<Date | null>(() => tripDateFromSearchParams(searchParams).end)
  const [guests, setGuests] = useState<GuestsObject>(() => guestsFromSearchParams(searchParams))

  const isHotelCheckout =
    Boolean(searchParams.get('hotelRoomId')?.trim()) ||
    searchParams.get('askChildAges') === '1' ||
    searchParams.get('category') === 'hotel'
  const adultsOnly =
    searchParams.get('adultsOnly') === '1' || searchParams.get('adultsOnly') === 'true'
  const freeChildMaxAgeRaw = searchParams.get('freeChildMaxAge')
  const freeChildMaxAge =
    freeChildMaxAgeRaw == null || freeChildMaxAgeRaw === ''
      ? 6
      : Number.isFinite(Number(freeChildMaxAgeRaw))
        ? Number(freeChildMaxAgeRaw)
        : 6

  useEffect(() => {
    const { start, end } = tripDateFromSearchParams(searchParams)
    if (start) setStartDate(start)
    if (end) setEndDate(end)
    setGuests(guestsFromSearchParams(searchParams))
  }, [searchParams])

  useEffect(() => {
    onGuestsChange?.(guests)
  }, [guests, onGuestsChange])

  const guestSummary = useMemo(() => formatStayGuestSummary(locale, guests), [locale, guests])

  const checkInYmd = searchParams.get('checkIn')?.trim() || (startDate ? checkoutDateYmd(startDate) : '')
  const checkOutYmd = searchParams.get('checkOut')?.trim() || (endDate ? checkoutDateYmd(endDate) : '')

  const tripDateLabel =
    checkInYmd && checkOutYmd
      ? `${formatCheckoutDate(locale, checkInYmd)} – ${formatCheckoutDate(locale, checkOutYmd)}`
      : startDate != null
        ? converSelectedDateToString([startDate, endDate])
        : C.addDates

  const tripHeadingDates =
    checkInYmd && checkOutYmd
      ? `${formatCheckoutDate(locale, checkInYmd)} – ${formatCheckoutDate(locale, checkOutYmd)}`
      : null

  const checkoutTriggerClass =
    'flex w-full flex-1 justify-between gap-x-5 p-5 hover:bg-neutral-50 focus-visible:outline-hidden dark:hover:bg-neutral-800'

  const replaceGuestParams = (next: GuestsObject) => {
    setGuests(next)
    const params = new URLSearchParams(searchParams.toString())
    appendCheckoutGuestParams(params, next)
    const qs = params.toString()
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
  }

  return (
    <div>
      <h3 className="text-2xl font-semibold">{C.yourTrip}</h3>
      {tripHeadingDates ? (
        <p className="mt-1.5 text-sm font-medium text-neutral-700 dark:text-neutral-200">
          {tripHeadingDates}
        </p>
      ) : null}
      <div className="relative z-10 mt-6 flex flex-col divide-y divide-neutral-200 overflow-visible rounded-3xl border border-neutral-200 sm:flex-row sm:divide-x sm:divide-y-0 sm:rtl:divide-x-reverse dark:divide-neutral-700 dark:border-neutral-700">
        <DatesRangeInputPopover
          className="relative flex min-w-0 flex-1"
          locale={locale}
          rangeStart={startDate}
          rangeEnd={endDate}
          onRangeChange={([start, end]) => {
            setStartDate(start)
            setEndDate(end)
            const params = new URLSearchParams(searchParams.toString())
            if (start) {
              params.set('startDate', checkoutDateYmd(start))
              params.set('checkIn', checkoutDateYmd(start))
            } else {
              params.delete('startDate')
              params.delete('checkIn')
            }
            if (end) {
              params.set('endDate', checkoutDateYmd(end))
              params.set('checkOut', checkoutDateYmd(end))
            } else {
              params.delete('endDate')
              params.delete('checkOut')
            }
            const qs = params.toString()
            router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
          }}
          panelClassName={CHECKOUT_DATE_PANEL}
          renderTrigger={() => (
            <span className={checkoutTriggerClass}>
              <span className="flex flex-col">
                <span className="text-sm text-neutral-400">{H['Date range']}</span>
                <span className="mt-1.5 text-lg font-semibold">{tripDateLabel}</span>
              </span>
              <HugeiconsIcon
                icon={PencilEdit02Icon}
                className="h-6 w-6 shrink-0 text-neutral-600 dark:text-neutral-400"
                strokeWidth={1.75}
              />
            </span>
          )}
        />

        <GuestsInputPopover
          className="relative flex min-w-0 flex-1"
          locale={locale}
          value={guests}
          onChange={replaceGuestParams}
          guestDefaults={DEFAULT_GUESTS_STAY}
          adultsOnly={adultsOnly}
          askChildAges={isHotelCheckout && !adultsOnly}
          freeChildMaxAge={adultsOnly ? null : freeChildMaxAge}
          renderTrigger={() => (
            <span className={checkoutTriggerClass}>
              <span className="flex flex-col">
                <span className="text-sm text-neutral-400">{H.Guests}</span>
                <span className="mt-1.5 line-clamp-1 text-lg font-semibold">{guestSummary}</span>
              </span>
              <HugeiconsIcon
                icon={PencilEdit02Icon}
                className="h-6 w-6 shrink-0 text-neutral-600 dark:text-neutral-400"
                strokeWidth={1.75}
              />
            </span>
          )}
        />
      </div>

      <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-400">{C.tripHint}</p>

      <input type="hidden" name="guestAdults" value={guests.guestAdults} />
      <input type="hidden" name="guestChildren" value={guests.guestChildren} />
      <input type="hidden" name="guestInfants" value={guests.guestInfants} />
      <input type="hidden" name="childAges" value={(guests.childAges ?? []).join(',')} />
    </div>
  )
}

export default YourTrip
