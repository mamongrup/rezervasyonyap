'use client'

import { useVitrinHref } from '@/hooks/use-vitrin-href'
import { useEffect } from 'react'

export default function SocialRedirect() {
  const vitrinPath = useVitrinHref()
  useEffect(() => {
    window.location.replace(vitrinPath('/manage/admin/marketing/social'))
  }, [vitrinPath])
  return null
}
