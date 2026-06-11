'use client'

import {
  computeHotelActivityStaySurcharges,
  isActivityDateWithinStay,
} from '@/lib/hotel-activity-pricing'
import type { HotelListingActivity } from '@/lib/travel-api'
import type { HotelRoomBookingOption } from '@/lib/hotel-room-availability-public'
import { DEFAULT_GUESTS_STAY } from '@/lib/guest-search-defaults'
import { pickDefaultMealPlanForRoom, pickActiveMealPlans } from '@/lib/hotel-stay-quote'
import type { MealPlanItem } from '@/lib/travel-api'
import type { StayBookingRules } from '@/types/listing-types'
import type { GuestsObject } from '@/type'
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'

export type HotelStayBookingQuoteProps = {
  mealPlans: MealPlanItem[]
  price: string
  priceAmount: number | undefined
  priceCurrency: string | undefined
  saleOff: string | null | undefined
  discountPercent: number | null | undefined
  stayBookingRules?: StayBookingRules
  cleaningFeeAmount?: number
  damageDepositAmount?: number
  ruleFallbackNightly?: number
  ruleNightlyRange?: { min: number; max: number }
}

type HotelStayBookingContextValue = {
  listingId: string
  rooms: HotelRoomBookingOption[]
  activities: HotelListingActivity[]
  quoteProps: HotelStayBookingQuoteProps
  rangeStart: Date | null
  rangeEnd: Date | null
  setRange: (start: Date | null, end: Date | null) => void
  guests: GuestsObject
  setGuests: (guests: GuestsObject) => void
  selectedRoomId: string
  setSelectedRoomId: (id: string) => void
  selectedMealPlanId: string
  setSelectedMealPlanId: (id: string) => void
  isActivityDateInStay: (activity: HotelListingActivity) => boolean
  activitySurchargeLines: Array<{ activity: HotelListingActivity; total: number }>
  activitySurchargesTotal: number
  selectRoomAndScroll: (roomId: string) => void
  scrollToReservation: () => void
  fallbackNightly: number
  currencyCode: string
}

const HotelStayBookingContext = createContext<HotelStayBookingContextValue | null>(null)

export function HotelStayBookingProvider({
  listingId,
  rooms,
  activities = [],
  quoteProps,
  reservationAnchorId = 'stay-reservation-card',
  children,
}: {
  listingId: string
  rooms: HotelRoomBookingOption[]
  activities?: HotelListingActivity[]
  quoteProps: HotelStayBookingQuoteProps
  reservationAnchorId?: string
  children: ReactNode
}) {
  const [rangeStart, setRangeStart] = useState<Date | null>(null)
  const [rangeEnd, setRangeEnd] = useState<Date | null>(null)
  const [guests, setGuests] = useState<GuestsObject>(DEFAULT_GUESTS_STAY)
  const [selectedRoomId, setSelectedRoomId] = useState(rooms[0]?.id ?? '')
  const [selectedMealPlanId, setSelectedMealPlanId] = useState('')

  const selectedRoom = useMemo(
    () => rooms.find((r) => r.id === selectedRoomId) ?? rooms[0],
    [rooms, selectedRoomId],
  )

  useEffect(() => {
    const active = pickActiveMealPlans(quoteProps.mealPlans)
    const defaultPlan = pickDefaultMealPlanForRoom(active, selectedRoom?.board_type)
    if (!defaultPlan?.id) return
    setSelectedMealPlanId((prev) => {
      if (prev && active.some((p) => p.id === prev)) return prev
      return defaultPlan.id
    })
  }, [selectedRoom?.id, selectedRoom?.board_type, quoteProps.mealPlans])

  const setRange = useCallback((start: Date | null, end: Date | null) => {
    setRangeStart(start)
    setRangeEnd(end)
  }, [])

  const scrollToReservation = useCallback(() => {
    if (typeof window === 'undefined') return
    const el = document.getElementById(reservationAnchorId)
    el?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [reservationAnchorId])

  const selectRoomAndScroll = useCallback(
    (roomId: string) => {
      setSelectedRoomId(roomId)
      scrollToReservation()
    },
    [scrollToReservation],
  )

  const isActivityDateInStay = useCallback(
    (activity: HotelListingActivity) =>
      isActivityDateWithinStay(activity.activity_date, rangeStart, rangeEnd),
    [rangeStart, rangeEnd],
  )

  const { lines: activitySurchargeLines, grandTotal: activitySurchargesTotal } = useMemo(
    () =>
      computeHotelActivityStaySurcharges({
        activities,
        checkIn: rangeStart,
        checkOut: rangeEnd,
      }),
    [activities, rangeStart, rangeEnd],
  )

  const activePlans = useMemo(
    () => quoteProps.mealPlans.filter((p) => p.is_active).sort((a, b) => a.sort_order - b.sort_order),
    [quoteProps.mealPlans],
  )
  const cheapestPlan = useMemo(
    () =>
      activePlans.length > 0
        ? activePlans.reduce((min, p) => (p.price_per_night < min.price_per_night ? p : min))
        : null,
    [activePlans],
  )

  const fallbackNightly = useMemo(() => {
    if (cheapestPlan?.price_per_night && cheapestPlan.price_per_night > 0) {
      return cheapestPlan.price_per_night
    }
    if (quoteProps.ruleFallbackNightly && quoteProps.ruleFallbackNightly > 0) {
      return quoteProps.ruleFallbackNightly
    }
    if (quoteProps.priceAmount && quoteProps.priceAmount > 0) return quoteProps.priceAmount
    const parsed = Number.parseInt((quoteProps.price ?? '').replace(/\D/g, '') || '0', 10)
    return parsed > 0 ? parsed : 0
  }, [cheapestPlan, quoteProps])

  const currencyCode = (
    cheapestPlan?.currency_code ??
    quoteProps.priceCurrency ??
    'TRY'
  )
    .trim()
    .toUpperCase()

  const value = useMemo(
    (): HotelStayBookingContextValue => ({
      listingId,
      rooms,
      activities,
      quoteProps,
      rangeStart,
      rangeEnd,
      setRange,
      guests,
      setGuests,
      selectedRoomId,
      setSelectedRoomId,
      selectedMealPlanId,
      setSelectedMealPlanId,
      isActivityDateInStay,
      activitySurchargeLines,
      activitySurchargesTotal,
      selectRoomAndScroll,
      scrollToReservation,
      fallbackNightly,
      currencyCode,
    }),
    [
      listingId,
      rooms,
      activities,
      quoteProps,
      rangeStart,
      rangeEnd,
      setRange,
      guests,
      selectedRoomId,
      selectedMealPlanId,
      isActivityDateInStay,
      activitySurchargeLines,
      activitySurchargesTotal,
      selectRoomAndScroll,
      scrollToReservation,
      fallbackNightly,
      currencyCode,
    ],
  )

  return (
    <HotelStayBookingContext.Provider value={value}>{children}</HotelStayBookingContext.Provider>
  )
}

export function useHotelStayBooking() {
  const ctx = useContext(HotelStayBookingContext)
  if (!ctx) {
    throw new Error('useHotelStayBooking must be used within HotelStayBookingProvider')
  }
  return ctx
}

export function useOptionalHotelStayBooking() {
  return useContext(HotelStayBookingContext)
}
