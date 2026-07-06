'use client'

import { useHotelRoomStayQuote } from '@/hooks/use-hotel-room-stay-quote'
import { useStayListingQuote } from '@/hooks/use-stay-listing-quote'
import {
  hotelRoomCapacityOrDefault,
  requiredAccommodationUnits,
} from '@/lib/accommodation-units'
import { DEFAULT_GUESTS_STAY, totalGuestCount } from '@/lib/guest-search-defaults'
import type { ListingPriceRuleRow, MealPlanItem } from '@/lib/travel-api'
import type { StayBookingRules } from '@/types/listing-types'
import ButtonPrimary from '@/shared/ButtonPrimary'
import { getMessages } from '@/utils/getT'
import { interpolate } from '@/utils/interpolate'
import clsx from 'clsx'
import { useOptionalHotelStayBooking } from './hotel-stay-booking-context'
import { useOptionalVillaStayBooking } from './villa-stay-booking-context'

export type StayListingMobileStickyBarProps = {
  locale: string
  listingId?: string
  mealPlans: MealPlanItem[]
  price: string
  priceAmount: number | undefined
  priceCurrency: string | undefined
  saleOff: string | null | undefined
  discountPercent: number | null | undefined
  poolHeating?: { dailyAmount: number; feeSummary: string; currencyCode: string } | null
  stayBookingRules?: StayBookingRules
  cleaningFeeAmount?: number
  damageDepositAmount?: number
  ruleFallbackNightly?: number
  ruleNightlyRange?: { min: number; max: number }
  priceRules?: ListingPriceRuleRow[]
  reservationAnchorId?: string
}

