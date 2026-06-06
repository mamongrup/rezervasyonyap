'use client'

import { checkoutT, formatCheckoutDate } from '@/lib/checkout-i18n'
import type { Yolcu360CarCheckoutSnapshot } from '@/lib/yolcu360-car-booking'
import { getMessages } from '@/utils/getT'
import { PencilEdit02Icon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import Link from 'next/link'

type Props = {
  locale: string
  car: Yolcu360CarCheckoutSnapshot
  backHref: string
}

const tripCellClass =
  'flex w-full flex-1 justify-between gap-x-5 p-5 sm:flex-col sm:justify-start'

export default function CheckoutCarTrip({ locale, car, backHref }: Props) {
  const C = checkoutT(locale)
  const H = getMessages(locale).HeroSearchForm
  const pickupDate = formatCheckoutDate(locale, car.checkin)
  const returnDate = formatCheckoutDate(locale, car.checkout)

  return (
    <div>
      <h3 className="text-2xl font-semibold">{C.yourTrip}</h3>
      <p className="mt-1.5 text-sm font-medium text-neutral-700 dark:text-neutral-200">
        {car.title}
      </p>
      <div className="relative z-10 mt-6 flex flex-col divide-y divide-neutral-200 overflow-hidden rounded-3xl border border-neutral-200 sm:flex-row sm:divide-x sm:divide-y-0 sm:rtl:divide-x-reverse dark:divide-neutral-700 dark:border-neutral-700">
        <div className={tripCellClass}>
          <span className="flex min-w-0 flex-col">
            <span className="text-sm text-neutral-400">{H['Pick up location']}</span>
            <span className="mt-1.5 text-lg font-semibold text-neutral-900 dark:text-neutral-100">
              {car.pickup}
            </span>
            <span className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">{pickupDate}</span>
          </span>
        </div>
        <div className={tripCellClass}>
          <span className="flex min-w-0 flex-col">
            <span className="text-sm text-neutral-400">{H['Drop off location']}</span>
            <span className="mt-1.5 text-lg font-semibold text-neutral-900 dark:text-neutral-100">
              {car.dropoff || car.pickup}
            </span>
            <span className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">{returnDate}</span>
          </span>
        </div>
      </div>
      <Link
        href={backHref}
        className="mt-5 inline-flex items-center gap-2 text-sm text-link-muted-underline"
      >
        <HugeiconsIcon icon={PencilEdit02Icon} size={16} color="currentColor" strokeWidth={1.5} />
        {C.carTripHint}
      </Link>
    </div>
  )
}
