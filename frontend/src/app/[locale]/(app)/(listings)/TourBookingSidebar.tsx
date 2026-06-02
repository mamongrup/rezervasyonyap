'use client'

import StartRating from '@/components/StartRating'
import ButtonPrimary from '@/shared/ButtonPrimary'
import T from '@/utils/getT'
import {
  formatTourPeriodPrice,
  isTourPeriodBookable,
} from '@/lib/tour-periods'
import Form from 'next/form'
import GuestsInputPopover from './components/GuestsInputPopover'
import TourPeriodSelect from './components/TourPeriodSelect'
import { useTourPeriodSelection } from './TourPeriodContext'

export default function TourBookingSidebar({
  action,
  fallbackPrice,
  reviewStart,
  reviewCount,
}: {
  action: (formData: FormData) => Promise<void>
  fallbackPrice?: string
  reviewStart: number
  reviewCount: number
}) {
  const { options, selected, setSelected } = useTourPeriodSelection()

  const bookable = isTourPeriodBookable(selected)
  const displayPrice =
    selected?.price != null
      ? formatTourPeriodPrice(selected.price, selected.currencyCode)
      : bookable
        ? fallbackPrice ?? '—'
        : '—'

  return (
    <div className="listingSection__wrap sm:shadow-xl">
      <div className="flex justify-between">
        <span className="text-3xl font-semibold">
          {bookable ? displayPrice : '—'}
          <span className="ml-1 text-base font-normal text-neutral-500 dark:text-neutral-400">
            {bookable ? '/kişi' : ''}
          </span>
        </span>
        <StartRating size="lg" point={reviewStart} reviewCount={reviewCount} />
      </div>

      <Form
        action={action}
        className="flex flex-col rounded-3xl border border-neutral-200 dark:border-neutral-700"
        id="booking-form"
      >
        <TourPeriodSelect
          className="z-11 flex-1"
          periods={options}
          selectedId={selected?.id}
          onChange={setSelected}
        />
        <div className="w-full border-b border-neutral-200 dark:border-neutral-700" />
        <GuestsInputPopover className="flex-1" />
      </Form>

      {bookable ? (
        <ButtonPrimary form="booking-form" type="submit">
          {T['common']['Reserve']}
        </ButtonPrimary>
      ) : (
        <ButtonPrimary type="button" disabled className="cursor-not-allowed opacity-60">
          Satışa kapalı
        </ButtonPrimary>
      )}
    </div>
  )
}
