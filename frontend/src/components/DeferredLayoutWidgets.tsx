'use client'

import dynamic from 'next/dynamic'
import { useEffect, useState } from 'react'

const ConciergeChatWidget = dynamic(() => import('@/components/ConciergeChatWidget'), {
  ssr: false,
})
const SitePopupsRenderer = dynamic(() => import('@/components/popups/SitePopupsRenderer'), {
  ssr: false,
})
const WhatsAppFloatButton = dynamic(() => import('@/components/WhatsAppFloatButton'), {
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
      <WhatsAppFloatButton />
      <ConciergeChatWidget />
      <SitePopupsRenderer locale={locale} />
    </>
  )
}
