'use client'

import {
  computeHotelActivityStaySurcharges,
  isActivityDateWithinStay,
} from '@/lib/hotel-activity-pricing'
import type { HotelListingActivity, ListingPriceRuleRow } from '@/lib/travel-api'
import type { HotelRoomBookingOption } from '@/lib/hotel-room-availability-public'
import { DEFAULT_GUESTS_STAY } from '@/lib/guest-search-defaults'
import {
  normalizeGuestsWithChildAges,
  type HotelChildPolicy,
  DEFAULT_HOTEL_CHILD_POLICY,
  ADULTS_ONLY_CHILD_POLICY,
} from '@/lib/hotel-child-policy'
import {
  parseStayListingDatesFromSearchParams,
  parseStayListingGuestsFromSearchParams,
} from '@/lib/stay-listing-booking-init'
import { useSearchParams } from 'next/navigation'
import { pickDefaultMealPlanForRoom, pickActiveMealPlans } from '@/lib/hotel-stay-quote'
import {
  hotelListingHasRoomScopedPrices,
  minHotelRoomOwnedNightly,
  resolveHotelRoomFallbackNightly,
  resolveHotelRoomNightlyForDay,
} from '@/lib/hotel-room-nightly'
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
  childPolicy?: HotelChildPolicy
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
  selectedRoom: HotelRoomBookingOption | null
  selectedMealPlanId: string
  setSelectedMealPlanId: (id: string) => void
  isActivityDateInStay: (activity: HotelListingActivity) => boolean
  activitySurchargeLines: Array<{ activity: HotelListingActivity; total: number }>
  activitySurchargesTotal: number
  selectRoomAndScroll: (roomId: string) => void
  scrollToReservation: () => void
  /** İlan genel (yemek planı / vitrin) taban — oda kartlarında doğrudan kullanılmamalı. */
  fallbackNightly: number
  /** Seçili oda için gecelik taban (oda seasonal/rules; yoksa 0 veya sentetikte ilan tabanı). */
  selectedRoomFallbackNightly: number
  priceRules: ListingPriceRuleRow[]
  listingHasRoomScopedPrices: boolean
  roomFallbackNightly: (room: HotelRoomBookingOption) => number
  resolveRoomNightlyForDay: (room: HotelRoomBookingOption, ymd: string) => number | null
  currencyCode: string
  childPolicy: HotelChildPolicy
  adultsOnly: boolean
  liveKplus: boolean
  livePriceLoading: boolean
  livePriceReady: boolean
  livePriceAvailable: boolean
  selectedLiveRoomAvailable: boolean
  livePriceError: boolean
  livePriceCheckedAt: string | null
}

type KplusLiveRoom = {
  name: string
  nightlyPrice: number
  currency: string
  boardType: string | null
  availableUnits: number
}

