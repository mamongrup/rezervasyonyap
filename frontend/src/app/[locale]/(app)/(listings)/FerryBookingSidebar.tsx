'use client'

import ButtonPrimary from '@/shared/ButtonPrimary'
import { formatMoneyIntl } from '@/lib/parse-listing-price'
import type { FerryTicketFare } from '@/lib/travel-api'
import { getMessages } from '@/utils/getT'
import Form from 'next/form'
import { useMemo, useState } from 'react'
import { DEFAULT_GUESTS_EXPERIENCE } from '@/lib/guest-search-defaults'
import DatesRangeInputPopover from './components/DatesRangeInputPopover'
import GuestsInputPopover from './components/GuestsInputPopover'

export default function FerryBookingSidebar({
  fares,
  currencyCode,
  fallbackPrice,
  locale = 'tr',
  action,
}: {
  fares: FerryTicketFare[]
  currencyCode: string
  fallbackPrice?: string
  locale?: string
  action: (formData: FormData) => Promise<void>
}) {
  const fd = getMessages(locale).listing.ferryDetail
  const m = getMessages(locale)
  const ticketLabels = fd.ticketType as Record<string, string>

  const options = useMemo(
    () =>
      fares.map((fare) => ({
        id: fare.type,
        label: ticketLabels[fare.type] ?? fare.label_tr ?? fare.type,
        price: fare.official.adult,
      })),
    [fares, ticketLabels],
  )

  const [selectedType, setSelectedType] = useState(options[0]?.id ?? 'OW')
  const selected = options.find((o) => o.id === selectedType) ?? options[0]

  const displayPrice =
    selected != null
      ? formatMoneyIntl(selected.price, currencyCode)
      : fallbackPrice ?? '—'

  return (
    <div className="sticky top-5 listingSection__wrap sm:shadow-xl">
      <div>
        <span className="text-3xl font-semibold">
          {displayPrice}
          <span className="ml-1 text-base font-normal text-neutral-500 dark:text-neutral-400">
            {fd.pricePerPerson}
          </span>
        </span>
      </div>

      <Form
        action={action}
        className="mt-4 flex flex-col rounded-3xl border border-neutral-200 dark:border-neutral-700"
        id="booking-form"
      >
        {options.length > 1 ? (
          <>
            <label className="sr-only" htmlFor="ferry-ticket-type">
              {fd.selectTicketType}
            </label>
            <select
              id="ferry-ticket-type"
              name="ticket_type"
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="w-full border-0 bg-transparent px-4 py-4 text-sm font-medium focus:ring-0"
            >
              {options.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {opt.label}
                </option>
              ))}
            </select>
            <div className="w-full border-b border-neutral-200 dark:border-neutral-700" />
          </>
        ) : (
          <input type="hidden" name="ticket_type" value={selectedType} />
        )}

        <DatesRangeInputPopover locale={locale} />
        <div className="w-full border-b border-neutral-200 dark:border-neutral-700" />
        <GuestsInputPopover className="flex-1" guestDefaults={DEFAULT_GUESTS_EXPERIENCE} />
      </Form>

      <ButtonPrimary form="booking-form" type="submit" className="mt-4 w-full">
        {m.common.Reserve}
      </ButtonPrimary>
    </div>
  )
}
