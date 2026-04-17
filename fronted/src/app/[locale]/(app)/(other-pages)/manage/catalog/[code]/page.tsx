import CatalogCategoryHubClient from '../CatalogCategoryHubClient'
import { parseCatalogCategoryCodeParam } from '@/lib/catalog-category-ui'
import { notFound } from 'next/navigation'

export default async function ManageCatalogCategoryPage({
  params,
}: {
  params: Promise<{ code: string }>
}) {
  const { code } = await params
  const normalized = parseCatalogCategoryCodeParam(code)
  if (!normalized) {
    return notFound()
  }

  return <CatalogCategoryHubClient code={normalized} />
}
