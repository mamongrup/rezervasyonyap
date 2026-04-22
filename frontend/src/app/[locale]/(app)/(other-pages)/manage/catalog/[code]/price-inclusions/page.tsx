import CatalogCategoryPriceLinesClient from '../../CatalogCategoryPriceLinesClient'
import { parseCatalogCategoryCodeParam } from '@/lib/catalog-category-ui'
import { notFound } from 'next/navigation'

export default async function ManageCatalogPriceInclusionsPage({
  params,
}: {
  params: Promise<{ locale: string; code: string }>
}) {
  const { code } = await params
  const c = parseCatalogCategoryCodeParam(code)
  if (!c) {
    return notFound()
  }
  return <CatalogCategoryPriceLinesClient code={c} />
}
