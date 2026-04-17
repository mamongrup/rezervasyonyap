'use client'

import { ManageAccessGuard } from '@/lib/use-manage-access'
import AdminToolsPageClient from './AdminToolsPageClient'

export default function AdminToolsPage() {
  return (
    <ManageAccessGuard
      required={{ permissionsPrefixAny: ['admin.'], rolesAny: ['admin'] }}
      featureHint="admin.*"
    >
      <div className="container max-w-6xl">
        <AdminToolsPageClient />
      </div>
    </ManageAccessGuard>
  )
}
