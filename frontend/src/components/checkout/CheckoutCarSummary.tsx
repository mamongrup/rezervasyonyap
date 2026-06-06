'use client'

import { checkoutT, fmtCheckout, formatCheckoutDate, formatCheckoutMoney } from '@/lib/checkout-i18n'
import { yolcu360CarRentalDays, type Yolcu360CarCheckoutSnapshot } from '@/lib/yolcu360-car-booking'
import { getMessages } from '@/utils/getT'
import { DescriptionDetails, DescriptionList, DescriptionTerm } from '@/shared/description-list'
import { Divider } from '@/shared/divider'
import Image from 'next/image'

type Props = {
  locale: string
  car: Yolcu360CarCheckoutSnapshot
  currencyCode: string
  totalPrice: number
  className?: string
}

export default function CheckoutCarSummary({
  locale,
  car,
  currencyCode,
  totalPrice,
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

  return (
    <div className={`listingSection__wrap sm:shadow-xl ${className ?? ''}`}>
      <h3 className="text-xl font-semibold">{C.sectionCarTrip}</h3>
      {car.imageUrl ? (
        <div className="relative mt-4 aspect-[4/3] overflow-hidden rounded-2xl bg-neutral-100 dark:bg-neutral-800">
          <Image src={car.imageUrl} alt={car.title} fill className="object-cover" sizes="320px" />
        </div>
      ) : null}
      <p className="mt-4 text-lg font-semibold text-neutral-900 dark:text-neutral-100">{car.title}</p>
      {meta.length ? (
        <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">{meta.join(' · ')}</p>
      ) : null}

      <Divider className="my-5" />

      <DescriptionList>
        <DescriptionTerm>{C.carPickupLabel}</DescriptionTerm>
        <DescriptionDetails>
          {car.pickup}
          <span className="block text-sm text-neutral-500 dark:text-neutral-400">
            {formatCheckoutDate(locale, car.checkin)}
          </span>
        </DescriptionDetails>
        <DescriptionTerm>{C.carDropoffLabel}</DescriptionTerm>
        <DescriptionDetails>
          {car.dropoff || car.pickup}
          <span className="block text-sm text-neutral-500 dark:text-neutral-400">
            {formatCheckoutDate(locale, car.checkout)}
          </span>
        </DescriptionDetails>
        {days > 0 ? (
          <>
            <DescriptionTerm>{C.carRentalDays}</DescriptionTerm>
            <DescriptionDetails>{fmtCheckout(C.carDaysLine, { n: days })}</DescriptionDetails>
          </>
        ) : null}
      </DescriptionList>

      <Divider className="my-5" />

      <div className="flex items-end justify-between gap-3">
        <span className="text-sm text-neutral-500 dark:text-neutral-400">{C.carPriceTotal}</span>
        <span className="text-2xl font-semibold text-neutral-900 dark:text-neutral-100">
          {formatCheckoutMoney(locale, totalPrice, currencyCode)}
        </span>
      </div>
      <p className="mt-2 text-xs text-neutral-500 dark:text-neutral-400">{C.carTaxesNote}</p>
    </div>
  )
}
