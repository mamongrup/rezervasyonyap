import { diffStayNights } from '@/hooks/use-stay-listing-quote'
import { computeHotelRoomStayQuote } from '@/lib/hotel-room-range-quote'
import type { ListingAvailabilityDay, MealPlanItem } from '@/lib/travel-api'

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
}): HotelStayQuoteTotals {
  const nights = diffStayNights(input.rangeStart, input.rangeEnd)
  const activePlans = pickActiveMealPlans(input.mealPlans)
  const basePlan = pickRoomOnlyMealPlan(activePlans)
  const selectedPlan = resolveSelectedMealPlan(
    activePlans,
    input.selectedMealPlanId,
    input.roomBoardType,
  )

  const roomQuote = computeHotelRoomStayQuote(
    input.days,
    input.rangeStart,
    input.rangeEnd,
    input.fallbackNightly,
  )

  const mealPlanSupplement = computeMealPlanSupplement(selectedPlan, basePlan, roomQuote.nights)
  const lodgingSubtotal = roomQuote.total
  const activity = input.activitySurchargesTotal ?? 0
  const grandTotal =
    lodgingSubtotal > 0 && roomQuote.available
      ? lodgingSubtotal + mealPlanSupplement + activity
      : 0

  return {
    nights: roomQuote.nights,
    lodgingSubtotal,
    mealPlanSupplement,
    grandTotal,
    available: roomQuote.available,
    selectedPlan,
    basePlan,
  }
}
