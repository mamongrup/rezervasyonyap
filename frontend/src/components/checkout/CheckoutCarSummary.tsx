'use client'

import { checkoutT, fmtCheckout, formatCheckoutDate, formatCheckoutMoney } from '@/lib/checkout-i18n'
import { yolcu360CarRentalDays, type Yolcu360CarCheckoutSnapshot } from '@/lib/yolcu360-car-booking'
import { getMessages } from '@/utils/getT'
import { DescriptionDetails, DescriptionList, DescriptionTerm } from '@/shared/description-list'
import { Divider } from '@/shared/divider'
import clsx from 'clsx'
import Image from 'next/image'
import Link from 'next/link'

type Props = {
  locale: string
  car: Yolcu360CarCheckoutSnapshot
  currencyCode: string
  totalPrice: number
  couponCode?: string | null
  couponDiscount?: number
  backHref?: string
  className?: string
}

export default function CheckoutCarSummary({
  locale,
  car,
  currencyCode,
  totalPrice,
  couponCode,
  couponDiscount = 0,
  backHref,
  className,
}: Props) {
  const C = checkoutT(locale)
  const cd = getMessages(locale).listing.carDetail
  const days = yolcu360CarRentalDays(car.checkin, car.checkout)

  const meta: string[] = []
  if (car.seats) meta.push(fmtCheckout(cd.seats, { count: String(car.seats) }))
  if (car.gearshift) meta.push(car.gearshift)
  if (car.fuelType) meta.push(car.fuelType)
  if (car.vendorName) meta.push(car.vendorName)
  const metaLine = meta.join(' · ')

  const fareSubtotal = totalPrice + couponDiscount
  const dateLine =
    car.checkin && car.checkout
      ? `${formatCheckoutDate(locale, car.checkin)} — ${formatCheckoutDate(locale, car.checkout)}`
      : null

  return (
    <div className={clsx('space-y-5', className)}>
      <div
        className={clsx(
          'listingSection__wrap sm:shadow-xl',
          'rounded-3xl border border-neutral-200/90 bg-white p-5 ring-1 ring-black/5 dark:border-neutral-600 dark:bg-neutral-900 dark:ring-white/10 sm:p-6',
        )}
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
          <div className="w-full shrink-0 sm:w-36">
            {car.imageUrl ? (
              <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-neutral-100 dark:bg-neutral-800">
                <Image src={car.imageUrl} alt={car.title} fill className="object-cover" sizes="144px" />
              </div>
            ) : (
              <div className="flex aspect-[4/3] items-center justify-center rounded-2xl bg-neutral-100 dark:bg-neutral-800">
                <span className="text-xs text-neutral-400">{C.sectionCarTrip}</span>
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1 space-y-2">
            {car.pickup ? (
              <p className="text-sm text-neutral-500 dark:text-neutral-400">{car.pickup}</p>
            ) : null}
            <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">{car.title}</h3>
            {metaLine ? (
              <p className="text-sm text-neutral-600 dark:text-neutral-300">{metaLine}</p>
            ) : null}
          </div>
        </div>

        {dateLine ? (
          <p className="mt-4 text-sm text-neutral-600 dark:text-neutral-400">
            {dateLine}
            {days > 0 ? (
              <span className="text-neutral-500"> ({fmtCheckout(C.carDaysLine, { n: days })})</span>
            ) : null}
          </p>
        ) : null}

        <div className="mt-4 space-y-3 rounded-2xl bg-neutral-50 p-4 dark:bg-neutral-800/50">
          <DescriptionList>
            <DescriptionTerm className="text-sm text-neutral-600 dark:text-neutral-400">
              {C.carPickupLabel}
            </DescriptionTerm>
            <DescriptionDetails className="text-sm text-neutral-800 sm:text-right dark:text-neutral-200">
              {car.pickup}
            </DescriptionDetails>
            <DescriptionTerm className="text-sm text-neutral-600 dark:text-neutral-400">
              {C.carDropoffLabel}
            </DescriptionTerm>
            <DescriptionDetails className="text-sm text-neutral-800 sm:text-right dark:text-neutral-200">
              {car.dropoff || car.pickup}
            </DescriptionDetails>
            {days > 0 ? (
              <>
                <DescriptionTerm className="text-sm text-neutral-600 dark:text-neutral-400">
                  {C.carRentalDays}
                </DescriptionTerm>
                <DescriptionDetails className="text-sm text-neutral-800 sm:text-right dark:text-neutral-200">
                  {fmtCheckout(C.carDaysLine, { n: days })}
                </DescriptionDetails>
              </>
            ) : null}
            {couponDiscount > 0 ? (
              <>
                <DescriptionTerm className="text-sm text-neutral-600 dark:text-neutral-400">
                  {couponCode?.trim()
                    ? fmtCheckout(C.couponLine, { code: couponCode.trim() })
                    : C.couponLine.replace(/\(\{code\}\)/, '').trim()}
                </DescriptionTerm>
                <DescriptionDetails className="text-sm text-emerald-700 sm:text-right dark:text-emerald-300">
                  −{formatCheckoutMoney(locale, couponDiscount, currencyCode)}
                </DescriptionDetails>
              </>
            ) : null}
          </DescriptionList>
          <Divider />
          <DescriptionList>
            <DescriptionTerm className="font-semibold text-neutral-900 dark:text-white">{C.total}</DescriptionTerm>
            <DescriptionDetails className="font-semibold text-neutral-900 sm:text-right dark:text-white">
              {totalPrice > 0 ? formatCheckoutMoney(locale, totalPrice, currencyCode) : '—'}
            </DescriptionDetails>
          </DescriptionList>
        </div>

        <p className="mt-3 text-xs text-neutral-500 dark:text-neutral-400">{C.carTaxesNote}</p>

        {backHref ? (
          <Link href={backHref} className="mt-4 inline-flex text-sm text-link-muted-underline">
            {C.carBackToSearch} →
          </Link>
        ) : null}
      </div>
    </div>
  )
}
