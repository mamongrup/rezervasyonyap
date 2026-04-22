import CatalogManageListingsClient from '../../CatalogManageListingsClient'
import { parseCatalogCategoryCodeParam } from '@/lib/catalog-category-ui'
import { notFound } from 'next/navigation'

export default async function ManageCatalogListingsPage({
  params,
}: {
  params: Promise<{ locale: string; code: string }>
}) {
  const { code } = await params
  const categoryCode = parseCatalogCategoryCodeParam(code)
  if (!categoryCode) {
    return notFound()
  }
  return <CatalogManageListingsClient categoryCode={categoryCode} />
}
