'use client'

import { ManageAccessGuard } from '@/lib/use-manage-access'
import AdminDashboardClient from './AdminDashboardClient'

export default function ManageAdminPage() {
  return (
    <ManageAccessGuard
      required={{ permissionsPrefixAny: ['admin.'], rolesAny: ['admin'] }}
      featureHint="admin.*"
    >
      <AdminDashboardClient />
    </ManageAccessGuard>
  )
}
