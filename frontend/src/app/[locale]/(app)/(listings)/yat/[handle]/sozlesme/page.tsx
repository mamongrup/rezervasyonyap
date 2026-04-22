import StayListingContractPageContent from '../../../StayListingContractPageContent'
import { STAY_DETAIL_YACHT_PATH } from '@/lib/listing-detail-routes'

export default function Page(props: { params: Promise<{ locale: string; handle: string }> }) {
  return <StayListingContractPageContent {...props} linkBase={STAY_DETAIL_YACHT_PATH} />
}
