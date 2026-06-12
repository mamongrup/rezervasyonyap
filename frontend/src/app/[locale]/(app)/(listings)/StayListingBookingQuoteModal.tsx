'use client'

import { useHotelRoomStayQuote } from '@/hooks/use-hotel-room-stay-quote'
import { useStayListingQuote, type PoolHeatingOption } from '@/hooks/use-stay-listing-quote'
import { useVitrinHref } from '@/hooks/use-vitrin-href'
import { hotelActivityLocalizedTitle } from '@/lib/hotel-activity-pricing'
import type { HotelRoomBookingOption } from '@/lib/hotel-room-availability-public'
import { buildBoardTypeLabelsFromMessages, resolveHotelBoardTypeLabel } from '@/lib/hotel-room-board-type'
import { intlDateLocaleTag } from '@/lib/i18n-config'
import type { HotelListingActivity, MealPlanItem } from '@/lib/travel-api'
import type { StayBookingRules } from '@/types/listing-types'
import type { GuestsObject } from '@/type'
import ButtonPrimary from '@/shared/ButtonPrimary'
import ButtonClose from '@/shared/ButtonClose'
import { DescriptionDetails, DescriptionList, DescriptionTerm } from '@/shared/description-list'
import { Divider } from '@/shared/divider'
import { getMessages } from '@/utils/getT'
import { interpolate } from '@/utils/interpolate'
import { CloseButton, Dialog, DialogBackdrop, DialogPanel } from '@headlessui/react'
import { buildStayCheckoutUrl } from '@/lib/stay-checkout-url'
import { useRouter } from 'next/navigation'
import { Fragment, useMemo, useState } from 'react'
import { useOptionalHotelStayBooking } from './hotel-stay-booking-context'
import { useOptionalVillaStayBooking } from './villa-stay-booking-context'

type VillaQuoteProps = {
  isHotel?: false
  price: string
  priceAmount: number | undefined
  priceCurrency: string | undefined
  saleOff: string | null | undefined
  discountPercent: number | null | undefined
  poolHeating: PoolHeatingOption
  isHolidayHome?: boolean
  isStayRental?: boolean
  cleaningFeeAmount?: number
  damageDepositAmount?: number
  ruleFallbackNightly?: number
  ruleNightlyRange?: { min: number; max: number }
  hotelRoomId?: never
  hotelRoomName?: never
  hotelRoom?: never
  selectedMealPlanId?: never
  activitySurchargesTotal?: never
  activitySurchargeLines?: never
  guests?: never
}

type HotelQuoteProps = {
  isHotel: true
  hotelRoom: HotelRoomBookingOption
  selectedMealPlanId?: string
  activitySurchargesTotal?: number
  activitySurchargeLines?: Array<{ activity: HotelListingActivity; total: number }>
  guests?: GuestsObject
  price?: string
  priceAmount?: number | undefined
  priceCurrency?: string | undefined
  saleOff?: string | null | undefined
  discountPercent?: number | null | undefined
  poolHeating?: PoolHeatingOption
  isHolidayHome?: never
  cleaningFeeAmount?: never
  damageDepositAmount?: never
  ruleFallbackNightly?: never
  ruleNightlyRange?: never
}

type Props = {
  locale: string
  listingId: string
  open: boolean
  onClose: () => void
  rangeStart: Date
  rangeEnd: Date
  mealPlans: MealPlanItem[]
  stayBookingRules?: StayBookingRules
} & (VillaQuoteProps | HotelQuoteProps)

