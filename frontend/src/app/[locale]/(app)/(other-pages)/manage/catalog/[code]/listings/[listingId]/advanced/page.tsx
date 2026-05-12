import CatalogListingDetailClient from '../CatalogListingDetailClient'
import CatalogNewListingClient from '../../../../CatalogNewListingClient'

/** Tatil evi: yeni wizard; diğer kategoriler: eski sekmeli panel. */
export default async function CatalogListingAdvancedToolsPage({
  params,
}: {
  params: Promise<{ code: string; listingId: string }>
}) {
  const { code, listingId } = await params
  const cat = decodeURIComponent(code)
  const id = decodeURIComponent(listingId)
  if (cat === 'holiday_home') {
    return <CatalogNewListingClient categoryCode={cat} editListingId={id} />
  }
  return (
    <CatalogListingDetailClient
      categoryCode={cat}
      listingId={id}
    />
  )
}
