'use client'

import { ManageAccessGuard } from '@/lib/use-manage-access'
import InstagramManageClient from './InstagramManageClient'

export default function InstagramPage() {
  return (
    <ManageAccessGuard
      required={{ permissionsPrefixAny: ['admin.'], rolesAny: ['admin'] }}
      featureHint="admin.*"
    >
      <div className="px-4 py-6 md:px-6 lg:px-8">
        <InstagramManageClient />
      </div>
    </ManageAccessGuard>
  )
}
