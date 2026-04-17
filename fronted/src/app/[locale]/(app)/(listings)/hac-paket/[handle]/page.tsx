import ExperienceListingDetailPage, {
  generateExperienceListingMetadata,
} from '../../ExperienceListingDetailPage'
import { detailPathForVertical } from '@/lib/listing-detail-routes'

export const generateMetadata = generateExperienceListingMetadata

export default function Page(props: { params: Promise<{ locale: string; handle: string }> }) {
  return <ExperienceListingDetailPage {...props} linkBase={detailPathForVertical('hajj')} />
}
