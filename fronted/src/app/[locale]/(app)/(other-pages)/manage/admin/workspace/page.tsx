'use client'

import { ManageAccessGuard } from '@/lib/use-manage-access'
import AdminWorkspaceClient from './AdminWorkspaceClient'

export default function AdminWorkspacePage() {
  return (
    <ManageAccessGuard
      required={{ permissionsPrefixAny: ['admin.'], rolesAny: ['admin'] }}
      featureHint="admin.*"
    >
      <AdminWorkspaceClient />
    </ManageAccessGuard>
  )
}
