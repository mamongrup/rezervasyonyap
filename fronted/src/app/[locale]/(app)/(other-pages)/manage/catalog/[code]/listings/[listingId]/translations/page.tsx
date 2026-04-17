import CatalogListingTranslationsClient from '../../../../CatalogListingTranslationsClient'
import { parseCatalogCategoryCodeParam } from '@/lib/catalog-category-ui'
import { notFound } from 'next/navigation'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export default async function ListingTranslationsPage({
  params,
}: {
  params: Promise<{ code: string; listingId: string }>
}) {
  const { code, listingId } = await params
  const normalized = parseCatalogCategoryCodeParam(code)
  if (!normalized || !UUID_RE.test(listingId.trim())) {
    return notFound()
  }

  return (
    <CatalogListingTranslationsClient categoryCode={normalized} listingId={listingId.trim()} />
  )
}
