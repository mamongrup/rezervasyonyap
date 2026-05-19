import type { ListingAvailabilityDay, ListingAvailabilityDayStatus } from '@/lib/travel-api'

/** Takvim hücresi: öğleden önce / sonra müsaitlik (API’de yoksa tam gün `is_available`) */
export function listingDayAmPm(row: ListingAvailabilityDay | undefined): {
  am: boolean
  pm: boolean
} {
  if (!row) return { am: true, pm: true }
  return {
    am: row.am_available ?? row.is_available,
    pm: row.pm_available ?? row.is_available,
  }
}

export function normalizeListingDayStatus(
  raw: string | null | undefined,
): ListingAvailabilityDayStatus | null {
  const s = String(raw ?? '').trim().toLowerCase()
  if (s === 'option' || s === 'promo') return s
  return null
}

/** Vitrin takvim hücresi görsel durumu */
export type ListingDayVisualStatus = 'available' | 'blocked' | 'option' | 'promo'

export function listingDayVisualStatus(row: ListingAvailabilityDay | undefined): ListingDayVisualStatus {
  const st = normalizeListingDayStatus(row?.day_status ?? null)
  if (st === 'option') return 'option'
  if (st === 'promo') return 'promo'
  const { am, pm } = listingDayAmPm(row)
  if (!am && !pm) return 'blocked'
  return 'available'
}

/** Gün tamamen dolu veya opsiyon (seçilemez) */
export function isListingDayFullyBlocked(row: ListingAvailabilityDay | undefined): boolean {
  if (normalizeListingDayStatus(row?.day_status ?? null) === 'option') return true
  const { am, pm } = listingDayAmPm(row)
  return !am && !pm
}

/** En az bir yarım açıksa ve opsiyon değilse tarih seçilebilir */
export function isListingDayPartiallyOrFullyFree(row: ListingAvailabilityDay | undefined): boolean {
  if (isListingDayFullyBlocked(row)) return false
  const { am, pm } = listingDayAmPm(row)
  return am || pm
}
