'use client'

import { useParams, useRouter } from 'next/navigation'
import { PlusSignCircleIcon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { useVitrinHref } from '@/hooks/use-vitrin-href'
import { getStoredAuthToken } from '@/lib/auth-storage'
import { getMessages } from '@/utils/getT'

export default function AddListingDropdown() {
  const params = useParams()
  const router = useRouter()
  const locale = typeof params?.locale === 'string' ? params.locale : 'tr'
  const vitrinPath = useVitrinHref()
  const listCta = getMessages(locale).Header['List your property']

  const handleClick = () => {
    const token = getStoredAuthToken()
    if (!token) {
      // Not logged in → login page, come back after
      router.push(`${vitrinPath('/login')}?redirect=${encodeURIComponent('/ilan-ekle')}`)
    } else {
      // Logged in → smart hub determines next step
      router.push(vitrinPath('/ilan-ekle'))
    }
  }

  return (
    <button
      onClick={handleClick}
      className="inline-flex items-center gap-1.5 rounded-full border border-neutral-200 bg-white px-4 py-2 text-sm font-medium text-neutral-700 shadow-xs transition hover:border-primary-400 hover:text-primary-600 focus:outline-none dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-200 dark:hover:border-primary-600"
    >
      <HugeiconsIcon icon={PlusSignCircleIcon} className="h-4 w-4" strokeWidth={1.75} />
      {listCta}
    </button>
  )
}
