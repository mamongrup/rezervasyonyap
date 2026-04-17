import StayListingContractPageContent from '../../../StayListingContractPageContent'
import { HOLIDAY_HOME_DETAIL_PATH } from '@/lib/listing-detail-routes'

export default function Page(props: { params: Promise<{ locale: string; handle: string }> }) {
  return <StayListingContractPageContent {...props} linkBase={HOLIDAY_HOME_DETAIL_PATH} />
}
