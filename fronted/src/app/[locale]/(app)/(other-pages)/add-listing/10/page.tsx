import StayCard from '@/components/StayCard'
import { getStayListings } from '@/data/listings'
import { normalizeCatalogVertical } from '@/lib/catalog-listing-vertical'
import { vitrinHref } from '@/lib/vitrin-href'
import type { TListingBase } from '@/types/listing-types'
import ButtonPrimary from '@/shared/ButtonPrimary'
import ButtonSecondary from '@/shared/ButtonSecondary'
import { Divider } from '@/shared/divider'
import { getMessages } from '@/utils/getT'
import { PencilEdit02Icon, ViewIcon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'

const Page = async ({ params }: { params: Promise<{ locale: string }> }) => {
  const { locale } = await params
  const [editListingHref, previewListingHref] = await Promise.all([
    vitrinHref(locale, '/add-listing/1'),
    vitrinHref(locale, '/otel/preview-stay-84763232'),
  ])
  const L = getMessages(locale).addListings
  const raw = (await getStayListings())[0]
  const listing: TListingBase = {
    ...raw,
    listingVertical: normalizeCatalogVertical(raw.listingVertical),
  }

  return (
    <>
      <div>
        <h2 className="text-2xl font-semibold">{L.page10.pageTitle}</h2>
        <span className="mt-2 block text-neutral-500 dark:text-neutral-400">
          {L.page10.pageDescription}
        </span>
      </div>

      <Divider className="w-14!" />

      <div>
        <h3 className="text-lg font-semibold">{L.page10['This is your listing']}</h3>
        <div className="mt-6 max-w-sm">
          <StayCard data={listing} />
        </div>
        <div className="mt-8 flex items-center gap-x-3">
          <ButtonSecondary href={editListingHref}>
            <HugeiconsIcon icon={PencilEdit02Icon} className="h-5 w-5" strokeWidth={1.75} />
            <span>{L.page10.Edit}</span>
          </ButtonSecondary>

          <ButtonPrimary href={previewListingHref}>
            <HugeiconsIcon icon={ViewIcon} className="h-5 w-5" strokeWidth={1.75} />
            <span>{L.page10.Preview}</span>
          </ButtonPrimary>
        </div>
      </div>
      {/*  */}
    </>
  )
}

export default Page
