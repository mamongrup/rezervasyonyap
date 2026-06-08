'use client'

import { ManageAccessGuard } from '@/lib/use-manage-access'
import AdminListingApiProvidersSection from '../../AdminListingApiProvidersSection'
import AdminSyncSection from '@/components/admin/AdminSyncSection'

export default function AdminListingApiProvidersPage() {
  return (
    <ManageAccessGuard
      required={{ permissionsPrefixAny: ['admin.'], rolesAny: ['admin'] }}
      featureHint="admin.*"
    >
      <div className="px-4 py-6 md:px-6 lg:px-8 space-y-12">
        <AdminSyncSection />
        <AdminListingApiProvidersSection />
      </div>
    </ManageAccessGuard>
  )
}
