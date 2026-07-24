'use client'

import dynamic from 'next/dynamic'
import { useEffect, useState } from 'react'

const ConciergeChatWidget = dynamic(() => import('@/components/ConciergeChatWidget'), {
  ssr: false,
})
const SitePopupsRenderer = dynamic(() => import('@/components/popups/SitePopupsRenderer'), {
  ssr: false,
})
const CustomerSupportFloatMenu = dynamic(() => import('@/components/CustomerSupportFloatMenu'), {
  ssr: false,
})

/**
 * Footer üstü — WhatsApp, concierge, site popup.
 * Hepsi LCP sonrasına (idle / ~3.5s); mobil PSI main-thread + unused JS.
 */
type Props = { locale: string }

export function DeferredLayoutWidgets({ locale }: Props) {
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let idleId: number | undefined
    let timer: ReturnType<typeof setTimeout> | undefined
    const go = () => setReady(true)
    const schedule = () => {
      timer = setTimeout(go, 3500)
    }
    if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
      idleId = window.requestIdleCallback(schedule, { timeout: 5000 })
    } else {
      schedule()
    }
    return () => {
      if (timer) clearTimeout(timer)
      if (idleId != null && 'cancelIdleCallback' in window) {
        window.cancelIdleCallback(idleId)
      }
    }
  }, [])

  if (!ready) return null

  return (
    <>
      <CustomerSupportFloatMenu />
      <ConciergeChatWidget hideLauncher />
      <SitePopupsRenderer locale={locale} />
    </>
  )
}
