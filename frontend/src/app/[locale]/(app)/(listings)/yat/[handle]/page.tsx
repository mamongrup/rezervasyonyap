import StayListingDetailPageContent, {
  generateStayListingMetadata,
} from '../../StayListingDetailPageContent'
import { STAY_DETAIL_YACHT_PATH } from '@/lib/listing-detail-routes'

export const generateMetadata = (props: {
  params: Promise<{ locale: string; handle: string }>
}) => generateStayListingMetadata({ ...props, expectedVertical: 'yacht_charter' })

export default function Page(props: { params: Promise<{ locale: string; handle: string }> }) {
  return <StayListingDetailPageContent {...props} linkBase={STAY_DETAIL_YACHT_PATH} />
}
