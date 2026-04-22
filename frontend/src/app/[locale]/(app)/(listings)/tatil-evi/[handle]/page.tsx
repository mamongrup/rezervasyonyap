import StayListingDetailPageContent, {
  generateStayListingMetadata,
} from '../../StayListingDetailPageContent'
import { HOLIDAY_HOME_DETAIL_PATH } from '@/lib/listing-detail-routes'

export const generateMetadata = generateStayListingMetadata

export default function Page(props: { params: Promise<{ locale: string; handle: string }> }) {
  return <StayListingDetailPageContent {...props} linkBase={HOLIDAY_HOME_DETAIL_PATH} />
}
