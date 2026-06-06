import type { TListingHolidayHome } from '@/types/listing-types'

/** `listing.capacitySpec` ile hizalı — kartta "N misafir M oda B banyo" */
export type HolidayHomeCapacityCopy = {
  guests: string
  rooms: string
  bathrooms: string
  cabins?: string
}

/** Tatil evi veya yat — kabin/oda etiketi seçilebilir. */
export function stayRentalCapacitySummary(
  d: Partial<Pick<TListingHolidayHome, 'maxGuests' | 'bedrooms' | 'bathrooms'>>,
  copy: HolidayHomeCapacityCopy,
  { useCabins = false, alwaysShow = true }: { useCabins?: boolean; alwaysShow?: boolean } = {},
): string | null {
  const roomLabel = useCabins && copy.cabins ? copy.cabins : copy.rooms
  const { maxGuests, bedrooms, bathrooms } = d
  const g = maxGuests != null && maxGuests > 0 ? String(maxGuests) : '—'
  const r = bedrooms != null && bedrooms > 0 ? String(bedrooms) : '—'
  const b = bathrooms != null && bathrooms > 0 ? String(bathrooms) : '—'
  if (alwaysShow) {
    return `${g} ${copy.guests} · ${r} ${roomLabel} · ${b} ${copy.bathrooms}`
  }
  const parts: string[] = []
  if (maxGuests != null && maxGuests > 0) parts.push(`${maxGuests} ${copy.guests}`)
  if (bedrooms != null && bedrooms > 0) parts.push(`${bedrooms} ${roomLabel}`)
  if (bathrooms != null && bathrooms > 0) parts.push(`${bathrooms} ${copy.bathrooms}`)
  return parts.length > 0 ? parts.join(' ') : null
}

/**
 * Tatil evi liste / harita kartları: misafir, oda, banyo.
 * `alwaysShow`: vitrinde üç değeri de göster (eksik olanlar — ile).
 */
export function holidayHomeCapacitySummary(
  d: Partial<Pick<TListingHolidayHome, 'maxGuests' | 'bedrooms' | 'bathrooms'>>,
  copy: HolidayHomeCapacityCopy,
  alwaysShow = true,
): string | null {
  const { maxGuests, bedrooms, bathrooms } = d
  const g = maxGuests != null && maxGuests > 0 ? String(maxGuests) : '—'
  const r = bedrooms != null && bedrooms > 0 ? String(bedrooms) : '—'
  const b = bathrooms != null && bathrooms > 0 ? String(bathrooms) : '—'
  if (alwaysShow) {
    return `${g} ${copy.guests} · ${r} ${copy.rooms} · ${b} ${copy.bathrooms}`
  }
  const parts: string[] = []
  if (maxGuests != null && maxGuests > 0) parts.push(`${maxGuests} ${copy.guests}`)
  if (bedrooms != null && bedrooms > 0) parts.push(`${bedrooms} ${copy.rooms}`)
  if (bathrooms != null && bathrooms > 0) parts.push(`${bathrooms} ${copy.bathrooms}`)
  return parts.length > 0 ? parts.join(' ') : null
}
