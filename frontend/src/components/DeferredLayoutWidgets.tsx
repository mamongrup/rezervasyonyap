'use client'

import ConciergeChatWidget from '@/components/ConciergeChatWidget'
import SitePopupsRenderer from '@/components/popups/SitePopupsRenderer'
import WhatsAppFloatButton from '@/components/WhatsAppFloatButton'
import { useEffect, useState } from 'react'

/**
 * Footer üstü — WhatsApp, concierge, site popup.
 * Statik import + useEffect mount: RSC manifest'e doğru yazılır (next/dynamic ssr:false
 * bazen App Router'da manifest'e girmiyor). İlk render'da null döner → TBT etkisi yok.
 */
type Props = { locale: string }

export function DeferredLayoutWidgets({ locale }: Props) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])
  if (!mounted) return null
  return (
    <>
      <WhatsAppFloatButton />
      <ConciergeChatWidget />
      <SitePopupsRenderer locale={locale} />
    </>
  )
}
