import HolidayListingGalleryManageClient from './HolidayListingGalleryManageClient'
import { parseCatalogCategoryCodeParam } from '@/lib/catalog-category-ui'
import { notFound } from 'next/navigation'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

const GALLERY_MANAGE_CATEGORIES = new Set(['holiday_home', 'yacht_charter', 'hotel'])

export default async function HolidayListingGalleryPage({
  params,
}: {
  params: Promise<{ code: string; listingId: string }>
}) {
  const { code, listingId } = await params
  const normalized = parseCatalogCategoryCodeParam(code)
  const id = decodeURIComponent(listingId).trim()
  if (!normalized || !GALLERY_MANAGE_CATEGORIES.has(normalized) || !UUID_RE.test(id)) {
    return notFound()
  }

  return <HolidayListingGalleryManageClient listingId={id} categoryCode={normalized} />
}
