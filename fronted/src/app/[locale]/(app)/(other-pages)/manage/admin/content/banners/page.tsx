'use client'

import { ManageAccessGuard } from '@/lib/use-manage-access'
import AdminBannersSection from '../../AdminBannersSection'

export default function AdminBannersPage() {
  return (
    <ManageAccessGuard
      required={{ permissionsPrefixAny: ['admin.'], rolesAny: ['admin'] }}
      featureHint="admin.*"
    >
      <div className="px-4 py-6 md:px-6 lg:px-8">
        <AdminBannersSection />
      </div>
    </ManageAccessGuard>
  )
}
