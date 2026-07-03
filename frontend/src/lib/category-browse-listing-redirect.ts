import { getExperienceListingByHandle } from '@/data/listings'
import { normalizeCatalogVertical, type CatalogListingVerticalCode } from '@/lib/catalog-listing-vertical'
import { detailPathForVertical } from '@/lib/listing-detail-routes'
import { vitrinHref } from '@/lib/vitrin-href'
import { redirect } from 'next/navigation'

/**
 * `/turlar/{ilan-slug}` gibi kategori browse URL'leri yanlışlıkla bölge araması yapmasın —
 * yayınlanmış deneyim ilanı varsa doğru detay köküne yönlendir (`/tur/…`, `/gemi-turu/…`).
 */
export async function redirectIfExperienceListingHandle(
  locale: string,
  handle: string | undefined | null,
  expectedVertical: CatalogListingVerticalCode,
): Promise<void> {
  if (!handle || handle === 'all') return
  const listing = await getExperienceListingByHandle(handle, locale)
  if (!listing?.id) return
  const vertical = normalizeCatalogVertical(listing.listingVertical)
  if (vertical !== expectedVertical) return
  redirect(await vitrinHref(locale, `${detailPathForVertical(expectedVertical)}/${handle}`))
}
