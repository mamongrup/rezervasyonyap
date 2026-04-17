'use client'

import { useVitrinHref } from '@/hooks/use-vitrin-href'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

/** Eski URL — site ayarları artık `/manage/admin` altında. */
export default function ManageGeneralSettingsRedirectPage() {
  const router = useRouter()
  const vitrinPath = useVitrinHref()

  useEffect(() => {
    router.replace(vitrinPath('/manage/admin'))
  }, [router, vitrinPath])

  return (
    <div className="container max-w-2xl py-16">
      <p className="text-neutral-600 dark:text-neutral-400">Yönetici sayfasına yönlendiriliyorsunuz…</p>
    </div>
  )
}
