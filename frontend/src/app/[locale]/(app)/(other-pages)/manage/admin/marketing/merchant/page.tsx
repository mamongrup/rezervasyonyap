'use client'

import { ManageAccessGuard } from '@/lib/use-manage-access'
import AdminMerchantIntegrationsSection from '../../AdminMerchantIntegrationsSection'

export default function AdminMerchantPage() {
  return (
    <ManageAccessGuard
      required={{ permissionsPrefixAny: ['admin.'], rolesAny: ['admin'] }}
      featureHint="admin.*"
    >
      <div className="px-4 py-6 md:px-6 lg:px-8">
        <AdminMerchantIntegrationsSection />
      </div>
    </ManageAccessGuard>
  )
}
