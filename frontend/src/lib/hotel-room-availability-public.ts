import { formatLocalYmd } from '@/lib/date-format-local'
import type { HotelRoomAvailabilityDay, ListingAvailabilityDay, PublicHotelRoom } from '@/lib/travel-api'

const API = () => (process.env.NEXT_PUBLIC_API_URL ?? '').replace(/\/$/, '')

/** Oda müsaitlik günlerini vitrin takvim formatına çevirir (available_units > 0 → müsait). */
export function roomAvailabilityToListingDays(
  apiDays: HotelRoomAvailabilityDay[],
  unitCount: number,
  from: string,
  to: string,
): ListingAvailabilityDay[] {
  const byDay = new Map(apiDays.map((d) => [d.day.trim(), d]))
  const rows: ListingAvailabilityDay[] = []
  const start = new Date(`${from}T12:00:00`)
  const end = new Date(`${to}T12:00:00`)
  const defaultUnits = Math.max(1, unitCount)
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const day = formatLocalYmd(d)
    const hit = byDay.get(day)
    const units = hit?.available_units ?? defaultUnits
    const available = units > 0
    rows.push({
      day,
      is_available: available,
      am_available: available,
      pm_available: available,
      price_override: hit?.price_override ?? null,
      day_status: null,
    })
  }
  return rows
}

export async function getPublicHotelRoomAvailabilityCalendar(
  listingId: string,
  roomId: string,
  range: { from: string; to: string },
): Promise<{ days: HotelRoomAvailabilityDay[] }> {
  const b = API()
  if (!b) return { days: [] }
  const u = new URLSearchParams({ from: range.from, to: range.to })
  const res = await fetch(
    `${b}/api/v1/catalog/public/listings/${encodeURIComponent(listingId)}/hotel-rooms/${encodeURIComponent(roomId)}/availability-calendar?${u.toString()}`,
    { cache: 'no-store' },
  )
  if (!res.ok) return { days: [] }
  const data = (await res.json()) as { days?: HotelRoomAvailabilityDay[] }
  return { days: Array.isArray(data.days) ? data.days : [] }
}

export async function fetchPublicHotelRoomAvailabilityDaysSafe(
  listingId: string,
  roomId: string,
  unitCount: number,
): Promise<ListingAvailabilityDay[]> {
  if (!listingId.trim() || !roomId.trim()) return []
  const from = new Date()
  from.setHours(0, 0, 0, 0)
  const to = new Date(from)
  to.setMonth(to.getMonth() + 18)
  const fromStr = formatLocalYmd(from)
  const toStr = formatLocalYmd(to)
  const res = await getPublicHotelRoomAvailabilityCalendar(listingId, roomId, {
    from: fromStr,
    to: toStr,
  })
  return roomAvailabilityToListingDays(res.days ?? [], unitCount, fromStr, toStr)
}

export type HotelRoomBookingOption = PublicHotelRoom & { unit_count: number }

export function normalizeHotelRoomOptions(rooms: PublicHotelRoom[]): HotelRoomBookingOption[] {
  return rooms.map((r) => ({
    ...r,
    unit_count: Math.max(1, r.unit_count ?? 1),
  }))
}
