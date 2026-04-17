import { getExperienceListingByHandle } from '@/data/listings'
import { normalizeCatalogVertical } from '@/lib/catalog-listing-vertical'
import { detailPathForVertical } from '@/lib/listing-detail-routes'
import { vitrinHref } from '@/lib/vitrin-href'
import { redirect } from 'next/navigation'

/** Eski URL → tur / aktivite / … kanonik segment */
export default async function Page({ params }: { params: Promise<{ locale: string; handle: string }> }) {
  const { handle, locale } = await params
  const listing = await getExperienceListingByHandle(handle)
  if (!listing?.id) redirect(await vitrinHref(locale, '/turlar/all'))
  const path = detailPathForVertical(normalizeCatalogVertical(listing.listingVertical) ?? 'activity')
  redirect(await vitrinHref(locale, `${path}/${handle}`))
}
