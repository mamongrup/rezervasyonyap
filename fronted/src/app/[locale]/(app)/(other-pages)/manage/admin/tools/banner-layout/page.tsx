'use client'

import BannerLayoutComposer from '@/components/manage/BannerLayoutComposer'
import { ManageAccessGuard } from '@/lib/use-manage-access'

export default function BannerLayoutToolPage() {
  return (
    <ManageAccessGuard
      required={{ permissionsPrefixAny: ['admin.'], rolesAny: ['admin'] }}
      featureHint="admin.*"
    >
      <div className="container max-w-6xl">
        <BannerLayoutComposer />
      </div>
    </ManageAccessGuard>
  )
}
