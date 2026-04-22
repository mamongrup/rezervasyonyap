import { getStayListingByHandle } from '@/data/listings'
import { sanitizeRichCmsHtml } from '@/lib/sanitize-cms-html'
import { normalizeCatalogVertical } from '@/lib/catalog-listing-vertical'
import {
  HOLIDAY_HOME_DETAIL_PATH,
  STAY_DETAIL_YACHT_PATH,
  stayDetailPathForVertical,
  type StayDetailLinkBase,
} from '@/lib/listing-detail-routes'
import { fetchPublicListingContractSafe, resolvePublishedListingIdForStayPage } from '@/lib/travel-api'
import { vitrinHref } from '@/lib/vitrin-href'
import { getMessages } from '@/utils/getT'
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'

export default async function StayListingContractPageContent({
  params,
  linkBase,
}: {
  params: Promise<{ locale: string; handle: string }>
  linkBase: StayDetailLinkBase | string
}) {
  const { handle, locale } = await params
  const listing = await getStayListingByHandle(handle, locale)
  if (!listing?.id) {
    const browse =
      linkBase === HOLIDAY_HOME_DETAIL_PATH
        ? '/tatil-evleri/all'
        : linkBase === STAY_DETAIL_YACHT_PATH
          ? '/yat-kiralama/all'
          : '/oteller/all'
    redirect(await vitrinHref(locale, browse))
  }

  const vertical = normalizeCatalogVertical(listing.listingVertical)
  const canonicalPath = stayDetailPathForVertical(vertical)
  if (linkBase !== canonicalPath) {
    redirect(await vitrinHref(locale, `${canonicalPath}/${handle}/sozlesme`))
  }

  const catalogListingId = await resolvePublishedListingIdForStayPage(handle, locale)
  if (!catalogListingId) notFound()

  const contract = await fetchPublicListingContractSafe(catalogListingId, locale)
  if (!contract?.contract_id) notFound()

  const messages = getMessages(locale)
  const backHref = await vitrinHref(locale, `${canonicalPath}/${handle}`)
  const cp = messages.listing.contractPage

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <div className="mb-6">
        <Link
          href={backHref}
          className="text-sm font-medium text-primary-600 hover:underline dark:text-primary-400"
        >
          ← {cp.backToListing}
        </Link>
      </div>
      <h1 className="text-2xl font-semibold text-neutral-900 dark:text-neutral-100">{contract.title}</h1>
      <div
        className="prose prose-sm mt-6 max-w-none leading-relaxed text-neutral-800 dark:prose-invert dark:text-neutral-200"
        dangerouslySetInnerHTML={{ __html: sanitizeRichCmsHtml(contract.body_text) }}
      />
    </div>
  )
}
