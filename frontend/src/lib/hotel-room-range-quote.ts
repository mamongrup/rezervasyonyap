import { diffStayNights } from '@/hooks/use-stay-listing-quote'
import { listingDayOpenForStayNight } from '@/lib/listing-availability-day'
import { formatLocalYmd } from '@/lib/date-format-local'
import type { ListingAvailabilityDay } from '@/lib/travel-api'

export function parseHotelRoomNightlyPrice(raw: string | null | undefined): number | null {
  if (!raw?.trim()) return null
  const normalized = raw.trim().replace(/\s/g, '').replace(',', '.')
  const n = Number.parseFloat(normalized.replace(/[^\d.]/g, ''))
  return Number.isFinite(n) && n > 0 ? n : null
}

/** Seçili aralıktaki gecelik fiyatları toplar (çıkış günü hariç). */
export function computeHotelRoomStayQuote(
  days: readonly ListingAvailabilityDay[],
  rangeStart: Date,
  rangeEnd: Date,
  fallbackNightly: number,
): { nights: number; total: number; available: boolean } {
  const nights = diffStayNights(rangeStart, rangeEnd)
  if (nights <= 0) return { nights: 0, total: 0, available: false }

  const byDay = new Map(days.map((d) => [d.day.trim(), d]))
  let total = 0
  let available = true

  const start = new Date(rangeStart)
  start.setHours(0, 0, 0, 0)
  const cursor = new Date(start)
  const end = new Date(rangeEnd)
  end.setHours(0, 0, 0, 0)

  let nightIndex = 0
  while (cursor < end) {
    const ymd = formatLocalYmd(cursor)
    const hit = byDay.get(ymd)
    if (!listingDayOpenForStayNight(hit, nightIndex)) available = false
    nightIndex++
    const nightly = parseHotelRoomNightlyPrice(hit?.price_override) ?? fallbackNightly
    total += nightly > 0 ? nightly : 0
    cursor.setDate(cursor.getDate() + 1)
  }

  return { nights, total, available }
}
