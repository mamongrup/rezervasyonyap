'use client'

import DatesRangeInputPopover from '@/app/[locale]/(app)/(listings)/components/DatesRangeInputPopover'
import GuestsInputPopover from '@/app/[locale]/(app)/(listings)/components/GuestsInputPopover'
import SectionDateRange from '@/app/[locale]/(app)/(listings)/components/SectionDateRange'
import StayListingBookingQuoteModal from '@/app/[locale]/(app)/(listings)/StayListingBookingQuoteModal'
import ListingInstantApprovalTitleBadge from '@/components/listing/ListingInstantApprovalTitleBadge'
import { useHotelRoomStayQuote } from '@/hooks/use-hotel-room-stay-quote'
import type { PoolHeatingOption } from '@/hooks/use-stay-listing-quote'
import {
  hotelActivityLocalizedTitle,
} from '@/lib/hotel-activity-pricing'
import { hotelRoomCapacityOrDefault, requiredAccommodationUnits } from '@/lib/accommodation-units'
import { buildBoardTypeLabelsFromMessages, resolveHotelBoardTypeLabel } from '@/lib/hotel-room-board-type'
import { hotelPerRoomCartUnitPrice } from '@/lib/hotel-stay-quote'
import { mealPlanDisplayLabel, pickActiveMealPlans } from '@/lib/hotel-stay-quote'
import { totalGuestCount } from '@/lib/guest-search-defaults'
import type { ListingAvailabilityDay, MealPlanItem } from '@/lib/travel-api'
import { buildStayCheckoutUrl } from '@/lib/stay-checkout-url'
import type { StayBookingRules } from '@/types/listing-types'
import ButtonPrimary from '@/shared/ButtonPrimary'
import { DescriptionDetails, DescriptionList, DescriptionTerm } from '@/shared/description-list'
import { Divider } from '@/shared/divider'
import { Field, Label } from '@/shared/fieldset'
import { getMessages } from '@/utils/getT'
import {
  fetchPublicHotelRoomAvailabilityDaysSafe,
  type HotelRoomBookingOption,
} from '@/lib/hotel-room-availability-public'
import { isSyntheticHotelRoomId } from '@/lib/hotel-default-room'
import { interpolate } from '@/utils/interpolate'
import { useVitrinHref } from '@/hooks/use-vitrin-href'
import { useCheckoutPaymentAmount } from '@/contexts/preferred-currency-context'
import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import { useHotelStayBooking } from './hotel-stay-booking-context'
import HotelSidebarRoomPicker from './HotelSidebarRoomPicker'

type SharedProps = {
  locale: string
  listingId: string
  rooms: HotelRoomBookingOption[]
  mealPlans: MealPlanItem[]
  price: string
  priceAmount: number | undefined
  priceCurrency: string | undefined
  saleOff: string | null | undefined
  discountPercent: number | null | undefined
  poolHeating?: PoolHeatingOption
  stayBookingRules?: StayBookingRules
  cleaningFeeAmount?: number
  damageDepositAmount?: number
  ruleFallbackNightly?: number
  ruleNightlyRange?: { min: number; max: number }
  initialMonthsShown?: 1 | 2
}

function RoomTypeSelect({
  rooms,
  value,
  onChange,
  locale,
}: {
  rooms: HotelRoomBookingOption[]
  value: string
  onChange: (id: string) => void
  locale: string
}) {
  const hb = getMessages(locale).listing.hotelBooking
  return (
    <Field className="block">
      <Label>{hb.roomTypeLabel}</Label>
      <select
        className="mt-1 w-full rounded-xl border border-neutral-300 bg-white px-3 py-2.5 text-sm dark:border-neutral-600 dark:bg-neutral-900"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {rooms.map((r) => (
          <option key={r.id} value={r.id}>
            {r.name}
            {r.unit_count > 1
              ? ` ${interpolate(hb.roomUnitCount, { count: String(r.unit_count) })}`
              : ''}
            {r.capacity
              ? interpolate(hb.guestCapacitySuffix, { count: String(r.capacity) })
              : ''}
          </option>
        ))}
      </select>
    </Field>
  )
}