export default function StayListingMobileStickyBar({
  locale,
  listingId,
  mealPlans,
  price,
  priceAmount,
  priceCurrency,
  saleOff,
  discountPercent,
  poolHeating = null,
  stayBookingRules,
  cleaningFeeAmount,
  damageDepositAmount,
  ruleFallbackNightly,
  ruleNightlyRange,
  priceRules,
  reservationAnchorId = 'stay-reservation-card',
}: StayListingMobileStickyBarProps) {
  const messages = getMessages(locale)
  const hotelBooking = messages.listing.hotelBooking
  const villaCtx = useOptionalVillaStayBooking()
  const hotelCtx = useOptionalHotelStayBooking()

  const isHotelRoomBooking = Boolean(hotelCtx && hotelCtx.rooms.length > 0)
  const rangeStart = villaCtx?.rangeStart ?? hotelCtx?.rangeStart ?? null
  const rangeEnd = villaCtx?.rangeEnd ?? hotelCtx?.rangeEnd ?? null
  const poolHeatingSelected = villaCtx?.poolHeatingSelected ?? false

  const selectedRoom = hotelCtx?.selectedRoom ?? undefined
  const roomChosen = Boolean(hotelCtx?.selectedRoomId && selectedRoom)
  const guestCount = Math.max(1, totalGuestCount(hotelCtx?.guests ?? DEFAULT_GUESTS_STAY))
  const bookingUnitCount = selectedRoom
    ? requiredAccommodationUnits(guestCount, hotelRoomCapacityOrDefault(selectedRoom.capacity))
    : 1

  const hotelQuote = useHotelRoomStayQuote({
    listingId: listingId ?? '',
    selectedRoom: roomChosen ? selectedRoom : undefined,
    rangeStart: isHotelRoomBooking ? rangeStart : null,
    rangeEnd: isHotelRoomBooking ? rangeEnd : null,
    fallbackNightly: hotelCtx?.fallbackNightly ?? 0,
    mealPlans,
    selectedMealPlanId: hotelCtx?.selectedMealPlanId,
    activitySurchargesTotal: hotelCtx?.activitySurchargesTotal ?? 0,
    locale,
    bookingUnitCount: roomChosen ? bookingUnitCount : 1,
  })

  const villaQuote = useStayListingQuote({
    mealPlans,
    price,
    priceAmount,
    priceCurrency,
    saleOff,
    discountPercent,
    rangeStart: isHotelRoomBooking ? null : rangeStart,
    rangeEnd: isHotelRoomBooking ? null : rangeEnd,
    poolHeating,
    poolHeatingSelected,
    minShortStayNights: stayBookingRules?.minShortStayNights,
    shortStayFeeAmount: stayBookingRules?.shortStayFeeAmount,
    cleaningFeeAmount,
    damageDepositAmount,
    ruleFallbackNightly,
    ruleNightlyRange,
    listingId,
    priceRules,
  })

  const sidebar = messages.listing.sidebar
  const displayMainPrice = isHotelRoomBooking ? hotelQuote.displayMainPrice : villaQuote.displayMainPrice
  const grandTotal = isHotelRoomBooking ? hotelQuote.grandTotal : villaQuote.grandTotal
  const nights = isHotelRoomBooking ? hotelQuote.nights : villaQuote.nights
  const currencyCode = isHotelRoomBooking ? hotelQuote.currencyCode : villaQuote.currencyCode
  const formatConverted = isHotelRoomBooking ? hotelQuote.formatConverted : villaQuote.formatConverted

  const showDiscount =
    !isHotelRoomBooking &&
    villaQuote.showDiscountRow &&
    villaQuote.originalPriceNum != null &&
    Number.isFinite(villaQuote.originalPriceNum) &&
    villaQuote.originalPriceNum > villaQuote.basePriceNum

  const hasSelectedRange = rangeStart != null && rangeEnd != null
  const showStayTotal = isHotelRoomBooking
    ? hasSelectedRange && roomChosen && nights > 0 && grandTotal > 0
    : nights > 0 && grandTotal > 0

  const priceSuffix =
    isHotelRoomBooking && hasSelectedRange && roomChosen && nights > 0
      ? sidebar.total
      : sidebar.perNight

  const canCheckout =
    Boolean(listingId?.trim()) &&
    rangeStart != null &&
    rangeEnd != null &&
    grandTotal > 0 &&
    (!isHotelRoomBooking || roomChosen)

  const subline = isHotelRoomBooking
    ? !hasSelectedRange
      ? sidebar.reservationNoFeeNote
      : !roomChosen
        ? hotelBooking.selectRoomPrompt
        : bookingUnitCount > 1
          ? interpolate(hotelBooking.autoRoomCountNote, {
              rooms: String(bookingUnitCount),
              guests: String(guestCount),
            })
          : `${nights} ${sidebar.nightsWord}`
    : showStayTotal
      ? null
      : sidebar.reservationNoFeeNote

  function onReserve() {
    if (canCheckout && listingId && rangeStart && rangeEnd && villaCtx && !isHotelRoomBooking) {
      villaCtx.goCheckout({
        listingId,
        currencyCode,
        grandTotal,
        heatingSubtotal: villaQuote.heatingSubtotal,
      })
      return
    }
    if (villaCtx) {
      villaCtx.scrollToReservation()
      return
    }
    if (hotelCtx) {
      hotelCtx.scrollToReservation()
      return
    }
    document.getElementById(reservationAnchorId)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <div
      className={clsx(
        'fixed inset-x-0 z-40 border-t border-neutral-200/80 bg-white/95 px-4 py-3.5 shadow-[0_-12px_40px_rgba(15,23,42,0.12)] backdrop-blur-md lg:hidden dark:border-neutral-700/80 dark:bg-neutral-950/95',
        'bottom-above-mobile-nav',
      )}
    >
      <div className="mx-auto flex max-w-lg items-center gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-end gap-x-2 gap-y-1">
            {showDiscount ? (
              <div className="flex min-w-0 flex-col gap-0.5">
                {villaQuote.discountPct != null ? (
                  <span className="inline-flex w-fit items-center rounded-full bg-red-500 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white shadow-sm">
                    {sidebar.discountBadge.replace('{percent}', String(villaQuote.discountPct))}
                  </span>
                ) : null}
                <span className="text-xs font-medium tabular-nums leading-none line-through text-neutral-400 dark:text-neutral-500">
                  {formatConverted(villaQuote.originalPriceNum!, currencyCode)}
                </span>
              </div>
            ) : null}
            <div className="flex min-w-0 items-baseline gap-1.5">
              <p className="truncate text-xl font-bold tabular-nums tracking-tight text-neutral-900 dark:text-white">
                {displayMainPrice}
              </p>
              <span className="shrink-0 text-xs font-medium text-neutral-500 dark:text-neutral-400">
                {priceSuffix}
              </span>
            </div>
          </div>
          {showStayTotal ? (
            <p className="mt-1 text-xs font-medium text-primary-700 dark:text-primary-300">
              {nights} {sidebar.nightsWord} · {sidebar.total}{' '}
              <span className="font-semibold tabular-nums text-neutral-900 dark:text-white">
                {formatConverted(grandTotal, currencyCode)}
              </span>
            </p>
          ) : subline ? (
            <p className="mt-1 text-[11px] text-neutral-500 dark:text-neutral-400">{subline}</p>
          ) : null}
        </div>
        <ButtonPrimary
          type="button"
          className="shrink-0 rounded-2xl px-5! py-2.5! text-sm font-semibold shadow-lg shadow-neutral-900/15"
          onClick={onReserve}
        >
          {messages.common.Reserve}
        </ButtonPrimary>
      </div>
    </div>
  )
}
