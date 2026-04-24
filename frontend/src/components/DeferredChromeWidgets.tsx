'use client'

import dynamic from 'next/dynamic'

const ConciergeChatWidget = dynamic(() => import('@/components/ConciergeChatWidget'), {
  ssr: false,
  loading: () => null,
})
const WhatsAppFloatButton = dynamic(() => import('@/components/WhatsAppFloatButton'), {
  ssr: false,
  loading: () => null,
})
const SitePopupsRenderer = dynamic(() => import('@/components/popups/SitePopupsRenderer'), {
  ssr: false,
  loading: () => null,
})

/** Sohbet / WhatsApp / popup — ilk paketten ayrı; mobil PSI kullanılmayan JS azaltır. */
export function DeferredChromeWidgets({ locale }: { locale: string }) {
  return (
    <>
      <WhatsAppFloatButton />
      <ConciergeChatWidget />
      <SitePopupsRenderer locale={locale} />
    </>
  )
}
