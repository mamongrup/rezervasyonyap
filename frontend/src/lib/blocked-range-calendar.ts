import type { ListingAvailabilityDay } from '@/lib/travel-api'

export type ExpandedBlockedRange = {
  days: string[]
  includesStartBoundary?: boolean
  includesEndBoundary?: boolean
  singleDayClosure?: boolean
}

const DAY_MS = 86_400_000

function ymd(date: Date): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`
}

function parseYmd(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value || '').trim())
  if (!match) return null
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])))
  return Number.isNaN(date.getTime()) || ymd(date) !== match[0] ? null : date
}

/**
 * Kaynak sayfalarin dolu araliklari gece bazlidir ve `to` tarihi son dolu
 * gecedir. Takvimde cikis sabahini gosterebilmek icin araliga bir sonraki gunu
 * checkout siniri olarak ekler.
 */
export function expandSourceBlockedNightRange(
  from: string,
  to: string,
  windowFrom: string,
  windowTo: string,
): ExpandedBlockedRange | null {
  const rawStart = parseYmd(from)
  const rawEnd = parseYmd(to || from)
  const windowStart = parseYmd(windowFrom)
  const windowEnd = parseYmd(windowTo)
  if (!rawStart || !rawEnd || !windowStart || !windowEnd) return null

  const start = rawStart.getTime() <= rawEnd.getTime() ? rawStart : rawEnd
  const lastNight = rawStart.getTime() <= rawEnd.getTime() ? rawEnd : rawStart
  const checkout = new Date(lastNight.getTime() + DAY_MS)
  const days: string[] = []

  for (let time = start.getTime(); time <= checkout.getTime(); time += DAY_MS) {
    if (time < windowStart.getTime() || time > windowEnd.getTime()) continue
    days.push(ymd(new Date(time)))
    if (days.length > 401) break
  }
  if (days.length === 0) return null

  return {
    days,
    includesStartBoundary: days[0] === ymd(start),
    includesEndBoundary: days.at(-1) === ymd(checkout),
    // Tek dolu gece de iki takvim gunune yayilan giris/cikis araligidir.
    singleDayClosure: false,
  }
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
