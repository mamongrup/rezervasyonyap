import { diffStayNights } from '@/hooks/use-stay-listing-quote'
import { computeHotelRoomStayQuote, computeHotelRoomStayQuoteFromRaw } from '@/lib/hotel-room-range-quote'
import type { HotelRoomAvailabilityDay, ListingAvailabilityDay, MealPlanItem } from '@/lib/travel-api'

export function pickActiveMealPlans(mealPlans: MealPlanItem[]): MealPlanItem[] {
  return mealPlans.filter((p) => p.is_active).sort((a, b) => a.sort_order - b.sort_order)
}

export function pickRoomOnlyMealPlan(activePlans: MealPlanItem[]): MealPlanItem | null {
  const roomOnly = activePlans.find((p) => p.plan_code === 'room_only')
  if (roomOnly) return roomOnly
  if (activePlans.length === 0) return null
  return activePlans.reduce((min, p) => (p.price_per_night < min.price_per_night ? p : min))
}

export function pickDefaultMealPlanForRoom(
  activePlans: MealPlanItem[],
  roomBoardType: string | null | undefined,
): MealPlanItem | null {
  if (activePlans.length === 0) return null
  const board = roomBoardType?.trim().toLowerCase().replace(/\s+/g, '_').replace(/-/g, '_')
  if (board) {
    const match = activePlans.find((p) => {
      const code = p.plan_code?.trim().toLowerCase()
      return code === board || code?.replace(/_/g, '') === board.replace(/_/g, '')
    })
    if (match) return match
  }
  return pickRoomOnlyMealPlan(activePlans) ?? activePlans[0]!
}

export function resolveSelectedMealPlan(
  activePlans: MealPlanItem[],
  selectedMealPlanId: string | null | undefined,
  roomBoardType: string | null | undefined,
): MealPlanItem | null {
  if (selectedMealPlanId?.trim()) {
    const hit = activePlans.find((p) => p.id === selectedMealPlanId.trim())
    if (hit) return hit
  }
  return pickDefaultMealPlanForRoom(activePlans, roomBoardType)
}

/** Pansiyon farkı — takvim fiyatı oda bazlı; seçilen plan room_only'dan pahalıysa gece başına eklenir. */
export function computeMealPlanSupplement(
  selectedPlan: MealPlanItem | null,
  basePlan: MealPlanItem | null,
  nights: number,
): number {
  if (!selectedPlan || nights <= 0) return 0
  const base = basePlan?.price_per_night ?? 0
  const diff = selectedPlan.price_per_night - base
  return diff > 0.009 ? diff * nights : 0
}

export function mealPlanDisplayLabel(plan: MealPlanItem, locale: string): string {
  const lc = locale.trim().toLowerCase()
  if (lc === 'en' && plan.label_en?.trim()) return plan.label_en.trim()
  if (plan.label?.trim()) return plan.label.trim()
  return plan.plan_code
}

export type HotelStayQuoteTotals = {
  nights: number
  lodgingSubtotal: number
  mealPlanSupplement: number
  grandTotal: number
  available: boolean
  selectedPlan: MealPlanItem | null
  basePlan: MealPlanItem | null
}

export function computeHotelStayQuoteTotals(input: {
  days: readonly ListingAvailabilityDay[]
  rangeStart: Date
  rangeEnd: Date
  fallbackNightly: number
  mealPlans: MealPlanItem[]
  selectedMealPlanId?: string | null
  roomBoardType?: string | null
  activitySurchargesTotal?: number
  bookingUnitCount?: number
  rawAvailabilityDays?: readonly HotelRoomAvailabilityDay[]
  inventoryDefault?: number
}): HotelStayQuoteTotals {
  const nights = diffStayNights(input.rangeStart, input.rangeEnd)
  const activePlans = pickActiveMealPlans(input.mealPlans)
  const basePlan = pickRoomOnlyMealPlan(activePlans)
  const selectedPlan = resolveSelectedMealPlan(
    activePlans,
    input.selectedMealPlanId,
    input.roomBoardType,
  )

  const units = Math.max(1, input.bookingUnitCount ?? 1)
  const roomQuote =
    input.rawAvailabilityDays && input.inventoryDefault != null
      ? computeHotelRoomStayQuoteFromRaw(
          input.rawAvailabilityDays,
          input.rangeStart,
          input.rangeEnd,
          input.fallbackNightly,
          input.inventoryDefault,
          units,
        )
      : computeHotelRoomStayQuote(
          input.days,
          input.rangeStart,
          input.rangeEnd,
          input.fallbackNightly,
        )

  const mealPlanSupplement = computeMealPlanSupplement(selectedPlan, basePlan, roomQuote.nights)
  const lodgingSubtotal = roomQuote.total * units
  const activity = input.activitySurchargesTotal ?? 0
  const perRoomLodgingMeal = roomQuote.total + mealPlanSupplement
  const grandTotal =
    perRoomLodgingMeal > 0 && roomQuote.available
      ? perRoomLodgingMeal * units + activity
      : 0

  return {
    nights: roomQuote.nights,
    lodgingSubtotal,
    mealPlanSupplement: mealPlanSupplement * units,
    grandTotal,
    available: roomQuote.available,
    selectedPlan,
    basePlan,
  }
}

/** Sepet satırı — oda başına konaklama + pansiyon; etkinlik ücreti oda sayısına bölünür. */
export function hotelPerRoomCartUnitPrice(
  totals: HotelStayQuoteTotals,
  bookingUnitCount: number,
  activitySurchargesTotal = 0,
): number {
  const units = Math.max(1, bookingUnitCount)
  if (totals.nights <= 0) return 0
  const lodgingMeal = totals.lodgingSubtotal + totals.mealPlanSupplement
  if (lodgingMeal <= 0) return 0
  return lodgingMeal / units + Math.max(0, activitySurchargesTotal) / units
}
