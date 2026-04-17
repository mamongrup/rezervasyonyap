'use client'

import { ManageAccessGuard } from '@/lib/use-manage-access'
import AgencyManageClient from './AgencyManageClient'

export default function ManageAgencyPage() {
  return (
    <ManageAccessGuard
      required={{ permissionsAny: ['agency.portal'], rolesAny: ['agency'] }}
      featureHint="agency.portal"
    >
      <AgencyManageClient />
    </ManageAccessGuard>
  )
}