export default function StayListingBookingQuoteModal(props: Props) {
  const {
    locale,
    listingId,
    open,
    onClose,
    rangeStart,
    rangeEnd,
    mealPlans,
    stayBookingRules,
    isHotel = false,
  } = props

  const router = useRouter()
  const vitrinHref = useVitrinHref()
  const messages = getMessages(locale)
  const copy = messages.listing.availabilityCalendar
  const hotelBooking = messages.listing.hotelBooking
  const rangeLocale = intlDateLocaleTag(locale)
  const villaCtx = useOptionalVillaStayBooking()
  const [localPoolHeatingSelected, setLocalPoolHeatingSelected] = useState(false)
  const poolHeatingSelected = villaCtx?.poolHeatingSelected ?? localPoolHeatingSelected
  const setPoolHeatingSelected = villaCtx?.setPoolHeatingSelected ?? setLocalPoolHeatingSelected
  const bookingCtx = useOptionalHotelStayBooking()

  const villaProps = isHotel ? null : props
  const villaQuote = useStayListingQuote({
    mealPlans,
    price: villaProps?.price ?? '',
    priceAmount: villaProps?.priceAmount,
    priceCurrency: villaProps?.priceCurrency,
    saleOff: villaProps?.saleOff ?? null,
    discountPercent: villaProps?.discountPercent ?? null,
    rangeStart,
    rangeEnd,
    poolHeating: villaProps?.poolHeating ?? null,
    poolHeatingSelected,
    minShortStayNights: stayBookingRules?.minShortStayNights,
    shortStayFeeAmount: stayBookingRules?.shortStayFeeAmount,
    cleaningFeeAmount: villaProps?.cleaningFeeAmount,
    damageDepositAmount: villaProps?.damageDepositAmount,
    ruleFallbackNightly: villaProps?.ruleFallbackNightly,
    ruleNightlyRange: villaProps?.ruleNightlyRange,
  })

  const hotelRoom = isHotel ? props.hotelRoom : undefined
  const hotelQuote = useHotelRoomStayQuote({
    listingId,
    selectedRoom: hotelRoom,
    rangeStart,
    rangeEnd,
    fallbackNightly: bookingCtx?.fallbackNightly ?? 0,
    mealPlans,
    selectedMealPlanId: isHotel ? (props.selectedMealPlanId ?? bookingCtx?.selectedMealPlanId) : null,
    activitySurchargesTotal: isHotel
      ? (props.activitySurchargesTotal ?? bookingCtx?.activitySurchargesTotal ?? 0)
      : 0,
    locale,
  })

  const boardLabels = buildBoardTypeLabelsFromMessages(
    (messages.listing.roomShowcase ?? {}) as Record<string, string>,
  )
  const checkoutBoardLabel = useMemo(() => {
    if (!isHotel || !hotelRoom) return null
    return (
      hotelQuote.selectedPlanLabel ??
      resolveHotelBoardTypeLabel(hotelRoom.board_type, boardLabels)
    )
  }, [isHotel, hotelRoom, hotelQuote.selectedPlanLabel, boardLabels])

  const nights = isHotel ? hotelQuote.nights : villaQuote.nights
  const lodgingSubtotal = isHotel ? hotelQuote.lodgingSubtotal : villaQuote.lodgingSubtotal
  const grandTotal = isHotel ? hotelQuote.grandTotal : villaQuote.grandTotal
  const formatConverted = isHotel ? hotelQuote.formatConverted : villaQuote.formatConverted
  const currencyCode = isHotel ? hotelQuote.currencyCode : villaQuote.currencyCode
  const canProceed = isHotel
    ? hotelQuote.grandTotal > 0 && hotelQuote.available
    : villaQuote.grandTotal > 0

  const goCheckout = () => {
    if (!listingId.trim() || !canProceed) return
    if (isHotel && hotelRoom) {
      router.push(
        buildStayCheckoutUrl(vitrinHref('/checkout'), {
          listingId,
          startDate: rangeStart,
          endDate: rangeEnd,
          currencyCode,
          unitPrice: grandTotal,
          guests: props.guests ?? bookingCtx?.guests,
          hotelRoomId: hotelRoom.id,
          hotelRoomName: hotelRoom.name,
          hotelBoardLabel: checkoutBoardLabel ?? undefined,
          mealPlanId: props.selectedMealPlanId ?? bookingCtx?.selectedMealPlanId,
          mealPlanLabel: checkoutBoardLabel ?? undefined,
        }),
      )
    } else {
      router.push(
        buildStayCheckoutUrl(vitrinHref('/checkout'), {
          listingId,
          startDate: rangeStart,
          endDate: rangeEnd,
          currencyCode,
          unitPrice: grandTotal,
          guests: villaCtx?.guests,
          poolHeatingSelected,
          poolHeatingFee: villaQuote.heatingSubtotal,
        }),
      )
    }
    onClose()
  }

  const activityLines = isHotel
    ? (props.activitySurchargeLines ?? bookingCtx?.activitySurchargeLines ?? [])
    : []

  return (
    <Dialog open={open} onClose={onClose} className="relative z-[70]">
      <DialogBackdrop className="fixed inset-0 bg-black/40 backdrop-blur-sm" />
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <DialogPanel
          transition
          className="relative w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-2xl ring-1 ring-black/5 transition data-closed:scale-95 data-closed:opacity-0 dark:bg-neutral-900 dark:ring-white/10"
        >
          <div className="flex items-start justify-between gap-3 border-b border-neutral-200 px-5 py-4 dark:border-neutral-700">
            <h2 className="pe-8 text-lg font-semibold text-neutral-900 dark:text-white">{copy.bookingModalTitle}</h2>
            <CloseButton as={ButtonClose} className="shrink-0">
              <span className="sr-only">{copy.bookingModalClose}</span>
            </CloseButton>
          </div>
          <div className="max-h-[min(70vh,520px)] overflow-y-auto px-5 py-4">
            <p className="text-sm text-neutral-600 dark:text-neutral-400">
              {rangeStart.toLocaleDateString(rangeLocale, { dateStyle: 'medium' })} —{' '}
              {rangeEnd.toLocaleDateString(rangeLocale, { dateStyle: 'medium' })}{' '}
              <span className="text-neutral-500">
                ({nights} {messages.listing.sidebar.nightsWord})
              </span>
            </p>
            {isHotel && hotelRoom ? (
              <p className="mt-2 text-sm font-medium text-neutral-800 dark:text-neutral-200">{hotelRoom.name}</p>
            ) : null}

            {!isHotel && villaProps?.poolHeating ? (
              <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-2xl border border-neutral-200 p-3 dark:border-neutral-700">
                <input
                  type="checkbox"
                  checked={poolHeatingSelected}
                  onChange={(e) => setPoolHeatingSelected(e.target.checked)}
                  className="mt-1 h-4 w-4 shrink-0 rounded border-neutral-300 text-primary-600 dark:border-neutral-600"
                />
                <span className="min-w-0 text-sm">
                  <span className="font-medium text-neutral-900 dark:text-neutral-100">
                    {messages.listing.sidebar.poolHeatingAddOn}
                  </span>
                  <span className="mt-0.5 block text-xs text-neutral-500">
                    {formatConverted(villaProps.poolHeating.dailyAmount, villaQuote.poolHeatingCurrency)}{' '}
                    {messages.listing.sidebar.perNight}
                  </span>
                </span>
              </label>
            ) : null}

            {isHotel && !hotelQuote.available ? (
              <p className="mt-3 text-sm font-medium text-red-600 dark:text-red-400">{hotelBooking.unavailableRange}</p>
            ) : null}

            <div className="mt-4 space-y-3 rounded-2xl bg-neutral-50 p-4 dark:bg-neutral-800/50">
              <DescriptionList>
                <DescriptionTerm className="text-sm text-neutral-600 dark:text-neutral-400">
                  {isHotel && hotelRoom
                    ? `${hotelRoom.name} · ${nights} ${messages.listing.sidebar.nightsWord}`
                    : `${villaQuote.unitForBreakdownLine} × ${nights} ${messages.listing.sidebar.nightsWord}`}
                </DescriptionTerm>
                <DescriptionDetails className="text-sm text-neutral-800 sm:text-right dark:text-neutral-200">
                  {lodgingSubtotal > 0 ? formatConverted(lodgingSubtotal, currencyCode) : '—'}
                </DescriptionDetails>
                {isHotel && hotelQuote.mealPlanSupplement > 0 && hotelQuote.selectedPlanLabel ? (
                  <>
                    <DescriptionTerm className="text-sm text-neutral-600 dark:text-neutral-400">
                      {interpolate(hotelBooking.mealPlanSupplementLine, {
                        label: hotelQuote.selectedPlanLabel,
                      })}
                    </DescriptionTerm>
                    <DescriptionDetails className="text-sm text-neutral-800 sm:text-right dark:text-neutral-200">
                      {formatConverted(hotelQuote.mealPlanSupplement, currencyCode)}
                    </DescriptionDetails>
                  </>
                ) : null}
                {activityLines.map(({ activity, total }) => (
                  <Fragment key={activity.id}>
                    <DescriptionTerm className="text-sm text-neutral-600 dark:text-neutral-400">
                      {interpolate(hotelBooking.activitySurchargeLineLabel, {
                        title: hotelActivityLocalizedTitle(activity, locale),
                      })}
                    </DescriptionTerm>
                    <DescriptionDetails className="text-sm text-neutral-800 sm:text-right dark:text-neutral-200">
                      {formatConverted(total, activity.currency_code || currencyCode)}
                    </DescriptionDetails>
                  </Fragment>
                ))}
                {!isHotel && villaProps?.poolHeating && poolHeatingSelected && villaQuote.heatingSubtotal > 0 ? (
                  <>
                    <DescriptionTerm className="text-sm text-neutral-600 dark:text-neutral-400">
                      {messages.listing.poolInfo.heatingFee}
                    </DescriptionTerm>
                    <DescriptionDetails className="text-sm text-neutral-800 sm:text-right dark:text-neutral-200">
                      {formatConverted(villaQuote.heatingSubtotal, villaQuote.poolHeatingCurrency)}
                    </DescriptionDetails>
                  </>
                ) : null}
                {!isHotel && villaQuote.shortStayFeeApplied > 0 ? (
                  <>
                    <DescriptionTerm className="text-sm text-neutral-600 dark:text-neutral-400">
                      {messages.listing.sidebar.shortStayFee}
                    </DescriptionTerm>
                    <DescriptionDetails className="text-sm text-neutral-800 sm:text-right dark:text-neutral-200">
                      {formatConverted(villaQuote.shortStayFeeApplied, currencyCode)}
                    </DescriptionDetails>
                  </>
                ) : null}
                {!isHotel && villaQuote.cleaningFeeApplied > 0 ? (
                  <>
                    <DescriptionTerm className="text-sm text-neutral-600 dark:text-neutral-400">
                      {messages.listing.sidebar.cleaningFee}
                    </DescriptionTerm>
                    <DescriptionDetails className="text-sm text-neutral-800 sm:text-right dark:text-neutral-200">
                      {formatConverted(villaQuote.cleaningFeeApplied, currencyCode)}
                    </DescriptionDetails>
                  </>
                ) : null}
                {!isHotel && villaQuote.serviceFee > 0 ? (
                  <>
                    <DescriptionTerm className="text-sm text-neutral-600 dark:text-neutral-400">
                      {messages.listing.sidebar.serviceFee}
                    </DescriptionTerm>
                    <DescriptionDetails className="text-sm text-neutral-800 sm:text-right dark:text-neutral-200">
                      {formatConverted(villaQuote.serviceFee, currencyCode)}
                    </DescriptionDetails>
                  </>
                ) : null}
              </DescriptionList>
              <Divider />
              <DescriptionList>
                <DescriptionTerm className="font-semibold text-neutral-900 dark:text-white">
                  {messages.listing.sidebar.total}
                </DescriptionTerm>
                <DescriptionDetails className="font-semibold text-neutral-900 sm:text-right dark:text-white">
                  {grandTotal > 0 ? formatConverted(grandTotal, currencyCode) : '—'}
                </DescriptionDetails>
              </DescriptionList>
            </div>

            {!isHotel &&
            (('isStayRental' in props && props.isStayRental) ||
              ('isHolidayHome' in props && props.isHolidayHome)) ? (
              <ul className="mt-4 list-disc space-y-1.5 ps-5 text-xs leading-relaxed text-neutral-600 dark:text-neutral-400">
                <li>{messages.listing.sidebar.reservationPaymentNoteDeposit}</li>
                <li>{messages.listing.sidebar.reservationPaymentNoteExtras}</li>
              </ul>
            ) : null}
          </div>
          <div className="flex flex-col gap-2 border-t border-neutral-200 bg-neutral-50/80 px-5 py-4 dark:border-neutral-700 dark:bg-neutral-900/50">
            <ButtonPrimary
              type="button"
              className="w-full"
              onClick={goCheckout}
              disabled={!listingId.trim() || !canProceed}
            >
              {copy.bookingModalContinue}
            </ButtonPrimary>
            <button
              type="button"
              onClick={onClose}
              className="w-full rounded-2xl py-2.5 text-sm font-medium text-neutral-600 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-800"
            >
              {copy.bookingModalClose}
            </button>
          </div>
        </DialogPanel>
      </div>
    </Dialog>
  )
}
