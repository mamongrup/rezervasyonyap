import CatalogListingDetailClient from '../CatalogListingDetailClient'

/** Tatil evi tam formundan takvim, fiyat kuralları, medya vb. sekmeli panel. */
export default async function CatalogListingAdvancedToolsPage({
  params,
}: {
  params: Promise<{ code: string; listingId: string }>
}) {
  const { code, listingId } = await params
  return (
    <CatalogListingDetailClient
      categoryCode={decodeURIComponent(code)}
      listingId={decodeURIComponent(listingId)}
    />
  )
}
