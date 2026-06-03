'use client'

import ModalSelectDate from '@/components/ModalSelectDate'
import ModalSelectGuests from '@/components/ModalSelectGuests'
import { checkoutT, fmtCheckout } from '@/lib/checkout-i18n'
import { getMessages } from '@/utils/getT'
import { DEFAULT_GUESTS_STAY, totalGuestCount } from '@/lib/guest-search-defaults'
import { GuestsObject } from '@/type'
import converSelectedDateToString from '@/utils/converSelectedDateToString'
import { PencilEdit02Icon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'

function parseTripDate(s: string | null): Date | null {
  if (!s?.trim()) return null
  const d = new Date(s)
  return Number.isNaN(d.getTime()) ? null : d
}

type Props = {
  locale: string
}

const YourTrip = ({ locale }: Props) => {
  const C = checkoutT(locale)
  const H = getMessages(locale).HeroSearchForm
  const searchParams = useSearchParams()
  const [startDate, setStartDate] = useState<Date | null>(new Date('2025/02/06'))
  const [endDate, setEndDate] = useState<Date | null>(new Date('2025/02/23'))

  useEffect(() => {
    const st = parseTripDate(searchParams.get('startDate'))
    const en = parseTripDate(searchParams.get('endDate'))
    if (st && en) {
      setStartDate(st)
      setEndDate(en)
    }
  }, [searchParams])

  const [guests, setGuests] = useState<GuestsObject>({ ...DEFAULT_GUESTS_STAY })

  const guestCount = totalGuestCount(guests)

  return (
    <div>
      <h3 className="text-2xl font-semibold">{C.yourTrip}</h3>
      <div className="z-10 mt-6 flex flex-col divide-y divide-neutral-200 overflow-hidden rounded-3xl border border-neutral-200 sm:flex-row sm:divide-x sm:divide-y-0 sm:rtl:divide-x-reverse dark:divide-neutral-700 dark:border-neutral-700">
        <ModalSelectDate
          onChange={(dates) => {
            const [start, end] = dates
            setStartDate(start)
            setEndDate(end)
          }}
          triggerButton={({ openModal }) => (
            <button
              onClick={openModal}
              className="flex flex-1 justify-between gap-x-5 p-5 text-start hover:bg-neutral-50 focus-visible:outline-hidden dark:hover:bg-neutral-800"
              type="button"
            >
              <div className="flex flex-col">
                <span className="text-sm text-neutral-400">{H['Date range']}</span>
                <span className="mt-1.5 text-lg font-semibold">
                  {startDate ? converSelectedDateToString([startDate, endDate]) : C.addDates}
                </span>
              </div>
              <HugeiconsIcon
                icon={PencilEdit02Icon}
                className="h-6 w-6 text-neutral-600 dark:text-neutral-400"
                strokeWidth={1.75}
              />
            </button>
          )}
        />

        <ModalSelectGuests
          onChangeGuests={setGuests}
          triggerButton={({ openModal }) => (
            <button
              type="button"
              onClick={openModal}
              className="flex flex-1 justify-between gap-x-5 p-5 text-start hover:bg-neutral-50 focus-visible:outline-hidden dark:hover:bg-neutral-800"
            >
              <div className="flex flex-col">
                <span className="text-sm text-neutral-400">{H.Guests}</span>
                <span className="mt-1.5 text-lg font-semibold">
                  <span className="line-clamp-1">
                    {fmtCheckout(C.guestsSummary, {
                      guests: guestCount,
                      infants: guests.guestInfants || 0,
                    })}
                  </span>
                </span>
              </div>
              <HugeiconsIcon
                icon={PencilEdit02Icon}
                className="h-6 w-6 text-neutral-600 dark:text-neutral-400"
                strokeWidth={1.75}
              />
            </button>
          )}
        />
      </div>

      <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-400">{C.tripHint}</p>

      <input type="hidden" name="guestAdults" value={guests.guestAdults} />
      <input type="hidden" name="guestChildren" value={guests.guestChildren} />
      <input type="hidden" name="guestInfants" value={guests.guestInfants} />
      <input type="hidden" name="startDate" value={startDate ? startDate.toISOString() : ''} />
      <input type="hidden" name="endDate" value={endDate ? endDate.toISOString() : ''} />
    </div>
  )
}

export default YourTrip
