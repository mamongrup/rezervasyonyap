import type { CatalogListingVerticalCode } from '@/lib/catalog-listing-vertical'
import { normalizeCatalogVertical } from '@/lib/catalog-listing-vertical'
import { DETAIL_SEGMENT_BY_VERTICAL } from '@/lib/listing-detail-routes'

/**
 * Hesap / acente rezervasyon listesinde ilan slug’u için vitrin yolu.
 * `category_code` bilinmiyorsa otel detay segmenti kullanılır.
 */
export function accountReservationListingHref(
  slug: string,
  categoryCode: string | undefined,
  vitrinHref: (path: string) => string,
): string {
  const s = slug.trim()
  if (!s) return '#'
  const v: CatalogListingVerticalCode = normalizeCatalogVertical(categoryCode) ?? 'hotel'
  const seg = DETAIL_SEGMENT_BY_VERTICAL[v]
  return vitrinHref(`/${seg}/${encodeURIComponent(s)}`)
}
