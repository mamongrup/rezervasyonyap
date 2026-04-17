'use client'

import CookieSettingsAdminClient from './CookieSettingsAdminClient'
import { ManageAccessGuard } from '@/lib/use-manage-access'
import { Suspense } from 'react'

export default function AdminCookieSettingsPage() {
  return (
    <ManageAccessGuard
      required={{ permissionsPrefixAny: ['admin.'], rolesAny: ['admin'] }}
      featureHint="admin.*"
    >
      <div className="px-4 py-6 md:px-6 lg:px-8">
        <Suspense fallback={<p className="text-neutral-500">Yükleniyor…</p>}>
          <CookieSettingsAdminClient />
        </Suspense>
      </div>
    </ManageAccessGuard>
  )
}
