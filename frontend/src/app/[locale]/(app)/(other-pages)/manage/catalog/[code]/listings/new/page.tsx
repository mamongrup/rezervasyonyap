import CatalogNewListingClient from '../../../CatalogNewListingClient'
import { parseCatalogCategoryCodeParam } from '@/lib/catalog-category-ui'
import { notFound } from 'next/navigation'

export default async function ManageCatalogNewListingPage({
  params,
}: {
  params: Promise<{ locale: string; code: string }>
}) {
  const { code } = await params
  const categoryCode = parseCatalogCategoryCodeParam(code)
  if (!categoryCode) {
    return notFound()
  }
  return <CatalogNewListingClient categoryCode={categoryCode} />
}
