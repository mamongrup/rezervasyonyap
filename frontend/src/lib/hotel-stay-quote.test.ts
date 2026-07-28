import { describe, expect, it } from 'vitest'
import {
  computeHotelStayQuoteTotals,
  computeMealPlanSupplement,
  pickDefaultMealPlanForRoom,
  pickRoomOnlyMealPlan,
} from '@/lib/hotel-stay-quote'
import type { MealPlanItem } from '@/lib/travel-api'

const plans: MealPlanItem[] = [
  {
    id: 'p-ro',
    plan_code: 'room_only',
    label: 'Sadece oda',
    label_en: 'Room only',
    included_meals: [],
    included_extras: [],
    price_per_night: 100,
    currency_code: 'TRY',
    is_active: true,
    sort_order: 0,
  },
  {
    id: 'p-bb',
    plan_code: 'bed_breakfast',
    label: 'Oda + Kahvaltı',
    label_en: 'B&B',
    included_meals: [],
    included_extras: [],
    price_per_night: 130,
    currency_code: 'TRY',
    is_active: true,
    sort_order: 1,
  },
]

describe('hotel-stay-quote', () => {
  it('computes meal plan supplement above room_only', () => {
    expect(computeMealPlanSupplement(plans[1]!, plans[0]!, 3)).toBe(90)
  })

  it('picks board-matching default meal plan', () => {
    const picked = pickDefaultMealPlanForRoom(plans, 'bed_breakfast')
    expect(picked?.id).toBe('p-bb')
  })

  it('sums calendar nights and supplement', () => {
    const start = new Date(2026, 6, 1, 12, 0, 0)
    const end = new Date(2026, 6, 4, 12, 0, 0)
    const totals = computeHotelStayQuoteTotals({
      days: [
        { day: '2026-07-01', is_available: true, am_available: true, pm_available: true, price_override: '200', day_status: null },
        { day: '2026-07-02', is_available: true, am_available: true, pm_available: true, price_override: '200', day_status: null },
        { day: '2026-07-03', is_available: true, am_available: true, pm_available: true, price_override: '200', day_status: null },
      ],
      rangeStart: start,
      rangeEnd: end,
      fallbackNightly: 100,
      mealPlans: plans,
      selectedMealPlanId: 'p-bb',
      roomBoardType: 'bed_breakfast',
    })
    expect(totals.nights).toBe(3)
    expect(totals.lodgingSubtotal).toBe(600)
    expect(totals.mealPlanSupplement).toBe(90)
    expect(totals.childSurchargeTotal).toBe(0)
    expect(totals.grandTotal).toBe(690)
    expect(pickRoomOnlyMealPlan(plans)?.id).toBe('p-ro')
  })

  it('adds child occupancy surcharge for chargeable ages', () => {
    const start = new Date(2026, 6, 1, 12, 0, 0)
    const end = new Date(2026, 6, 3, 12, 0, 0)
    const totals = computeHotelStayQuoteTotals({
      days: [
        { day: '2026-07-01', is_available: true, am_available: true, pm_available: true, price_override: '200', day_status: null },
        { day: '2026-07-02', is_available: true, am_available: true, pm_available: true, price_override: '200', day_status: null },
      ],
      rangeStart: start,
      rangeEnd: end,
      fallbackNightly: 200,
      mealPlans: plans,
      selectedMealPlanId: 'p-ro',
      childAges: [4, 8],
      childPolicy: {
        freeMaxAge: 6,
        chargePercent: 50,
        infantsFree: true,
        childrenAllowed: true,
        chargeMaxAge: 12,
      },
    })
    // nightly 200 → adult share 100 → charged child 50/night × 2 nights = 100
    expect(totals.childSurchargeTotal).toBe(100)
    expect(totals.grandTotal).toBe(400 + 100)
  })
})
