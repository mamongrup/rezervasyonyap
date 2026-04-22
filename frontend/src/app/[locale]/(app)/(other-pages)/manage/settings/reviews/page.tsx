import { ManageAccessGuard } from '@/lib/use-manage-access'
import ReviewsSettingsClient from './ReviewsSettingsClient'

export default function ManageSettingsReviewsPage() {
  return (
    <ManageAccessGuard
      required={{ permissionsPrefixAny: ['admin.'], rolesAny: ['admin'] }}
      featureHint="admin.*"
    >
      <div className="px-4 py-6 md:px-6 lg:px-8">
        <ReviewsSettingsClient />
      </div>
    </ManageAccessGuard>
  )
}
