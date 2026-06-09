'use client'

import DatesRangeInputPopover from '@/app/[locale]/(app)/(listings)/components/DatesRangeInputPopover'
import GuestsInputPopover from '@/app/[locale]/(app)/(listings)/components/GuestsInputPopover'
import SectionDateRange from '@/app/[locale]/(app)/(listings)/components/SectionDateRange'
import StayListingBookingQuoteModal from '@/app/[locale]/(app)/(listings)/StayListingBookingQuoteModal'
import ListingInstantApprovalTitleBadge from '@/components/listing/ListingInstantApprovalTitleBadge'
import { useStayListingQuote, type PoolHeatingOption } from '@/hooks/use-stay-listing-quote'
import {
  fetchPublicHotelRoomAvailabilityDaysSafe,
  type HotelRoomBookingOption,
} from '@/lib/hotel-room-availability-public'
import type { ListingAvailabilityDay, MealPlanItem } from '@/lib/travel-api'
import { buildStayCheckoutUrl } from '@/lib/stay-checkout-url'
import type { StayBookingRules } from '@/types/listing-types'
import ButtonPrimary from '@/shared/ButtonPrimary'
import { DescriptionDetails, DescriptionList, DescriptionTerm } from '@/shared/description-list'
import { Divider } from '@/shared/divider'
import { Field, Label } from '@/shared/fieldset'
import { getMessages } from '@/utils/getT'
import { useVitrinHref } from '@/hooks/use-vitrin-href'
import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'

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
  handleSubmitForm?: (formData: FormData) => Promise<void>
}

