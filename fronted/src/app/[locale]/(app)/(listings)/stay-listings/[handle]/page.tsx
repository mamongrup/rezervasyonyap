import { getStayListingByHandle } from '@/data/listings'
import { normalizeCatalogVertical } from '@/lib/catalog-listing-vertical'
import { stayDetailPathForVertical } from '@/lib/listing-detail-routes'
import { vitrinHref } from '@/lib/vitrin-href'
import { redirect } from 'next/navigation'

/** Eski URL → kanonik otel / yat / tatil-evi */
export default async function Page({ params }: { params: Promise<{ locale: string; handle: string }> }) {
  const { handle, locale } = await params
  const listing = await getStayListingByHandle(handle, locale)
  if (!listing?.id) redirect(await vitrinHref(locale, '/oteller/all'))
  const path = stayDetailPathForVertical(normalizeCatalogVertical(listing.listingVertical))
  redirect(await vitrinHref(locale, `${path}/${handle}`))
}
