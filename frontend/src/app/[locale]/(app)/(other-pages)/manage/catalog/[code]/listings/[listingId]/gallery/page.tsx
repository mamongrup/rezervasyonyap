import HolidayListingGalleryManageClient from './HolidayListingGalleryManageClient'
import { parseCatalogCategoryCodeParam } from '@/lib/catalog-category-ui'
import { notFound } from 'next/navigation'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export default async function HolidayListingGalleryPage({
  params,
}: {
  params: Promise<{ code: string; listingId: string }>
}) {
  const { code, listingId } = await params
  const normalized = parseCatalogCategoryCodeParam(code)
  const id = decodeURIComponent(listingId).trim()
  if (
    !normalized ||
    (normalized !== 'holiday_home' && normalized !== 'yacht_charter') ||
    !UUID_RE.test(id)
  ) {
    return notFound()
  }

  return <HolidayListingGalleryManageClient listingId={id} />
}
