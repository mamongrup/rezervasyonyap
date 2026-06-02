'use client'

import StartRating from '@/components/StartRating'
import ButtonPrimary from '@/shared/ButtonPrimary'
import T from '@/utils/getT'
import {
  formatTourPeriodPrice,
  type TourPeriodOption,
} from '@/lib/tour-periods'
import Form from 'next/form'
import { useState } from 'react'
import GuestsInputPopover from './components/GuestsInputPopover'
import TourPeriodSelect from './components/TourPeriodSelect'

export default function TourBookingSidebar({
  action,
  periods,
  plannedDepartureCount = 0,
  fallbackPrice,
  reviewStart,
  reviewCount,
}: {
  action: (formData: FormData) => Promise<void>
  periods: TourPeriodOption[]
  plannedDepartureCount?: number
  fallbackPrice?: string
  reviewStart: number
  reviewCount: number
}) {
  const [selected, setSelected] = useState<TourPeriodOption | null>(periods[0] ?? null)

  const displayPrice =
    selected?.price != null
      ? formatTourPeriodPrice(selected.price, selected.currencyCode)
      : fallbackPrice ?? '—'

  const showPeriodMismatchNote =
    plannedDepartureCount > periods.length && periods.length > 0 && plannedDepartureCount > 1

  return (
    <div className="listingSection__wrap sm:shadow-xl">
      <div className="flex justify-between">
        <span className="text-3xl font-semibold">
          {displayPrice}
          <span className="ml-1 text-base font-normal text-neutral-500 dark:text-neutral-400">/kişi</span>
        </span>
        <StartRating size="lg" point={reviewStart} reviewCount={reviewCount} />
      </div>

      <Form
        action={action}
        className="flex flex-col rounded-3xl border border-neutral-200 dark:border-neutral-700"
        id="booking-form"
      >
        <TourPeriodSelect className="z-11 flex-1" periods={periods} onChange={setSelected} />
        {showPeriodMismatchNote ? (
          <p className="border-b border-neutral-200 px-4 py-3 text-xs leading-relaxed text-neutral-500 dark:border-neutral-700 dark:text-neutral-400">
            Programda {plannedDepartureCount} kalkış tarihi listelenir; şu an{' '}
            {periods.length === 1 ? 'yalnızca 1 dönem' : `${periods.length} dönem`} online
            rezervasyona açık (Wtatil satış takvimi). Diğer tarihler için{' '}
            <a href="#tour-section-flights" className="underline">
              planlanan kalkışlar
            </a>
            .
          </p>
        ) : null}
        <div className="w-full border-b border-neutral-200 dark:border-neutral-700" />
        <GuestsInputPopover className="flex-1" />
      </Form>

      <ButtonPrimary form="booking-form" type="submit">
        {T['common']['Reserve']}
      </ButtonPrimary>
    </div>
  )
}
