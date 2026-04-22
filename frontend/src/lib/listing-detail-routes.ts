/**
 * İlan detay URL’leri — `product_categories.code` ↔ App Router ilk segmenti (`logical_key`).
 * `vitrinHref` + `localized-routes-fallback` ile dile göre vitrin segmenti değişir.
 */

import type { CatalogListingVerticalCode } from '@/lib/catalog-listing-vertical'
import { normalizeCatalogVertical } from '@/lib/catalog-listing-vertical'

/** Dahili klasör adı (TR taban); middleware vitrin segmentine çevirir */
/**
 * App Router ilk segmenti — kategori liste URL’leriyle (`/kruvaziyer`, `/vize`, …) çakışmaması için
 * ayrı anahtarlar (ör. `gemi-turu`, `vize-basvuru`).
 */
export const DETAIL_SEGMENT_BY_VERTICAL: Record<CatalogListingVerticalCode, string> = {
  hotel: 'otel',
  holiday_home: 'tatil-evi',
  yacht_charter: 'yat',
  tour: 'tur',
  activity: 'aktivite',
  cruise: 'gemi-turu',
  hajj: 'hac-paket',
  visa: 'vize-basvuru',
  flight: 'ucak-ilan',
  car_rental: 'arac',
  ferry: 'feribot-rezervasyon',
  transfer: 'tasima',
}

export function detailPathForVertical(v: CatalogListingVerticalCode | undefined): string {
  const code = normalizeCatalogVertical(v)
  if (!code) return '/otel'
  return `/${DETAIL_SEGMENT_BY_VERTICAL[code]}`
}

export function verticalFromDetailSegment(segment: string): CatalogListingVerticalCode | undefined {
  const s = segment.trim().toLowerCase()
  const entry = Object.entries(DETAIL_SEGMENT_BY_VERTICAL).find(([, seg]) => seg === s)
  return entry ? (entry[0] as CatalogListingVerticalCode) : undefined
}

/** Konaklama detayları (otel / yat / tatil evi) */
export type StayDetailLinkBase = '/otel' | '/yat' | '/tatil-evi'

export const STAY_DETAIL_HOTEL_PATH = '/otel' as const
export const STAY_DETAIL_YACHT_PATH = '/yat' as const
export const HOLIDAY_HOME_DETAIL_PATH = '/tatil-evi' as const

/** @deprecated `STAY_DETAIL_HOTEL_PATH` kullanın */
export const STAY_DETAIL_LIST_PATH = STAY_DETAIL_HOTEL_PATH

export function stayDetailPathForVertical(
  vertical: CatalogListingVerticalCode | undefined,
): StayDetailLinkBase {
  const v = normalizeCatalogVertical(vertical)
  if (v === 'holiday_home') return HOLIDAY_HOME_DETAIL_PATH
  if (v === 'yacht_charter') return STAY_DETAIL_YACHT_PATH
  return STAY_DETAIL_HOTEL_PATH
}

/** Deneyim ilanı yoksa — kategori liste sayfasına */
export function experienceBrowsePathForVertical(v: CatalogListingVerticalCode | undefined): string {
  const code = normalizeCatalogVertical(v) ?? 'tour'
  const m: Partial<Record<CatalogListingVerticalCode, string>> = {
    tour: '/turlar/all',
    activity: '/aktiviteler/all',
    cruise: '/kruvaziyer/all',
    hajj: '/hac-umre/all',
    visa: '/vize/all',
    flight: '/ucak-bileti/all',
  }
  return m[code] ?? '/turlar/all'
}

/** Araç / feribot / transfer ilanı yoksa */
export function transportBrowsePathForVertical(v: CatalogListingVerticalCode | undefined): string {
  const code = normalizeCatalogVertical(v) ?? 'car_rental'
  if (code === 'ferry') return '/feribot/all'
  if (code === 'transfer') return '/transfer/all'
  return '/arac-kiralama/all'
}
