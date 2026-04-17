'use client'

import { ManageAccessGuard } from '@/lib/use-manage-access'
import SupplierManageClient from './SupplierManageClient'

export default function ManageSupplierPage() {
  return (
    <ManageAccessGuard
      required={{ permissionsAny: ['supplier.portal'], rolesAny: ['supplier'] }}
      featureHint="supplier.portal"
    >
      <SupplierManageClient />
    </ManageAccessGuard>
  )
}

