'use client'

import { ManageAccessGuard } from '@/lib/use-manage-access'
import GeneralSettingsClient from '../../../general-settings/GeneralSettingsClient'
import { Suspense } from 'react'

export default function AdminSettingsGeneralPage() {
  return (
    <ManageAccessGuard
      required={{ permissionsPrefixAny: ['admin.'], rolesAny: ['admin'] }}
      featureHint="admin.*"
    >
      <div className="px-4 py-6 md:px-6 lg:px-8">
        <Suspense fallback={<p className="text-neutral-500">Yükleniyor…</p>}>
          <GeneralSettingsClient />
        </Suspense>
      </div>
    </ManageAccessGuard>
  )
}
