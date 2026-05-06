import HolidayHomeThemePresetsManageClient from '../../HolidayHomeThemePresetsManageClient'
import { parseCatalogCategoryCodeParam } from '@/lib/catalog-category-ui'
import { notFound } from 'next/navigation'

export default async function ManageHolidayHomeThemePresetsPage({
  params,
}: {
  params: Promise<{ locale: string; code: string }>
}) {
  const { locale, code } = await params
  const c = parseCatalogCategoryCodeParam(code)
  if (!c || c !== 'holiday_home') {
    return notFound()
  }
  return <HolidayHomeThemePresetsManageClient locale={locale} />
}
