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
 * İlk boya ve LCP sonrasına bırakılır; popup/chat kodu ana hydrate yolunu şişirmemeli.
 */
type Props = { locale: string }

export function DeferredLayoutWidgets({ locale }: Props) {
  const [renderWidgets, setRenderWidgets] = useState(false)

  useEffect(() => {
    let idleId: number | undefined
    const timerId = window.setTimeout(() => {
      if ('requestIdleCallback' in window) {
        idleId = window.requestIdleCallback(() => setRenderWidgets(true), { timeout: 2500 })
      } else {
        setRenderWidgets(true)
      }
    }, 4500)
    return () => {
      window.clearTimeout(timerId)
      if (idleId != null && 'cancelIdleCallback' in window) window.cancelIdleCallback(idleId)
    }
  }, [])

  if (!renderWidgets) return null

  return (
    <>
      <CustomerSupportFloatMenu />
      <ConciergeChatWidget hideLauncher />
      <SitePopupsRenderer locale={locale} />
    </>
  )
}
