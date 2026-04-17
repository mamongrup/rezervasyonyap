'use client'

import { ManageAccessGuard } from '@/lib/use-manage-access'
import AdminAgencyProfilesSection from '../../AdminAgencyProfilesSection'

export default function AdminAgenciesPage() {
  return (
    <ManageAccessGuard
      required={{ permissionsPrefixAny: ['admin.'], rolesAny: ['admin'] }}
      featureHint="admin.*"
    >
      <div className="px-4 py-6 md:px-6 lg:px-8">
        <AdminAgencyProfilesSection />
      </div>
    </ManageAccessGuard>
  )
}
