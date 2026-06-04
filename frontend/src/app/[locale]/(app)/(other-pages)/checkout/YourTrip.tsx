'use client'

import DatesRangeInputPopover from '@/app/[locale]/(app)/(listings)/components/DatesRangeInputPopover'
import GuestsInputPopover from '@/app/[locale]/(app)/(listings)/components/GuestsInputPopover'
import { checkoutT } from '@/lib/checkout-i18n'
import { DEFAULT_GUESTS_STAY, formatStayGuestSummary, mergeGuestDefaults } from '@/lib/guest-search-defaults'
import { getMessages } from '@/utils/getT'
import { GuestsObject } from '@/type'
import converSelectedDateToString from '@/utils/converSelectedDateToString'
import { PencilEdit02Icon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { useSearchParams } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'

const CHECKOUT_DATE_PANEL =
  'absolute start-0 top-full z-[100] mt-3 w-[min(100vw-2rem,42rem)] transition duration-150 data-closed:translate-y-1 data-closed:opacity-0'
function parseTripDate(s: string | null): Date | null {
  if (!s?.trim()) return null
  const d = new Date(s)
  return Number.isNaN(d.getTime()) ? null : d
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

function guestsFromSearchParams(sp: URLSearchParams): GuestsObject {
  return mergeGuestDefaults({
    guestAdults: parseGuestInt(sp, 'adults', 'guestAdults', 'guests'),
    guestChildren: parseGuestInt(sp, 'children', 'guestChildren'),
    guestInfants: parseGuestInt(sp, 'infants', 'guestInfants'),
  })
}

type Props = {
  locale: string
  onGuestsChange?: (guests: GuestsObject) => void
}

const YourTrip = ({ locale, onGuestsChange }: Props) => {
  const C = checkoutT(locale)
  const H = getMessages(locale).HeroSearchForm
  const searchParams = useSearchParams()
  const [startDate, setStartDate] = useState<Date | null>(() =>
    parseTripDate(searchParams.get('startDate')),
  )
  const [endDate, setEndDate] = useState<Date | null>(() =>
    parseTripDate(searchParams.get('endDate')),
  )
  const [guests, setGuests] = useState<GuestsObject>(() => guestsFromSearchParams(searchParams))

  useEffect(() => {
    const st = parseTripDate(searchParams.get('startDate'))
    const en = parseTripDate(searchParams.get('endDate'))
    if (st) setStartDate(st)
    if (en) setEndDate(en)
    setGuests(guestsFromSearchParams(searchParams))
  }, [searchParams])

  useEffect(() => {
    onGuestsChange?.(guests)
  }, [guests, onGuestsChange])

  const guestSummary = useMemo(() => formatStayGuestSummary(locale, guests), [locale, guests])

  const tripDateLabel =
    startDate != null ? converSelectedDateToString([startDate, endDate]) : C.addDates

  const checkoutTriggerClass =
    'flex w-full flex-1 justify-between gap-x-5 p-5 hover:bg-neutral-50 focus-visible:outline-hidden dark:hover:bg-neutral-800'

  return (
    <div>
      <h3 className="text-2xl font-semibold">{C.yourTrip}</h3>
      <div className="relative z-10 mt-6 flex flex-col divide-y divide-neutral-200 overflow-visible rounded-3xl border border-neutral-200 sm:flex-row sm:divide-x sm:divide-y-0 sm:rtl:divide-x-reverse dark:divide-neutral-700 dark:border-neutral-700">
        <DatesRangeInputPopover
          className="relative flex min-w-0 flex-1"
          locale={locale}
          rangeStart={startDate}
          rangeEnd={endDate}
          onRangeChange={([start, end]) => {
            setStartDate(start)
            setEndDate(end)
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
          onChange={setGuests}
          guestDefaults={DEFAULT_GUESTS_STAY}
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
    </div>
  )
}

export default YourTrip
