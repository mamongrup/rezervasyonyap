import CatalogModuleSectionClient from '../../CatalogModuleSectionClient'
import { parseCatalogCategoryCodeParam } from '@/lib/catalog-category-ui'
import { notFound } from 'next/navigation'

export default async function ManageCatalogAvailabilityPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params
  const c = parseCatalogCategoryCodeParam(code)
  if (!c) return notFound()
  return <CatalogModuleSectionClient categoryCode={c} section="availability" />
}
