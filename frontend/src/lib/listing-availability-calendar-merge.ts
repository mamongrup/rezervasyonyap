import { normalizeListingDayStatus } from '@/lib/listing-availability-day'
import type { ListingAvailabilityDay, ListingAvailabilityDayStatus } from '@/lib/travel-api'

/** `mergeCalendarRows` çıktısı — panel takvim tablosu / hub grid ile uyumlu */
export type MergedCalendarRow = {
  day: string
  is_available: boolean
  am_available: boolean
  pm_available: boolean
  price_override: string
  weekday: number
  day_status: ListingAvailabilityDayStatus | null
}

/** ISO gün aralığı için API günlerini dolu bir sıraya çevirir (her gün bir satır). */
export function mergeCalendarRows(
  from: string,
  to: string,
  apiDays: ListingAvailabilityDay[],
): MergedCalendarRow[] {
  const map = new Map(apiDays.map((x) => [x.day, x]))
  const out: MergedCalendarRow[] = []
  let cur = new Date(from + 'T12:00:00')
  const end = new Date(to + 'T12:00:00')
  while (cur <= end) {
    const key = cur.toISOString().slice(0, 10)
    const ex = map.get(key)
    const am = ex?.am_available ?? ex?.is_available ?? true
    const pm = ex?.pm_available ?? ex?.is_available ?? true
    const ia = ex
      ? ex.is_available === true || am || pm
      : true
    out.push({
      day: key,
      weekday: cur.getDay(),
      is_available: ia,
      am_available: am,
      pm_available: pm,
      price_override: ex?.price_override ?? '',
      day_status: normalizeListingDayStatus(ex?.day_status ?? null),
    })
    cur.setDate(cur.getDate() + 1)
  }
  return out
}
