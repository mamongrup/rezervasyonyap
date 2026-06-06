'use client'

import ButtonPrimary from '@/shared/ButtonPrimary'
import {
  formatTourPeriodPrice,
  isTourPeriodBookable,
} from '@/lib/tour-periods'
import { getMessages } from '@/utils/getT'
import Form from 'next/form'
import { DEFAULT_GUESTS_EXPERIENCE } from '@/lib/guest-search-defaults'
import GuestsInputPopover from './components/GuestsInputPopover'
import TourPeriodSelect from './components/TourPeriodSelect'
import { useTourPeriodSelection } from './TourPeriodContext'

export default function TourBookingSidebar({
  action,
  fallbackPrice,
  locale = 'tr',
}: {
  action: (formData: FormData) => Promise<void>
  fallbackPrice?: string
  locale?: string
}) {
  const { options, selected, setSelected } = useTourPeriodSelection()
  const m = getMessages(locale)
  const td = m.listing.tourDetail

  const bookable = isTourPeriodBookable(selected)
  const displayPrice =
    selected?.price != null
      ? formatTourPeriodPrice(selected.price, selected.currencyCode)
      : bookable
        ? fallbackPrice ?? '—'
        : '—'

  return (
    <div className="listingSection__wrap sm:shadow-xl">
      <div>
        <span className="text-3xl font-semibold">
          {bookable ? displayPrice : '—'}
          <span className="ml-1 text-base font-normal text-neutral-500 dark:text-neutral-400">
            {bookable ? td.pricePerPerson : ''}
          </span>
        </span>
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
        <GuestsInputPopover className="flex-1" guestDefaults={DEFAULT_GUESTS_EXPERIENCE} />
      </Form>

      {bookable ? (
        <ButtonPrimary form="booking-form" type="submit">
          {m.common.Reserve}
        </ButtonPrimary>
      ) : (
        <ButtonPrimary type="button" disabled className="cursor-not-allowed opacity-60">
          {td.salesClosed}
        </ButtonPrimary>
      )}
    </div>
  )
}
