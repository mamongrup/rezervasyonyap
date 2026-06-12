import { formatLocalYmd } from '@/lib/date-format-local'
import { diffStayNights } from '@/hooks/use-stay-listing-quote'
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

  const cursor = new Date(rangeStart)
  cursor.setHours(0, 0, 0, 0)
  const end = new Date(rangeEnd)
  end.setHours(0, 0, 0, 0)

  while (cursor < end) {
    const ymd = formatLocalYmd(cursor)
    const hit = byDay.get(ymd)
    if (hit && hit.is_available === false) available = false
    const nightly = parseHotelRoomNightlyPrice(hit?.price_override) ?? fallbackNightly
    total += nightly > 0 ? nightly : 0
    cursor.setDate(cursor.getDate() + 1)
  }

  return { nights, total, available }
}
