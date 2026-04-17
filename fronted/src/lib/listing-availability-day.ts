import type { ListingAvailabilityDay } from '@/lib/travel-api'

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

/** Gün tamamen dolu (seçilemez) — her iki yarım da kapalı */
export function isListingDayFullyBlocked(row: ListingAvailabilityDay | undefined): boolean {
  const { am, pm } = listingDayAmPm(row)
  return !am && !pm
}

/** En az bir yarım açıksa tarih seçilebilir */
export function isListingDayPartiallyOrFullyFree(row: ListingAvailabilityDay | undefined): boolean {
  const { am, pm } = listingDayAmPm(row)
  return am || pm
}
