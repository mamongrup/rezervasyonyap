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
 * Footer üstü — WhatsApp, concierge, site popup.
 * İlk boya ve LCP sonrasına bırakılır; popup/chat kodu ana hydrate yolunu şişirmemeli.
 */
type Props = { locale: string }

export function DeferredLayoutWidgets({ locale }: Props) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    const id = window.setTimeout(() => setMounted(true), 5500)
    return () => window.clearTimeout(id)
  }, [])
  if (!mounted) return null
  return (
    <>
      <CustomerSupportFloatMenu />
      <TawkWidgetLoader />
      <ConciergeChatWidget hideLauncher />
      <SitePopupsRenderer locale={locale} />
    </>
  )
}
