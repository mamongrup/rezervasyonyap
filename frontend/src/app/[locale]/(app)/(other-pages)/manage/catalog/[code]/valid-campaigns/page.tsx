import HotelValidCampaignsManageClient from '../../HotelValidCampaignsManageClient'
import { parseCatalogCategoryCodeParam } from '@/lib/catalog-category-ui'
import { notFound } from 'next/navigation'

export default async function ManageHotelValidCampaignsPage({
  params,
}: {
  params: Promise<{ code: string }>
}) {
  const { code } = await params
  const c = parseCatalogCategoryCodeParam(code)
  if (c !== 'hotel') return notFound()
  return <HotelValidCampaignsManageClient />
}
