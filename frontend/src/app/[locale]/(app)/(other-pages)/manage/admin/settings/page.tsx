'use client'

import GeneralSettingsClient from '../../general-settings/GeneralSettingsClient'
import { ManageAccessGuard } from '@/lib/use-manage-access'
import { Suspense } from 'react'

export default function AdminSettingsPage() {
  return (
    <ManageAccessGuard
      required={{ permissionsPrefixAny: ['admin.'], rolesAny: ['admin'] }}
      featureHint="admin.*"
    >
      <Suspense
        fallback={
          <div className="container mx-auto max-w-5xl py-10">
            <p className="text-neutral-500">Yükleniyor…</p>
          </div>
        }
      >
        <GeneralSettingsClient />
      </Suspense>
    </ManageAccessGuard>
  )
}
