'use client'

import { ManageAccessGuard } from '@/lib/use-manage-access'
import AgencySalesClient from './AgencySalesClient'

export default function ManageAgencySalesPage() {
  return (
    <ManageAccessGuard
      required={{ permissionsAny: ['agency.portal'], rolesAny: ['agency'] }}
      featureHint="agency.portal"
    >
      <AgencySalesClient />
    </ManageAccessGuard>
  )
}

