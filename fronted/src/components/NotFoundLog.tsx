'use client'

import { logSeoNotFound } from '@/lib/travel-api'
import { usePathname } from 'next/navigation'
import { useEffect, useRef } from 'react'

const APP_LOCALES = new Set(['tr', 'en', 'de', 'ru', 'zh', 'fr'])

/**
 * Global 404 sayfasında bir kez çağrılır; SEO not-found günlüğüne yazar.
 */
export default function NotFoundLog() {
  const pathname = usePathname()
  const sent = useRef(false)

  useEffect(() => {
    if (sent.current || !pathname) return
    sent.current = true
    const parts = pathname.split('/').filter(Boolean)
    const maybeLoc = parts[0] ?? ''
    const locale = APP_LOCALES.has(maybeLoc) ? maybeLoc : 'tr'
    void logSeoNotFound({ path: pathname, locale }).catch(() => {})
  }, [pathname])

  return null
}
