import type { ListingAvailabilityDay } from '@/lib/travel-api'

export type ExpandedBlockedRange = {
  days: string[]
  includesStartBoundary?: boolean
  includesEndBoundary?: boolean
  singleDayClosure?: boolean
}

/**
 * Kaynaktan gelen dolu gece araliklarini yarim gun giris/cikis sinirlarina cevirir.
 *
 * Birden fazla rezervasyon ayni gunde bitip baslarsa iki yarim da dolu olur; ancak
 * `is_available=true` turnover isaretini korur. Vitrin bu durumu ayni gun cikis ve
 * giris olarak cizer. Tek gunluk bloklarin bakim/kapama olma ihtimali nedeniyle
 * onlar tam gun kapali kalir.
 */
export function buildBlockedRangeCalendarDays(
  ranges: ExpandedBlockedRange[],
  existingDays: ListingAvailabilityDay[] = [],
): ListingAvailabilityDay[] {
  const existingByDay = new Map(existingDays.map((day) => [day.day.trim(), day]))
  const stateByDay = new Map<
    string,
    { blockAm: boolean; blockPm: boolean; checkinBoundary: boolean; checkoutBoundary: boolean }
  >()

  for (const range of ranges) {
    const days = [...new Set(range.days.map((day) => day.trim()).filter(Boolean))].sort()
    if (days.length === 0) continue
    const includesStartBoundary = range.includesStartBoundary !== false
    const includesEndBoundary = range.includesEndBoundary !== false
    const singleDayClosure =
      range.singleDayClosure ?? (days.length === 1 && includesStartBoundary && includesEndBoundary)

    for (let index = 0; index < days.length; index += 1) {
      const day = days[index]
      const state = stateByDay.get(day) ?? {
        blockAm: false,
        blockPm: false,
        checkinBoundary: false,
        checkoutBoundary: false,
      }

      const isCheckinBoundary = index === 0 && includesStartBoundary
      const isCheckoutBoundary = index === days.length - 1 && includesEndBoundary
      if (singleDayClosure) {
        state.blockAm = true
        state.blockPm = true
      } else {
        state.blockAm ||= !isCheckinBoundary
        state.blockPm ||= !isCheckoutBoundary
      }
      if (isCheckinBoundary && !singleDayClosure) {
        state.checkinBoundary = true
      }
      if (isCheckoutBoundary && !singleDayClosure) {
        state.checkoutBoundary = true
      }
      stateByDay.set(day, state)
    }
  }

  return [...stateByDay.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([day, state]) => {
      const amAvailable = !state.blockAm
      const pmAvailable = !state.blockPm
      const turnover =
        !amAvailable && !pmAvailable && state.checkinBoundary && state.checkoutBoundary
      const existing = existingByDay.get(day)
      return {
        day,
        is_available: amAvailable || pmAvailable || turnover,
        am_available: amAvailable,
        pm_available: pmAvailable,
        price_override: existing?.price_override?.trim() ?? '',
        day_status: existing?.day_status ?? null,
      }
    })
}