function RoomTypeSelect({
  rooms,
  value,
  onChange,
}: {
  rooms: HotelRoomBookingOption[]
  value: string
  onChange: (id: string) => void
}) {
  return (
    <Field className="block">
      <Label>Oda tipi</Label>
      <select
        className="mt-1 w-full rounded-xl border border-neutral-300 bg-white px-3 py-2.5 text-sm dark:border-neutral-600 dark:bg-neutral-900"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {rooms.map((r) => (
          <option key={r.id} value={r.id}>
            {r.name}
            {r.unit_count > 1 ? ` (${r.unit_count} oda)` : ''}
            {r.capacity ? ` · ${r.capacity} kişi` : ''}
          </option>
        ))}
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

/** Otel vitrin — oda tipi seçimi + oda müsaitlik takvimine göre rezervasyon. */
export function HotelStayBookingSidebar(props: SharedProps) {
  const {
    locale,
    listingId,
    rooms,
    mealPlans,
    price,
    priceAmount,
    priceCurrency,
    saleOff,
    discountPercent,
    stayBookingRules,
    cleaningFeeAmount,
    damageDepositAmount,
    ruleFallbackNightly,
    ruleNightlyRange,
    handleSubmitForm,
  } = props

  const messages = getMessages(locale)
  const router = useRouter()
  const vitrinHref = useVitrinHref()

  const [selectedRoomId, setSelectedRoomId] = useState(rooms[0]?.id ?? '')
  const selectedRoom = useMemo(
    () => rooms.find((r) => r.id === selectedRoomId) ?? rooms[0],
    [rooms, selectedRoomId],
  )
  const { days: availabilityDays, loading: availLoading } = useHotelRoomAvailability(listingId, selectedRoom)

  const [rangeStart, setRangeStart] = useState<Date | null>(null)
  const [rangeEnd, setRangeEnd] = useState<Date | null>(null)

  const onRangeChange = (dates: [Date | null, Date | null]) => {
    const [s, e] = dates
    setRangeStart(s)
    setRangeEnd(e)
  }

  const {
    nights,
    activePlans,
    cheapestPlan,
    currencyCode,
    showDiscountRow,
    originalPriceNum,
    basePriceNum,
    discountPct,
    displayMainPrice,
    lodgingSubtotal,
    serviceFee,
    grandTotal,
    unitForBreakdownLine,
    formatConverted,
    cleaningFeeApplied,
  } = useStayListingQuote({
    mealPlans,
    price,
    priceAmount,
    priceCurrency,
    saleOff,
    discountPercent,
    rangeStart,
    rangeEnd,
    poolHeating: null,
    poolHeatingSelected: false,
    minShortStayNights: stayBookingRules?.minShortStayNights,
    shortStayFeeAmount: stayBookingRules?.shortStayFeeAmount,
    cleaningFeeAmount,
    damageDepositAmount,
    ruleFallbackNightly,
    ruleNightlyRange,
  })

  const hasSelectedRange = rangeStart != null && rangeEnd != null
  const canCheckout = Boolean(listingId.trim()) && hasSelectedRange && grandTotal > 0 && selectedRoom?.id

  function goCheckout() {
    if (!canCheckout || !rangeStart || !rangeEnd || !selectedRoom) return
    router.push(
      buildStayCheckoutUrl(vitrinHref('/checkout'), {
        listingId,
        startDate: rangeStart,
        endDate: rangeEnd,
        currencyCode,
        unitPrice: grandTotal,
        hotelRoomId: selectedRoom.id,
        hotelRoomName: selectedRoom.name,
      }),
    )
  }

  const hasMultiplePlans = activePlans.length > 1
  const hasMealPlan = activePlans.some((p) => p.plan_code !== 'room_only')

  return (
    <div className="listingSection__wrap rounded-3xl border border-neutral-200/90 bg-white p-5 shadow-2xl ring-1 ring-black/5 dark:border-neutral-600 dark:bg-neutral-900 dark:ring-white/10 sm:p-6">
      <div className="flex flex-wrap items-start gap-x-3 gap-y-2">
        <div className="flex min-w-0 flex-1 flex-wrap items-baseline gap-x-3 gap-y-1">
          <span className="text-2xl font-semibold text-neutral-900 sm:text-3xl dark:text-neutral-100">
            {displayMainPrice}
          </span>
          <span className="text-base text-neutral-500 dark:text-neutral-400">{messages.listing.sidebar.perNight}</span>
        </div>
        <ListingInstantApprovalTitleBadge listingId={listingId} />
      </div>

      <div className="mt-4 space-y-4">
        <RoomTypeSelect rooms={rooms} value={selectedRoomId} onChange={setSelectedRoomId} />
        {availLoading ? (
          <p className="text-xs text-neutral-400">Oda müsaitliği yükleniyor…</p>
        ) : null}

        <div className="flex flex-col rounded-3xl border border-neutral-200 dark:border-neutral-700">
          <DatesRangeInputPopover
            locale={locale}
            rangeStart={rangeStart}
            rangeEnd={rangeEnd}
            onRangeChange={onRangeChange}
            bookingRules={stayBookingRules}
            availabilityDays={availabilityDays}
          />
          <div className="w-full border-b border-neutral-200 dark:border-neutral-700" />
          <GuestsInputPopover className="flex-1" />
        </div>

        {hasSelectedRange && nights > 0 ? (
          <div className="space-y-2 rounded-2xl bg-neutral-50 p-4 dark:bg-neutral-800/50">
            <DescriptionList>
              <DescriptionTerm className="text-sm text-neutral-600 dark:text-neutral-400">
                {selectedRoom?.name} · {unitForBreakdownLine} × {nights} {messages.listing.sidebar.nightsWord}
              </DescriptionTerm>
              <DescriptionDetails className="text-sm sm:text-right">
                {lodgingSubtotal > 0 ? formatConverted(lodgingSubtotal, currencyCode) : '—'}
              </DescriptionDetails>
            </DescriptionList>
            {cleaningFeeApplied > 0 ? (
              <DescriptionList>
                <DescriptionTerm className="text-sm text-neutral-600">{messages.listing.sidebar.cleaningFee}</DescriptionTerm>
                <DescriptionDetails className="text-sm sm:text-right">
                  {formatConverted(cleaningFeeApplied, currencyCode)}
                </DescriptionDetails>
              </DescriptionList>
            ) : null}
            {serviceFee > 0 ? (
              <DescriptionList>
                <DescriptionTerm className="text-sm text-neutral-600">{messages.listing.sidebar.serviceFee}</DescriptionTerm>
                <DescriptionDetails className="text-sm sm:text-right">
                  {formatConverted(serviceFee, currencyCode)}
                </DescriptionDetails>
              </DescriptionList>
            ) : null}
            <Divider />
            <DescriptionList>
              <DescriptionTerm className="font-semibold">{messages.listing.sidebar.total}</DescriptionTerm>
              <DescriptionDetails className="font-semibold sm:text-right">
                {grandTotal > 0 ? formatConverted(grandTotal, currencyCode) : '—'}
              </DescriptionDetails>
            </DescriptionList>
          </div>
        ) : null}

        {handleSubmitForm ? (
          <form action={handleSubmitForm}>
            <ButtonPrimary type="submit" className="w-full">
              {messages.listing.sidebar.checkAvailability}
            </ButtonPrimary>
          </form>
        ) : (
          <ButtonPrimary type="button" disabled={!canCheckout} onClick={goCheckout}>
            {messages.listing.sidebar.reserve}
          </ButtonPrimary>
        )}

        {cheapestPlan && hasMealPlan ? (
          <p className="text-xs text-neutral-500 dark:text-neutral-400">
            {hasMultiplePlans
              ? messages.listing.sidebar.mealPlanFromMany.replace('{count}', String(activePlans.length))
              : messages.listing.sidebar.mealPlanMealsIncluded}
          </p>
        ) : null}
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
    price,
    priceAmount,
    priceCurrency,
    saleOff,
    discountPercent,
    cleaningFeeAmount,
    damageDepositAmount,
    ruleFallbackNightly,
    ruleNightlyRange,
  } = props

  const [selectedRoomId, setSelectedRoomId] = useState(rooms[0]?.id ?? '')
  const selectedRoom = useMemo(
    () => rooms.find((r) => r.id === selectedRoomId) ?? rooms[0],
    [rooms, selectedRoomId],
  )
  const { days: availabilityDays, loading: availLoading } = useHotelRoomAvailability(listingId, selectedRoom)

  const [modalOpen, setModalOpen] = useState(false)
  const [range, setRange] = useState<{ start: Date; end: Date } | null>(null)

  return (
    <div className="space-y-5">
      <RoomTypeSelect rooms={rooms} value={selectedRoomId} onChange={setSelectedRoomId} />
      {availLoading ? <p className="text-sm text-neutral-400">Oda müsaitliği yükleniyor…</p> : null}
      <SectionDateRange
        locale={locale}
        initialDays={availabilityDays}
        initialMonthsShown={initialMonthsShown}
        bookingRules={stayBookingRules}
        onCompleteRange={(start, end) => {
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
          price={price}
          priceAmount={priceAmount}
          priceCurrency={priceCurrency}
          saleOff={saleOff}
          discountPercent={discountPercent}
          poolHeating={null}
          stayBookingRules={stayBookingRules}
          cleaningFeeAmount={cleaningFeeAmount}
          damageDepositAmount={damageDepositAmount}
          ruleFallbackNightly={ruleFallbackNightly}
          ruleNightlyRange={ruleNightlyRange}
          hotelRoomId={selectedRoom.id}
          hotelRoomName={selectedRoom.name}
        />
      ) : null}
    </div>
  )
}
