import { ManageAccessGuard } from '@/lib/use-manage-access'
import NotificationsSmsClient from '../NotificationsSmsClient'

export default function ManageNotificationsSmsPage() {
  return (
    <ManageAccessGuard
      required={{ permissionsPrefixAny: ['admin.'], rolesAny: ['admin'] }}
      featureHint="admin.*"
    >
      <div className="px-4 py-6 md:px-6 lg:px-8">
        <NotificationsSmsClient />
      </div>
    </ManageAccessGuard>
  )
}
