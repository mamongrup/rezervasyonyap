'use client'

import { ManageAccessGuard } from '@/lib/use-manage-access'
import AdminCategoryContractsClient from './AdminCategoryContractsClient'

export default function AdminCategoryContractsPage() {
  return (
    <ManageAccessGuard
      required={{ permissionsPrefixAny: ['admin.'], rolesAny: ['admin'] }}
      featureHint="admin.*"
    >
      <div className="container">
        <AdminCategoryContractsClient />
      </div>
    </ManageAccessGuard>
  )
}
