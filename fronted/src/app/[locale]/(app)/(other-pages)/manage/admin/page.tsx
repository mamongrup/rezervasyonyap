'use client'

import { ManageAccessGuard } from '@/lib/use-manage-access'
import AdminDashboardClient from './AdminDashboardClient'
import AdminManageClient from './AdminManageClient'

export default function ManageAdminPage() {
  return (
    <ManageAccessGuard
      required={{ permissionsPrefixAny: ['admin.'], rolesAny: ['admin'] }}
      featureHint="admin.*"
    >
      <AdminDashboardClient />
      <AdminManageClient />
    </ManageAccessGuard>
  )
}
