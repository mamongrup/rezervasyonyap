'use client'

import { useVitrinHref } from '@/hooks/use-vitrin-href'
import { useEffect } from 'react'

export default function AdminMarketingAnalyticsRedirect() {
  const vitrinPath = useVitrinHref()

  useEffect(() => {
    window.location.replace(vitrinPath('/manage/admin/analytics'))
  }, [vitrinPath])

  return null
}
