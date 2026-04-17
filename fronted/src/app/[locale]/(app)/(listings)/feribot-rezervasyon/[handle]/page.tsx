import CarListingDetailPage, { generateCarListingMetadata } from '../../CarListingDetailPage'
import { detailPathForVertical } from '@/lib/listing-detail-routes'

export const generateMetadata = generateCarListingMetadata

export default function Page(props: { params: Promise<{ locale: string; handle: string }> }) {
  return <CarListingDetailPage {...props} linkBase={detailPathForVertical('ferry')} />
}
