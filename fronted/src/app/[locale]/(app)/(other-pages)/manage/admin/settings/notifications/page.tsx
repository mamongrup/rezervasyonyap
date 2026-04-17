'use client'

import { ManageAccessGuard } from '@/lib/use-manage-access'
import AdminNotificationSettingsSection from '../../AdminNotificationSettingsSection'

export default function AdminSettingsNotificationsPage() {
  return (
    <ManageAccessGuard
      required={{ permissionsPrefixAny: ['admin.'], rolesAny: ['admin'] }}
      featureHint="admin.*"
    >
      <div className="px-4 py-6 md:px-6 lg:px-8">
        <AdminNotificationSettingsSection />
      </div>
    </ManageAccessGuard>
  )
}
