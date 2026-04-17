import CatalogCategoryAttributesClient from '../../CatalogCategoryAttributesClient'
import { parseCatalogCategoryCodeParam } from '@/lib/catalog-category-ui'
import { notFound } from 'next/navigation'

export default async function ManageCatalogAttributesPage({
  params,
}: {
  params: Promise<{ locale: string; code: string }>
}) {
  const { code } = await params
  const c = parseCatalogCategoryCodeParam(code)
  if (!c) {
    return notFound()
  }
  return <CatalogCategoryAttributesClient code={c} />
}
