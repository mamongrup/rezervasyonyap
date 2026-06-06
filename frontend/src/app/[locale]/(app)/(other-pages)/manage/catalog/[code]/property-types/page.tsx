import HolidayHomePropertyTypesManageClient from '../../HolidayHomePropertyTypesManageClient'
import { parseCatalogCategoryCodeParam } from '@/lib/catalog-category-ui'
import { notFound } from 'next/navigation'

export default async function ManageHolidayHomePropertyTypesPage({
  params,
}: {
  params: Promise<{ locale: string; code: string }>
}) {
  const { code } = await params
  const c = parseCatalogCategoryCodeParam(code)
  if (!c || (c !== 'holiday_home' && c !== 'yacht_charter')) {
    return notFound()
  }
  return <HolidayHomePropertyTypesManageClient categoryCode={c} />
}
