import StayListingDetailPageContent, {
  generateStayListingMetadata,
} from '../../StayListingDetailPageContent'
import { HOLIDAY_HOME_DETAIL_PATH } from '@/lib/listing-detail-routes'

export const generateMetadata = (props: {
  params: Promise<{ locale: string; handle: string }>
}) => generateStayListingMetadata({ ...props, expectedVertical: 'holiday_home' })

export default function Page(props: { params: Promise<{ locale: string; handle: string }> }) {
  return <StayListingDetailPageContent {...props} linkBase={HOLIDAY_HOME_DETAIL_PATH} />
}
