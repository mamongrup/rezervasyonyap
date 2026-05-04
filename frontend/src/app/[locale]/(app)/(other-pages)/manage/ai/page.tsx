'use client'

import { useVitrinHref } from '@/hooks/use-vitrin-href'
import { Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

/** Eski /manage/ai — tüm yapay zeka ayarları Ayarlar → Yapay zeka sekmesinde. */
export default function ManageAiPage() {
  const router = useRouter()
  const vitrinPath = useVitrinHref()

  useEffect(() => {
    router.replace(`${vitrinPath('/manage/admin/settings')}?tab=ai`)
  }, [router, vitrinPath])

  return (
    <div className="flex items-center justify-center gap-2 px-4 py-16 text-sm text-neutral-500">
      <Loader2 className="h-5 w-5 animate-spin" />
      Yapay zeka ayarlarına yönlendiriliyor…
    </div>
  )
}
