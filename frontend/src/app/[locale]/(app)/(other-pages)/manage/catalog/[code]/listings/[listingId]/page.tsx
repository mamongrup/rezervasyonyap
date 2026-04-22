import CatalogListingDetailClient from './CatalogListingDetailClient'

export default async function CatalogListingDetailPage({
  params,
}: {
  params: Promise<{ code: string; listingId: string }>
}) {
  const { code, listingId } = await params
  return <CatalogListingDetailClient categoryCode={decodeURIComponent(code)} listingId={decodeURIComponent(listingId)} />
}
