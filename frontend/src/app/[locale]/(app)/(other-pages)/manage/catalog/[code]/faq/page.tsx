import HolidayHomeFaqManageClient from '../../HolidayHomeFaqManageClient'
import { parseCatalogCategoryCodeParam } from '@/lib/catalog-category-ui'
import { notFound } from 'next/navigation'

export default async function ManageHolidayHomeFaqPage({
  params,
}: {
  params: Promise<{ locale: string; code: string }>
}) {
  const { code } = await params
  const c = parseCatalogCategoryCodeParam(code)
  if (!c || (c !== 'holiday_home' && c !== 'yacht_charter')) {
    return notFound()
  }
  return <HolidayHomeFaqManageClient categoryCode={c} />
}
