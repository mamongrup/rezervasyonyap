'use client'

import {
  resolveYolcu360CheckoutListingId,
  snapshotFromYolcu360Listing,
  YOLCU360_CAR_BOOKING_KEY,
  type Yolcu360CarBookingDraft,
} from '@/lib/yolcu360-car-booking'
import type { Yolcu360Listing } from '@/lib/yolcu360-car-search'
import { getMessages } from '@/utils/getT'
import ButtonPrimary from '@/shared/ButtonPrimary'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

type Props = {
  locale: string
  car: Yolcu360Listing
  pickup: string
  dropoff: string
  checkin: string
  checkout: string
  carIndex?: number
  className?: string
}

export default function Yolcu360CarReserveButton({
  locale,
  car,
  pickup,
  dropoff,
  checkin,
  checkout,
  carIndex,
  className,
}: Props) {
  const router = useRouter()
  const y360 = getMessages(locale).listing.carDetail.yolcu360
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleReserve = async () => {
    setPending(true)
    setError(null)
    try {
      const listingId = await resolveYolcu360CheckoutListingId()
      if (!listingId) {
        setError(y360.checkoutListingMissing)
        return
      }

      const draft: Yolcu360CarBookingDraft = {
        listing_id: listingId,
        pickup,
        dropoff,
        checkin,
        checkout,
        car: snapshotFromYolcu360Listing(
          car,
          { pickup, dropoff, checkin, checkout },
          carIndex,
        ),
      }
      sessionStorage.setItem(YOLCU360_CAR_BOOKING_KEY, JSON.stringify(draft))

      const unitPrice =
        car.yolcu360TotalPrice && car.yolcu360TotalPrice > 0
          ? car.yolcu360TotalPrice
          : car.priceAmount ?? 0
      const qs = new URLSearchParams({
        car: '1',
        listingId,
        startDate: checkin.slice(0, 10),
        endDate: checkout.slice(0, 10),
        unitPrice: unitPrice > 0 ? unitPrice.toFixed(2) : '0',
        currency: car.priceCurrency ?? 'TRY',
      })
      router.push(`/${locale}/checkout?${qs.toString()}`)
    } catch {
      setError(y360.reserveFailed)
    } finally {
      setPending(false)
    }
  }

  return (
    <div className={className}>
      <ButtonPrimary type="button" className="w-full" disabled={pending} onClick={handleReserve}>
        {pending ? y360.reserving : y360.reserve}
      </ButtonPrimary>
      {error ? (
        <p role="alert" className="mt-3 text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      ) : null}
    </div>
  )
}
