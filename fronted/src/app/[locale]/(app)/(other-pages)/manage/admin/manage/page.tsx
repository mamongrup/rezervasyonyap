'use client'

import { ManageAccessGuard } from '@/lib/use-manage-access'
import AdminManageClient from '../AdminManageClient'

export default function ManageAdminManagePage() {
  return (
    <ManageAccessGuard
      required={{ permissionsPrefixAny: ['admin.'], rolesAny: ['admin'] }}
      featureHint="admin.*"
    >
      <AdminManageClient />
    </ManageAccessGuard>
  )
}
