import { ManageAccessGuard } from '@/lib/use-manage-access'
import NotificationsPushClient from '../NotificationsPushClient'

export default function ManageNotificationsPushPage() {
  return (
    <ManageAccessGuard
      required={{ permissionsPrefixAny: ['admin.'], rolesAny: ['admin'] }}
      featureHint="admin.*"
    >
      <div className="px-4 py-6 md:px-6 lg:px-8">
        <NotificationsPushClient />
      </div>
    </ManageAccessGuard>
  )
}
