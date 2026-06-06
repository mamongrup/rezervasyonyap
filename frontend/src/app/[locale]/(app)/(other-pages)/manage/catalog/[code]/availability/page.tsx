import CatalogModuleSectionClient from '../../CatalogModuleSectionClient'
import HolidayHomeAvailabilityHub from '@/components/manage/HolidayHomeAvailabilityHub'
import { parseCatalogCategoryCodeParam } from '@/lib/catalog-category-ui'
import { notFound } from 'next/navigation'

export default async function ManageCatalogAvailabilityPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params
  const c = parseCatalogCategoryCodeParam(code)
  if (!c) return notFound()
  if (c === 'holiday_home' || c === 'yacht_charter') return <HolidayHomeAvailabilityHub />
  return <CatalogModuleSectionClient categoryCode={c} section="availability" />
}
