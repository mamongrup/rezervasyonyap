'use client'

import { ManageAccessGuard } from '@/lib/use-manage-access'
import AdminSeoRedirectsSection from '../../AdminSeoRedirectsSection'

export default function AdminSeoRedirectsPage() {
  return (
    <ManageAccessGuard
      required={{ permissionsPrefixAny: ['admin.'], rolesAny: ['admin'] }}
      featureHint="admin.*"
    >
      <div className="px-4 py-6 md:px-6 lg:px-8">
        <AdminSeoRedirectsSection />
      </div>
    </ManageAccessGuard>
  )
}