function liveRoomKey(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('tr-TR')
    .replace(/ı/g, 'i')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

function formatYmd(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const HotelStayBookingContext = createContext<HotelStayBookingContextValue | null>(null)

export function HotelStayBookingProvider({
  listingId,
  rooms,
  activities = [],
  quoteProps,
  priceRules = [],
  liveKplus = false,
  reservationAnchorId = 'stay-reservation-card',
  children,
}: {
  listingId: string
  rooms: HotelRoomBookingOption[]
  activities?: HotelListingActivity[]
  quoteProps: HotelStayBookingQuoteProps
  /** Oda adıyla eşleşen `listing_price_rules` — oda kartı fiyat farkı için. */
  priceRules?: ListingPriceRuleRow[]
  liveKplus?: boolean
  reservationAnchorId?: string
  children: ReactNode
}) {
  const searchParams = useSearchParams()
  const [rangeStart, setRangeStart] = useState<Date | null>(null)
  const [rangeEnd, setRangeEnd] = useState<Date | null>(null)
  const [guests, setGuestsState] = useState<GuestsObject>(DEFAULT_GUESTS_STAY)
  const [urlHydrated, setUrlHydrated] = useState(false)
  const [liveRooms, setLiveRooms] = useState<KplusLiveRoom[]>([])
  const [livePriceLoading, setLivePriceLoading] = useState(false)
  const [livePriceReady, setLivePriceReady] = useState(false)
  const [livePriceError, setLivePriceError] = useState(false)
  const [livePriceCheckedAt, setLivePriceCheckedAt] = useState<string | null>(null)

  const childPolicy = quoteProps.childPolicy ?? DEFAULT_HOTEL_CHILD_POLICY
  const adultsOnly = !childPolicy.childrenAllowed

  const setGuests = useCallback(
    (next: GuestsObject) => {
      if (adultsOnly) {
        setGuestsState({
          guestAdults: next.guestAdults ?? 2,
          guestChildren: 0,
          guestInfants: 0,
          childAges: [],
        })
        return
      }
      setGuestsState(normalizeGuestsWithChildAges(next))
    },
    [adultsOnly],
  )

  useEffect(() => {
    if (urlHydrated) return
    const { start, end } = parseStayListingDatesFromSearchParams(searchParams)
    if (start && end) {
      setRangeStart(start)
      setRangeEnd(end)
    }
    const fromUrl = parseStayListingGuestsFromSearchParams(searchParams)
    setGuestsState(
      adultsOnly
        ? { guestAdults: fromUrl.guestAdults ?? 2, guestChildren: 0, guestInfants: 0, childAges: [] }
        : normalizeGuestsWithChildAges(fromUrl),
    )
    setUrlHydrated(true)
  }, [searchParams, urlHydrated, adultsOnly])

  useEffect(() => {
    if (!adultsOnly) return
    setGuestsState((prev) =>
      prev.guestChildren || prev.guestInfants || (prev.childAges?.length ?? 0)
        ? { guestAdults: prev.guestAdults ?? 2, guestChildren: 0, guestInfants: 0, childAges: [] }
        : prev,
    )
  }, [adultsOnly])
  const [selectedRoomId, setSelectedRoomId] = useState('')
  const setSelectedRoomIdStable = useCallback((id: string) => setSelectedRoomId(id), [])
  const [selectedMealPlanId, setSelectedMealPlanId] = useState('')

  const selectedRoom = useMemo(
    () => (selectedRoomId ? rooms.find((r) => r.id === selectedRoomId) ?? null : null),
    [rooms, selectedRoomId],
  )

  // Tek oda tipi (ör. sentetik "Standart Oda") → otomatik seç. Aksi halde takvim
  // bölümündeki tek seçenekli <select> onChange tetiklemez, oda seçili kalmaz ve
  // tarih seçince alıntı modalı açılmaz ("takvimde seçilmiyor").
  const onlyRoomId = rooms.length === 1 ? rooms[0]!.id : null
  useEffect(() => {
    if (onlyRoomId) setSelectedRoomId((prev) => (prev ? prev : onlyRoomId))
  }, [onlyRoomId])

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

  useEffect(() => {
    if (!liveKplus || !rangeStart || !rangeEnd || rangeEnd <= rangeStart) {
      setLiveRooms([])
      setLivePriceReady(false)
      setLivePriceError(false)
      setLivePriceLoading(false)
      setLivePriceCheckedAt(null)
      return
    }

    let cancelled = false
    let controller: AbortController | null = null
    let intervalId: ReturnType<typeof setInterval> | null = null
    setLiveRooms([])
    setLivePriceReady(false)
    setLivePriceError(false)

    const refresh = async () => {
      controller?.abort()
      controller = new AbortController()
      setLivePriceLoading(true)
      setLivePriceError(false)
      try {
        const response = await fetch('/api/kplus/hotel-live', {
          method: 'POST',
          cache: 'no-store',
          headers: { 'Content-Type': 'application/json' },
          signal: controller.signal,
          body: JSON.stringify({
            listingId,
            checkIn: formatYmd(rangeStart),
            checkOut: formatYmd(rangeEnd),
            adults: Math.max(1, guests.guestAdults ?? 2),
            childAges: guests.childAges ?? [],
          }),
        })
        if (!response.ok) throw new Error(`kplus_live_${response.status}`)
        const data = (await response.json()) as {
          available?: boolean
          rooms?: KplusLiveRoom[]
          checkedAt?: string
        }
        if (cancelled) return
        setLiveRooms(Array.isArray(data.rooms) ? data.rooms : [])
        setLivePriceReady(true)
        setLivePriceError(false)
        setLivePriceCheckedAt(data.checkedAt ?? new Date().toISOString())
      } catch (error) {
        if (cancelled || (error instanceof DOMException && error.name === 'AbortError')) return
        setLiveRooms([])
        setLivePriceReady(false)
        setLivePriceError(true)
      } finally {
        if (!cancelled) setLivePriceLoading(false)
      }
    }

    const debounceId = setTimeout(() => {
      void refresh()
      intervalId = setInterval(() => void refresh(), 60_000)
    }, 500)

    return () => {
      cancelled = true
      clearTimeout(debounceId)
      if (intervalId) clearInterval(intervalId)
      controller?.abort()
    }
  }, [
    liveKplus,
    listingId,
    rangeStart,
    rangeEnd,
    guests.guestAdults,
    guests.guestChildren,
    guests.childAges,
  ])

  const liveRoomsByName = useMemo(
    () => new Map(liveRooms.map((room) => [liveRoomKey(room.name), room])),
    [liveRooms],
  )

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
    let base = 0
    if (cheapestPlan?.price_per_night && cheapestPlan.price_per_night > 0) {
      base = cheapestPlan.price_per_night
    } else if (quoteProps.ruleFallbackNightly && quoteProps.ruleFallbackNightly > 0) {
      base = quoteProps.ruleFallbackNightly
    } else if (quoteProps.priceAmount && quoteProps.priceAmount > 0) {
      base = quoteProps.priceAmount
    } else {
      const parsed = Number.parseInt((quoteProps.price ?? '').replace(/\D/g, '') || '0', 10)
      base = parsed > 0 ? parsed : 0
    }
    if (base > 0) return base
    // Arama kapısı / eksik price_from: oda seasonal veya oda-kapsamlı kurallardan min.
    return minHotelRoomOwnedNightly({
      rooms,
      priceRules,
      rangeStart,
      rangeEnd,
    })
  }, [cheapestPlan, quoteProps, rooms, priceRules, rangeStart, rangeEnd])

  const listingHasRoomScoped = useMemo(
    () => hotelListingHasRoomScopedPrices({ rooms, priceRules }),
    [rooms, priceRules],
  )

  const roomFallbackNightly = useCallback(
    (room: HotelRoomBookingOption) => {
      if (liveKplus && rangeStart && rangeEnd) {
        return liveRoomsByName.get(liveRoomKey(room.name))?.nightlyPrice ?? 0
      }
      return resolveHotelRoomFallbackNightly({
        roomId: room.id,
        roomName: room.name,
        metaJson: room.meta_json,
        rangeStart,
        rangeEnd,
        priceRules,
        listingFallbackNightly: fallbackNightly,
        listingHasRoomScopedPrices: listingHasRoomScoped,
      })
    },
    [liveKplus, liveRoomsByName, rangeStart, rangeEnd, priceRules, fallbackNightly, listingHasRoomScoped],
  )

  const resolveRoomNightlyForDay = useCallback(
    (room: HotelRoomBookingOption, ymd: string) => {
      if (liveKplus && rangeStart && rangeEnd) {
        return liveRoomsByName.get(liveRoomKey(room.name))?.nightlyPrice ?? null
      }
      return resolveHotelRoomNightlyForDay({
        ymd,
        roomName: room.name,
        metaJson: room.meta_json,
        priceRules,
        allowUnscopedRules: !listingHasRoomScoped,
      })
    },
    [liveKplus, liveRoomsByName, rangeStart, rangeEnd, priceRules, listingHasRoomScoped],
  )

  const selectedRoomFallbackNightly = useMemo(() => {
    if (!selectedRoom) return fallbackNightly
    return roomFallbackNightly(selectedRoom)
  }, [selectedRoom, roomFallbackNightly, fallbackNightly])

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
      setSelectedRoomId: setSelectedRoomIdStable,
      selectedRoom,
      selectedMealPlanId,
      setSelectedMealPlanId,
      isActivityDateInStay,
      activitySurchargeLines,
      activitySurchargesTotal,
      selectRoomAndScroll,
      scrollToReservation,
      fallbackNightly,
      selectedRoomFallbackNightly,
      priceRules,
      listingHasRoomScopedPrices: listingHasRoomScoped,
      roomFallbackNightly,
      resolveRoomNightlyForDay,
      currencyCode,
      childPolicy: adultsOnly ? ADULTS_ONLY_CHILD_POLICY : childPolicy,
      adultsOnly,
      liveKplus,
      livePriceLoading,
      livePriceReady,
      livePriceAvailable: liveRooms.length > 0,
      selectedLiveRoomAvailable: selectedRoom
        ? liveRoomsByName.has(liveRoomKey(selectedRoom.name))
        : false,
      livePriceError,
      livePriceCheckedAt,
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
      setGuests,
      selectedRoomId,
      selectedRoom,
      selectedMealPlanId,
      setSelectedRoomIdStable,
      isActivityDateInStay,
      activitySurchargeLines,
      activitySurchargesTotal,
      selectRoomAndScroll,
      scrollToReservation,
      fallbackNightly,
      selectedRoomFallbackNightly,
      priceRules,
      listingHasRoomScoped,
      roomFallbackNightly,
      resolveRoomNightlyForDay,
      currencyCode,
      childPolicy,
      adultsOnly,
      liveKplus,
      livePriceLoading,
      livePriceReady,
      liveRooms.length,
      liveRoomsByName,
      livePriceError,
      livePriceCheckedAt,
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
