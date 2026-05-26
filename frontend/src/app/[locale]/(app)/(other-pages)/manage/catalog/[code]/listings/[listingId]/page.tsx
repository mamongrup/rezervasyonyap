import CatalogNewListingClient from '../../../CatalogNewListingClient'
import { parseCatalogCategoryCodeParam } from '@/lib/catalog-category-ui'
import { notFound } from 'next/navigation'

/** Tüm kategoriler: yeni ilan sihirbazı + sabit üst (dil/çeviri) / alt (kaydet) çubukları. */
export default async function CatalogListingDetailPage({
  params,
}: {
  params: Promise<{ code: string; listingId: string }>
}) {
  const { code, listingId } = await params
  const categoryCode = parseCatalogCategoryCodeParam(code)
  if (!categoryCode) {
    return notFound()
  }
  const id = decodeURIComponent(listingId)
  return <CatalogNewListingClient categoryCode={categoryCode} editListingId={id} />
}
