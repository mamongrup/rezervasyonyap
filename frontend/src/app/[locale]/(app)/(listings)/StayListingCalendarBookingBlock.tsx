'use client'

import type { PoolHeatingOption } from '@/hooks/use-stay-listing-quote'
import type { ListingAvailabilityDay, ListingPriceRuleRow, MealPlanItem } from '@/lib/travel-api'
import type { StayBookingRules } from '@/types/listing-types'
import { useState } from 'react'
import SectionDateRange from './components/SectionDateRange'
import StayListingBookingQuoteModal from './StayListingBookingQuoteModal'
import { useOptionalVillaStayBooking } from './villa-stay-booking-context'

export default function StayListingCalendarBookingBlock({
  locale,
  listingId,
  initialDays,
  mealPlans,
  price,
  priceAmount,
  priceCurrency,
  saleOff,
  discountPercent,
  poolHeating,
  stayBookingRules,
  initialMonthsShown = 1,
  isStayRental = false,
  isHolidayHome = false,
  cleaningFeeAmount,
  damageDepositAmount,
  ruleFallbackNightly,
  ruleNightlyRange,
  priceRules,
}: {
  locale: string
  listingId: string
  initialDays: ListingAvailabilityDay[]
  /** Sunucu UA / Client Hints ile tahmin — takvim SSR’da doğru ay sayısı */
  initialMonthsShown?: 1 | 2
  stayBookingRules?: StayBookingRules
  mealPlans: MealPlanItem[]
  price: string
  priceAmount: number | undefined
  priceCurrency: string | undefined
  saleOff: string | null | undefined
  discountPercent: number | null | undefined
  poolHeating: PoolHeatingOption
  isStayRental?: boolean
  /** @deprecated `isStayRental` kullanın */
  isHolidayHome?: boolean
  cleaningFeeAmount?: number
  damageDepositAmount?: number
  ruleFallbackNightly?: number
  ruleNightlyRange?: { min: number; max: number }
  priceRules?: ListingPriceRuleRow[]
}) {
  const bookingCtx = useOptionalVillaStayBooking()
  const [modalOpen, setModalOpen] = useState(false)
  const [range, setRange] = useState<{ start: Date; end: Date } | null>(null)

  return (
    <>
      <SectionDateRange
        locale={locale}
        initialDays={initialDays}
        initialMonthsShown={initialMonthsShown}
        bookingRules={stayBookingRules}
        onCompleteRange={(start, end) => {
          bookingCtx?.setRange(start, end)
          setRange({ start, end })
          setModalOpen(true)
        }}
      />
      {range ? (
        <StayListingBookingQuoteModal
          locale={locale}
          listingId={listingId}
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          rangeStart={range.start}
          rangeEnd={range.end}
          mealPlans={mealPlans}
          price={price}
          priceAmount={priceAmount}
          priceCurrency={priceCurrency}
          saleOff={saleOff}
          discountPercent={discountPercent}
          poolHeating={poolHeating}
          stayBookingRules={stayBookingRules}
          isStayRental={isStayRental || isHolidayHome}
          isHolidayHome={isStayRental || isHolidayHome}
          cleaningFeeAmount={cleaningFeeAmount}
          damageDepositAmount={damageDepositAmount}
          ruleFallbackNightly={ruleFallbackNightly}
          ruleNightlyRange={ruleNightlyRange}
          priceRules={priceRules}
        />
      ) : null}
    </>
  )
}
