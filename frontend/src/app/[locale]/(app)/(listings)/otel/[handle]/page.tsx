import StayListingDetailPageContent, {
  generateStayListingMetadata,
} from '../../StayListingDetailPageContent'
import { STAY_DETAIL_HOTEL_PATH } from '@/lib/listing-detail-routes'

export const generateMetadata = generateStayListingMetadata

export default function Page(props: { params: Promise<{ locale: string; handle: string }> }) {
  return <StayListingDetailPageContent {...props} linkBase={STAY_DETAIL_HOTEL_PATH} />
}
