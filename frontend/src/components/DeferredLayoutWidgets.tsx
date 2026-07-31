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
const TawkWidgetLoader = dynamic(() => import('@/components/TawkWidgetLoader'), {
  ssr: false,
})

/**
 * Footer üstü — WhatsApp, concierge, site popup + Tawk Monitoring warm-load.
 * İlk boya ve LCP sonrasına bırakılır; popup/chat kodu ana hydrate yolunu şişirmemeli.
 */
type Props = { locale: string }

export function DeferredLayoutWidgets({ locale }: Props) {
  const [renderWidgets, setRenderWidgets] = useState(false)
  const [renderTawk, setRenderTawk] = useState(false)

  useEffect(() => {
    let idleId: number | undefined
    let tawkIdleId: number | undefined
    // Tawk Monitoring: diğer widget’lardan biraz önce — ziyaretçi sayımı için.
    const tawkTimerId = window.setTimeout(() => {
      if ('requestIdleCallback' in window) {
        tawkIdleId = window.requestIdleCallback(() => setRenderTawk(true), { timeout: 2000 })
      } else {
        setRenderTawk(true)
      }
    }, 2000)
    const timerId = window.setTimeout(() => {
      if ('requestIdleCallback' in window) {
        idleId = window.requestIdleCallback(() => setRenderWidgets(true), { timeout: 2500 })
      } else {
        setRenderWidgets(true)
      }
    }, 4500)
    return () => {
      window.clearTimeout(tawkTimerId)
      window.clearTimeout(timerId)
      if (idleId != null && 'cancelIdleCallback' in window) window.cancelIdleCallback(idleId)
      if (tawkIdleId != null && 'cancelIdleCallback' in window) window.cancelIdleCallback(tawkIdleId)
    }
  }, [])

  return (
    <>
      {renderTawk ? <TawkWidgetLoader /> : null}
      {renderWidgets ? (
        <>
          <CustomerSupportFloatMenu />
          <ConciergeChatWidget hideLauncher />
          <SitePopupsRenderer locale={locale} />
        </>
      ) : null}
    </>
  )
}
