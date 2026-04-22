'use client'

import { ManageAccessGuard } from '@/lib/use-manage-access'
import StaffManageClient from './StaffManageClient'

export default function ManageStaffPage() {
  return (
    <ManageAccessGuard
      required={{ permissionsPrefixAny: ['staff.'], rolesAny: ['staff'] }}
      featureHint="staff.*"
    >
      <StaffManageClient />
    </ManageAccessGuard>
  )
}