function MealPlanSelect({
  locale,
  plans,
  value,
  onChange,
  fallbackLabel,
}: {
  locale: string
  plans: MealPlanItem[]
  value: string
  onChange: (id: string) => void
  fallbackLabel?: string | null
}) {
  const hb = getMessages(locale).listing.hotelBooking
  if (plans.length === 0 && !fallbackLabel) return null
  return (
    <Field className="block">
      <Label>{hb.mealPlanLabel}</Label>
      <select
        className="mt-1 w-full rounded-xl border border-neutral-300 bg-white px-3 py-2.5 text-sm dark:border-neutral-600 dark:bg-neutral-900"
        value={plans.length > 0 ? value : '__room_board__'}
        onChange={(e) => onChange(e.target.value)}
        disabled={plans.length === 0}
      >
        {plans.length > 0 ? (
          plans.map((p) => (
            <option key={p.id} value={p.id}>
              {mealPlanDisplayLabel(p, locale)}
            </option>
          ))
        ) : (
          <option value="__room_board__">{fallbackLabel}</option>
        )}
      </select>
    </Field>
  )
}

function useHotelRoomAvailability(listingId: string, selectedRoom: HotelRoomBookingOption | undefined) {
  const [days, setDays] = useState<ListingAvailabilityDay[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!selectedRoom?.id) {
      setDays([])
      return
    }
    let cancelled = false
    setLoading(true)
    void fetchPublicHotelRoomAvailabilityDaysSafe(listingId, selectedRoom.id, selectedRoom.unit_count)
      .then((rows) => {
        if (!cancelled) setDays(rows)
      })
      .catch(() => {
        if (!cancelled) setDays([])
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [listingId, selectedRoom?.id, selectedRoom?.unit_count])

  return { days, loading }
}

function buildHotelCheckoutUrl(
  vitrinHref: (path: string) => string,
  params: {
    listingId: string
    startDate: Date
    endDate: Date
    currencyCode: string
    unitPrice: number
    roomQuantity: number
    selectedRoom: HotelRoomBookingOption
    selectedPlanLabel: string | null
    selectedMealPlanId: string
    guests: import('@/type').GuestsObject
    adultsOnly?: boolean
    freeChildMaxAge?: number | null
  },
) {
  // Sentetik "Standart Oda" (gerçek hotel_rooms kaydı yok) → checkout ILAN BAZLI:
  // oda id/adı/adedi gönderilmez, yalnızca ilan + tarih + tutar taşınır.
  const synthetic = isSyntheticHotelRoomId(params.selectedRoom.id)
  return buildStayCheckoutUrl(vitrinHref('/checkout'), {
    listingId: params.listingId,
    startDate: params.startDate,
    endDate: params.endDate,
    currencyCode: params.currencyCode,
    unitPrice: params.unitPrice,
    guests: params.guests,
    hotelRoomId: synthetic ? undefined : params.selectedRoom.id,
    hotelRoomName: synthetic ? undefined : params.selectedRoom.name,
    hotelBoardLabel: params.selectedPlanLabel ?? undefined,
    mealPlanId: params.selectedMealPlanId || undefined,
    mealPlanLabel: params.selectedPlanLabel ?? undefined,
    hotelRoomQuantity: synthetic ? undefined : params.roomQuantity,
    askChildAges: true,
    adultsOnly: params.adultsOnly,
    freeChildMaxAge: params.freeChildMaxAge,
  })
}

/** Otel vitrin — tarih → oda → misafir adımlı rezervasyon. */
export function HotelStayBookingSidebar(props: SharedProps) {
  const { locale, listingId, rooms, mealPlans, stayBookingRules } = props

  const messages = getMessages(locale)
  const hotelBooking = messages.listing.hotelBooking
  const router = useRouter()
  const vitrinHref = useVitrinHref()
  const booking = useHotelStayBooking()

  const rangeStart = booking.rangeStart
  const rangeEnd = booking.rangeEnd
  const onRangeChange = (dates: [Date | null, Date | null]) => {
    booking.setRange(dates[0], dates[1])
  }

  const hasSelectedRange = rangeStart != null && rangeEnd != null
  const roomChosen = Boolean(booking.selectedRoomId && booking.selectedRoom)
  const showRoomStep = rooms.length > 0
  const showGuestStep = roomChosen

  const selectedRoom = booking.selectedRoom ?? undefined
  const guestCount = Math.max(1, totalGuestCount(booking.guests))
  const bookingUnitCount = selectedRoom
    ? requiredAccommodationUnits(guestCount, hotelRoomCapacityOrDefault(selectedRoom.capacity))
    : 1

  const { days: availabilityDays, loading: availLoading } = useHotelRoomAvailability(
    listingId,
    selectedRoom,
  )

  const quote = useHotelRoomStayQuote({
    listingId,
    selectedRoom,
    rangeStart,
    rangeEnd,
    fallbackNightly: booking.fallbackNightly,
    mealPlans,
    selectedMealPlanId: booking.selectedMealPlanId,
    activitySurchargesTotal: booking.activitySurchargesTotal,
    locale,
    bookingUnitCount: roomChosen ? bookingUnitCount : 1,
    childAges: booking.guests.childAges,
    infantCount: booking.guests.guestInfants ?? 0,
    childPolicy: booking.childPolicy,
  })

  const boardLabels = buildBoardTypeLabelsFromMessages(
    (messages.listing.roomShowcase ?? {}) as Record<string, string>,
  )
  const roomBoardLabel = resolveHotelBoardTypeLabel(selectedRoom?.board_type, boardLabels)
  const checkoutBoardLabel = quote.selectedPlanLabel ?? roomBoardLabel

  const perRoomCartPrice = hotelPerRoomCartUnitPrice(
    quote,
    bookingUnitCount,
    booking.activitySurchargesTotal,
  )
  const checkoutPayment = useCheckoutPaymentAmount(quote.currencyCode, perRoomCartPrice)
  const startingNightlyPrice = quote.formatConverted(booking.fallbackNightly, quote.currencyCode)

  const canCheckout =
    Boolean(listingId.trim()) &&
    hasSelectedRange &&
    roomChosen &&
    quote.grandTotal > 0 &&
    quote.available &&
    selectedRoom?.id

  function goCheckout() {
    if (!canCheckout || !rangeStart || !rangeEnd || !selectedRoom) return
    router.push(
      buildHotelCheckoutUrl(vitrinHref, {
        listingId,
        startDate: rangeStart,
        endDate: rangeEnd,
        currencyCode: checkoutPayment.currencyCode,
        unitPrice: checkoutPayment.unitPrice,
        roomQuantity: bookingUnitCount,
        selectedRoom,
        selectedPlanLabel: checkoutBoardLabel,
        selectedMealPlanId: booking.selectedMealPlanId,
        guests: booking.guests,
        adultsOnly: booking.adultsOnly,
        freeChildMaxAge: booking.childPolicy.freeMaxAge,
      }),
    )
  }

  return (
    <div className="listingSection__wrap scroll-mt-28 rounded-3xl border border-neutral-200/90 bg-white p-5 shadow-2xl ring-1 ring-black/5 dark:border-neutral-600 dark:bg-neutral-900 dark:ring-white/10 sm:p-6">
      <p className="mb-1 text-sm text-neutral-500 dark:text-neutral-400">
        {messages.listing.activityBooking.startingPrice}
      </p>
      <div className="flex flex-wrap items-start gap-x-3 gap-y-2">
        <div className="flex min-w-0 flex-1 flex-wrap items-baseline gap-x-3 gap-y-1">
          <span className="text-2xl font-semibold text-neutral-900 sm:text-3xl dark:text-neutral-100">
            {booking.fallbackNightly > 0 ? startingNightlyPrice : quote.displayMainPrice}
          </span>
          <span className="text-base text-neutral-500 dark:text-neutral-400">
            {messages.listing.sidebar.perNight}
          </span>
        </div>
        <ListingInstantApprovalTitleBadge listingId={listingId} />
      </div>

      <div className="mt-4 space-y-4">
        {availLoading || quote.availLoading ? (
          <p className="text-xs text-neutral-400">{hotelBooking.roomAvailabilityLoading}</p>
        ) : null}

        {!quote.available && hasSelectedRange && roomChosen ? (
          <p className="text-xs font-medium text-red-600 dark:text-red-400">{hotelBooking.unavailableRange}</p>
        ) : null}

        {bookingUnitCount > 1 && roomChosen ? (
          <p className="text-xs text-neutral-600 dark:text-neutral-400">
            {interpolate(hotelBooking.autoRoomCountNote, {
              rooms: String(bookingUnitCount),
              guests: String(guestCount),
            })}
          </p>
        ) : null}

        <div className="flex flex-col rounded-3xl border border-neutral-200 dark:border-neutral-700">
          <DatesRangeInputPopover
            locale={locale}
            rangeStart={rangeStart}
            rangeEnd={rangeEnd}
            onRangeChange={onRangeChange}
            bookingRules={stayBookingRules}
            availabilityDays={roomChosen ? availabilityDays : undefined}
          />
          {showRoomStep ? <HotelSidebarRoomPicker locale={locale} /> : null}
          {showGuestStep ? (
            <>
              <div className="border-b border-neutral-200 px-3 py-3 dark:border-neutral-700">
                <MealPlanSelect
                  locale={locale}
                  plans={quote.activePlans}
                  value={booking.selectedMealPlanId}
                  onChange={booking.setSelectedMealPlanId}
                  fallbackLabel={roomBoardLabel}
                />
              </div>
              <div className="w-full border-b border-neutral-200 dark:border-neutral-700" />
              <GuestsInputPopover
                className="flex-1"
                value={booking.guests}
                onChange={booking.setGuests}
                adultsOnly={booking.adultsOnly}
                askChildAges={!booking.adultsOnly}
                freeChildMaxAge={booking.childPolicy.freeMaxAge}
              />
            </>
          ) : null}
        </div>

        {showGuestStep ? (
          <div className="space-y-2 rounded-2xl bg-neutral-50 p-4 dark:bg-neutral-800/50">
            {quote.nights > 0 ? (
              <DescriptionList>
                <DescriptionTerm className="text-sm text-neutral-600 dark:text-neutral-400">
                  {selectedRoom?.name}
                  {bookingUnitCount > 1
                    ? ` · ${interpolate(hotelBooking.roomUnitCount, { count: String(bookingUnitCount) })}`
                    : ''}{' '}
                  · {quote.nights} {messages.listing.sidebar.nightsWord}
                </DescriptionTerm>
                <DescriptionDetails className="text-sm sm:text-right">
                  {quote.lodgingSubtotal > 0 ? quote.formatConverted(quote.lodgingSubtotal, quote.currencyCode) : '—'}
                </DescriptionDetails>
              </DescriptionList>
            ) : null}
            {quote.mealPlanSupplement > 0 && quote.selectedPlanLabel ? (
              <DescriptionList>
                <DescriptionTerm className="text-sm text-neutral-600 dark:text-neutral-400">
                  {interpolate(hotelBooking.mealPlanSupplementLine, { label: quote.selectedPlanLabel })}
                </DescriptionTerm>
                <DescriptionDetails className="text-sm sm:text-right">
                  {quote.formatConverted(quote.mealPlanSupplement, quote.currencyCode)}
                </DescriptionDetails>
              </DescriptionList>
            ) : null}
            {quote.childSurchargeTotal > 0 ? (
              <DescriptionList>
                <DescriptionTerm className="text-sm text-neutral-600 dark:text-neutral-400">
                  Çocuk ücreti
                  {quote.childBreakdown?.chargedChildren
                    ? ` (${quote.childBreakdown.chargedChildren} çocuk)`
                    : ''}
                </DescriptionTerm>
                <DescriptionDetails className="text-sm sm:text-right">
                  {quote.formatConverted(quote.childSurchargeTotal, quote.currencyCode)}
                </DescriptionDetails>
              </DescriptionList>
            ) : null}
            {booking.activitySurchargeLines.map(({ activity, total }) => (
              <DescriptionList key={activity.id}>
                <DescriptionTerm className="text-sm text-neutral-600 dark:text-neutral-400">
                  {interpolate(hotelBooking.activitySurchargeLineLabel, {
                    title: hotelActivityLocalizedTitle(activity, locale),
                  })}
                </DescriptionTerm>
                <DescriptionDetails className="text-sm sm:text-right">
                  {quote.formatConverted(total, activity.currency_code || quote.currencyCode)}
                </DescriptionDetails>
              </DescriptionList>
            ))}
            <Divider />
            <DescriptionList>
              <DescriptionTerm className="font-semibold">{messages.listing.sidebar.total}</DescriptionTerm>
              <DescriptionDetails className="font-semibold sm:text-right">
                {quote.grandTotal > 0 ? quote.formatConverted(quote.grandTotal, quote.currencyCode) : '—'}
              </DescriptionDetails>
            </DescriptionList>
          </div>
        ) : null}

        <ButtonPrimary type="button" disabled={!canCheckout} onClick={goCheckout}>
          {roomChosen ? messages.listing.sidebar.reserve : hotelBooking.selectRoomPrompt}
        </ButtonPrimary>
      </div>
    </div>
  )
}

export function HotelStayBookingCalendar(props: SharedProps) {
  const {
    locale,
    listingId,
    rooms,
    initialMonthsShown = 1,
    stayBookingRules,
    mealPlans,
  } = props

  const hotelBooking = getMessages(locale).listing.hotelBooking
  const booking = useHotelStayBooking()

  const selectedRoom = useMemo(
    () =>
      booking.selectedRoomId
        ? booking.rooms.find((r) => r.id === booking.selectedRoomId)
        : undefined,
    [booking.rooms, booking.selectedRoomId],
  )
  const { days: availabilityDays, loading: availLoading } = useHotelRoomAvailability(listingId, selectedRoom)

  const [modalOpen, setModalOpen] = useState(false)
  const [range, setRange] = useState<{ start: Date; end: Date } | null>(null)

  return (
    <div className="space-y-5">
      <RoomTypeSelect
        locale={locale}
        rooms={rooms}
        value={booking.selectedRoomId}
        onChange={booking.setSelectedRoomId}
      />
      <MealPlanSelect
        locale={locale}
        plans={pickActiveMealPlans(mealPlans)}
        value={booking.selectedMealPlanId}
        onChange={booking.setSelectedMealPlanId}
      />
      {availLoading ? (
        <p className="text-sm text-neutral-400">{hotelBooking.roomAvailabilityLoading}</p>
      ) : null}
      <SectionDateRange
        locale={locale}
        initialDays={availabilityDays}
        initialMonthsShown={initialMonthsShown}
        bookingRules={stayBookingRules}
        onCompleteRange={(start, end) => {
          booking.setRange(start, end)
          setRange({ start, end })
          setModalOpen(true)
        }}
      />
      {range && selectedRoom ? (
        <StayListingBookingQuoteModal
          locale={locale}
          listingId={listingId}
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          rangeStart={range.start}
          rangeEnd={range.end}
          mealPlans={mealPlans}
          isHotel
          hotelRoom={selectedRoom}
          selectedMealPlanId={booking.selectedMealPlanId}
          activitySurchargesTotal={booking.activitySurchargesTotal}
          activitySurchargeLines={booking.activitySurchargeLines}
          guests={booking.guests}
        />
      ) : null}
    </div>
  )
}
