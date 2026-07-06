/** Oda / kabin kapasitesine göre gereken birim sayısı (2 kişilik oda + 3 misafir → 2). */
export function requiredAccommodationUnits(
  guestCount: number,
  capacityPerUnit: number | null | undefined,
): number {
  const guests = Math.max(1, guestCount)
  const cap =
    capacityPerUnit != null && Number.isFinite(capacityPerUnit) && capacityPerUnit > 0
      ? capacityPerUnit
      : guests
  return Math.max(1, Math.ceil(guests / cap))
}

export function parseHotelRoomCapacity(capacity: string | number | null | undefined): number | null {
  if (capacity == null || capacity === '') return null
  const n = typeof capacity === 'number' ? capacity : Number.parseInt(String(capacity).trim(), 10)
  return Number.isFinite(n) && n > 0 ? n : null
}

/** Otel odası kapasitesi yoksa çift kişilik varsayılır. */
export function hotelRoomCapacityOrDefault(capacity: string | number | null | undefined): number {
  return parseHotelRoomCapacity(capacity) ?? 2
}

/** Gemi kabini — çift kişilik fiyatlandırma; kapasite alanı yok. */
export const DEFAULT_CRUISE_CABIN_CAPACITY = 2
