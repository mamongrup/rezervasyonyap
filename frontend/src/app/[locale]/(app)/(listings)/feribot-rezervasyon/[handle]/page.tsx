import FerryListingDetailPage, { generateFerryListingMetadata } from '../../FerryListingDetailPage'
import { detailPathForVertical } from '@/lib/listing-detail-routes'

export const generateMetadata = generateFerryListingMetadata

export default function Page(props: { params: Promise<{ locale: string; handle: string }> }) {
  return <FerryListingDetailPage {...props} linkBase={detailPathForVertical('ferry')} />
}
