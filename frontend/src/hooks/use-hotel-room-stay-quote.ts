'use client'

import { usePreferredCurrencyContext } from '@/contexts/preferred-currency-context'
import { convertAmountWithRates } from '@/lib/currency-convert'
import {
  computeHotelStayQuoteTotals,
  mealPlanDisplayLabel,
  pickActiveMealPlans,
  type HotelStayQuoteTotals,
} from '@/lib/hotel-stay-quote'
import {
  fetchPublicHotelRoomAvailabilityDaysSafe,
  getPublicHotelRoomAvailabilityCalendar,
} from '@/lib/hotel-room-availability-public'
import { formatLocalYmd } from '@/lib/date-format-local'
import type { HotelRoomBookingOption } from '@/lib/hotel-room-availability-public'
import { formatMoneyIntl } from '@/lib/parse-listing-price'
import type { HotelRoomAvailabilityDay, MealPlanItem } from '@/lib/travel-api'
import { useCallback, useEffect, useMemo, useState } from 'react'

export function useHotelRoomStayQuote({
  listingId,
  selectedRoom,
  rangeStart,
  rangeEnd,
  fallbackNightly,
  mealPlans,
  selectedMealPlanId,
  activitySurchargesTotal = 0,
  locale = 'tr',
  bookingUnitCount = 1,
}: {
  listingId: string
  selectedRoom: HotelRoomBookingOption | undefined
  rangeStart: Date | null
  rangeEnd: Date | null
  fallbackNightly: number
  mealPlans: MealPlanItem[]
  selectedMealPlanId?: string | null
  activitySurchargesTotal?: number
  locale?: string
  bookingUnitCount?: number
}) {
  const ctx = usePreferredCurrencyContext()
  const [days, setDays] = useState<Awaited<ReturnType<typeof fetchPublicHotelRoomAvailabilityDaysSafe>>>([])
  const [rawDays, setRawDays] = useState<HotelRoomAvailabilityDay[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!listingId.trim() || !selectedRoom?.id) {
      setDays([])
      setRawDays([])
      return
    }
    let cancelled = false
    setLoading(true)
    const from = new Date()
    from.setHours(0, 0, 0, 0)
    const to = new Date(from)
    to.setMonth(to.getMonth() + 18)
    const fromStr = formatLocalYmd(from)
    const toStr = formatLocalYmd(to)
    void Promise.all([
      fetchPublicHotelRoomAvailabilityDaysSafe(listingId, selectedRoom.id, selectedRoom.unit_count),
      getPublicHotelRoomAvailabilityCalendar(listingId, selectedRoom.id, { from: fromStr, to: toStr }),
    ])
      .then(([rows, raw]) => {
        if (!cancelled) {
          setDays(rows)
          setRawDays(raw.days ?? [])
        }
      })
      .catch(() => {
        if (!cancelled) {
          setDays([])
          setRawDays([])
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [listingId, selectedRoom?.id, selectedRoom?.unit_count])

  const activePlans = useMemo(() => pickActiveMealPlans(mealPlans), [mealPlans])

  const currencyCode = useMemo(() => {
    const plan =
      activePlans.find((p) => p.id === selectedMealPlanId) ??
      activePlans.find((p) => p.plan_code === 'room_only') ??
      activePlans[0]
    return (plan?.currency_code ?? 'TRY').trim().toUpperCase()
  }, [activePlans, selectedMealPlanId])

  const formatConverted = useCallback(
    (amount: number, fromCurrency?: string): string => {
      if (!Number.isFinite(amount) || amount <= 0) return '—'
      const from = (fromCurrency ?? currencyCode).trim().toUpperCase()
      const target = (ctx?.preferredCode ?? from).toUpperCase()
      const rates = ctx?.rates ?? []
      if (from === target || rates.length === 0) return formatMoneyIntl(amount, from)
      const c = convertAmountWithRates(amount, from, target, rates)
      return c != null ? formatMoneyIntl(c, target) : formatMoneyIntl(amount, from)
    },
    [ctx?.preferredCode, ctx?.rates, currencyCode],
  )

  const totals: HotelStayQuoteTotals = useMemo(() => {
    if (!rangeStart || !rangeEnd) {
      return {
        nights: 0,
        lodgingSubtotal: 0,
        mealPlanSupplement: 0,
        grandTotal: 0,
        available: true,
        selectedPlan: null,
        basePlan: null,
      }
    }
    return computeHotelStayQuoteTotals({
      days,
      rangeStart,
      rangeEnd,
      fallbackNightly,
      mealPlans,
      selectedMealPlanId,
      roomBoardType: selectedRoom?.board_type,
      activitySurchargesTotal,
      bookingUnitCount,
      rawAvailabilityDays: rawDays,
      inventoryDefault: selectedRoom?.unit_count,
    })
  }, [
    days,
    rawDays,
    rangeStart,
    rangeEnd,
    fallbackNightly,
    mealPlans,
    selectedMealPlanId,
    selectedRoom?.board_type,
    selectedRoom?.unit_count,
    activitySurchargesTotal,
    bookingUnitCount,
  ])

  const displayMainPrice = useMemo(() => {
    if (rangeStart && rangeEnd && totals.nights > 0 && totals.grandTotal > 0) {
      return formatConverted(totals.grandTotal, currencyCode)
    }
    if (fallbackNightly > 0) return formatConverted(fallbackNightly, currencyCode)
    const plan = activePlans[0]
    if (plan?.price_per_night) return formatConverted(plan.price_per_night, plan.currency_code)
    return '—'
  }, [
    rangeStart,
    rangeEnd,
    totals.grandTotal,
    totals.nights,
    fallbackNightly,
    activePlans,
    formatConverted,
    currencyCode,
  ])

  const selectedPlanLabel = totals.selectedPlan
    ? mealPlanDisplayLabel(totals.selectedPlan, locale)
    : null

  return {
    ...totals,
    loading,
    currencyCode,
    activePlans,
    formatConverted,
    displayMainPrice,
    selectedPlanLabel,
    availLoading: loading,
  }
}
