import { diffStayNights } from '@/hooks/use-stay-listing-quote'
import { listingDayOpenForStayNight } from '@/lib/listing-availability-day'
import { formatLocalYmd } from '@/lib/date-format-local'
import type { HotelRoomAvailabilityDay, ListingAvailabilityDay } from '@/lib/travel-api'

export type HotelRoomNightlyResolver = (ymd: string) => number | null

export function parseHotelRoomNightlyPrice(raw: string | null | undefined): number | null {
  if (!raw?.trim()) return null
  const normalized = raw.trim().replace(/\s/g, '').replace(',', '.')
  const n = Number.parseFloat(normalized.replace(/[^\d.]/g, ''))
  return Number.isFinite(n) && n > 0 ? n : null
}

function resolveNightlyForStayDay(
  priceOverride: string | null | undefined,
  ymd: string,
  fallbackNightly: number,
  resolveRoomNightly?: HotelRoomNightlyResolver | null,
): number {
  const fromCalendar = parseHotelRoomNightlyPrice(priceOverride)
  if (fromCalendar != null) return fromCalendar
  const fromRoom = resolveRoomNightly?.(ymd) ?? null
  if (fromRoom != null && fromRoom > 0) return fromRoom
  return fallbackNightly > 0 ? fallbackNightly : 0
}

/** Seçili aralıktaki gecelik fiyatları toplar (çıkış günü hariç). */
export function computeHotelRoomStayQuote(
  days: readonly ListingAvailabilityDay[],
  rangeStart: Date,
  rangeEnd: Date,
  fallbackNightly: number,
  resolveRoomNightly?: HotelRoomNightlyResolver | null,
): { nights: number; total: number; available: boolean } {
  const nights = diffStayNights(rangeStart, rangeEnd)
  if (nights <= 0) return { nights: 0, total: 0, available: false }

  const byDay = new Map(days.map((d) => [d.day.trim(), d]))
  let total = 0
  let available = true
  let pricedNights = 0

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
    const nightly = resolveNightlyForStayDay(
      hit?.price_override,
      ymd,
      fallbackNightly,
      resolveRoomNightly,
    )
    if (nightly > 0) {
      total += nightly
      pricedNights++
    }
    cursor.setDate(cursor.getDate() + 1)
  }

  // Oda fiyatı eksik geceler varsa toplamı göstermeyiz (ilan min kopyası yanılgısı).
  if (pricedNights < nights) {
    return { nights, total: 0, available }
  }

  return { nights, total, available }
}

function nightAvailableUnits(
  hit: HotelRoomAvailabilityDay | undefined,
  inventoryDefault: number,
): number {
  return hit?.available_units ?? inventoryDefault
}

/** Ham takvim — gecelik müsait oda sayısı ve fiyat (çoklu oda rezervasyonu). */
export function computeHotelRoomStayQuoteFromRaw(
  apiDays: readonly HotelRoomAvailabilityDay[],
  rangeStart: Date,
  rangeEnd: Date,
  fallbackNightly: number,
  inventoryDefault: number,
  requiredUnits: number = 1,
  resolveRoomNightly?: HotelRoomNightlyResolver | null,
): { nights: number; total: number; available: boolean } {
  const nights = diffStayNights(rangeStart, rangeEnd)
  const unitsNeeded = Math.max(1, requiredUnits)
  const stock = Math.max(1, inventoryDefault)
  if (nights <= 0) return { nights: 0, total: 0, available: false }

  const byDay = new Map(apiDays.map((d) => [d.day.trim(), d]))
  let total = 0
  let available = true
  let pricedNights = 0

  const start = new Date(rangeStart)
  start.setHours(0, 0, 0, 0)
  const cursor = new Date(start)
  const end = new Date(rangeEnd)
  end.setHours(0, 0, 0, 0)

  while (cursor < end) {
    const ymd = formatLocalYmd(cursor)
    const hit = byDay.get(ymd)
    const units = nightAvailableUnits(hit, stock)
    if (units < unitsNeeded) available = false
    const nightly = resolveNightlyForStayDay(
      hit?.price_override,
      ymd,
      fallbackNightly,
      resolveRoomNightly,
    )
    if (nightly > 0) {
      total += nightly
      pricedNights++
    }
    cursor.setDate(cursor.getDate() + 1)
  }

  if (pricedNights < nights) {
    return { nights, total: 0, available }
  }

  return { nights, total, available }
}
