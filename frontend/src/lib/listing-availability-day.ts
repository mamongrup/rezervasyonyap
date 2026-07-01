import type { ListingAvailabilityDay, ListingAvailabilityDayStatus } from '@/lib/travel-api'

/** Takvim hücresi: öğleden önce / sonra müsaitlik (API'de yoksa tam gün `is_available`) */
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
export type ListingDayVisualStatus = 'available' | 'blocked' | 'turnover' | 'option' | 'promo'

export function listingDayVisualStatus(row: ListingAvailabilityDay | undefined): ListingDayVisualStatus {
  const st = normalizeListingDayStatus(row?.day_status ?? null)
  if (st === 'option') return 'option'
  if (st === 'promo') return 'promo'
  const { am, pm } = listingDayAmPm(row)
  if (!am && !pm) {
    if (row?.is_available === false) return 'blocked'
    return 'turnover'
  }
  return 'available'
}

/** Gün tamamen dolu veya opsiyon (giriş yapılamaz) */
export function isListingDayFullyBlocked(row: ListingAvailabilityDay | undefined): boolean {
  if (normalizeListingDayStatus(row?.day_status ?? null) === 'option') return true
  return !listingDayPmOpen(row)
}

/** Öğleden sonra giriş müsait mi (check-in günü) */
export function listingDayPmOpen(row: ListingAvailabilityDay | undefined): boolean {
  if (normalizeListingDayStatus(row?.day_status ?? null) === 'option') return false
  const { pm } = listingDayAmPm(row)
  return pm
}

/** Tam gece konaklama için gün müsait mi (giriş günü hariç ara geceler) */
export function listingDayFullNightOpen(row: ListingAvailabilityDay | undefined): boolean {
  if (normalizeListingDayStatus(row?.day_status ?? null) === 'option') return false
  const { am, pm } = listingDayAmPm(row)
  return am && pm
}

/**
 * Konaklama gecesi `nightIndex` (0 = giriş günü) için müsaitlik.
 * Giriş günü: öğleden sonra açık olmalı; diğer geceler tam gün.
 */
export function listingDayOpenForStayNight(
  row: ListingAvailabilityDay | undefined,
  nightIndex: number,
): boolean {
  if (nightIndex === 0) return listingDayPmOpen(row)
  return listingDayFullNightOpen(row)
}

/** Çıkış günü olarak seçilebilir mi — konaklama geceleri ayrı doğrulanır */
export function listingDayCheckoutSelectable(row: ListingAvailabilityDay | undefined): boolean {
  return normalizeListingDayStatus(row?.day_status ?? null) !== 'option'
}

/** En az bir yarım açıksa ve opsiyon değilse tarih seçilebilir */
export function isListingDayPartiallyOrFullyFree(row: ListingAvailabilityDay | undefined): boolean {
  if (normalizeListingDayStatus(row?.day_status ?? null) === 'option') return false
  const { am, pm } = listingDayAmPm(row)
  return am || pm
}
