import { getCarListingByHandle } from '@/data/listings'
import { normalizeCatalogVertical } from '@/lib/catalog-listing-vertical'
import { detailPathForVertical } from '@/lib/listing-detail-routes'
import { vitrinHref } from '@/lib/vitrin-href'
import { redirect } from 'next/navigation'

/** Eski URL → arac / feribot / tasima */
export default async function Page({ params }: { params: Promise<{ locale: string; handle: string }> }) {
  const { handle, locale } = await params
  const listing = await getCarListingByHandle(handle)
  if (!listing?.id) redirect(await vitrinHref(locale, '/arac-kiralama/all'))
  const path = detailPathForVertical(normalizeCatalogVertical(listing.listingVertical) ?? 'car_rental')
  redirect(await vitrinHref(locale, `${path}/${handle}`))
}
