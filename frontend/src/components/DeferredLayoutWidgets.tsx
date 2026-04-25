'use client'

import dynamic from 'next/dynamic'

/**
 * Footer üstü — WhatsApp, concierge, site popup (çerez çubuğu application-layout'ta doğrudan).
 * `next/dynamic` + `ssr: false` ile ayrı chunk; TBT / ana bundle küçülür.
 */
const WhatsAppFloatButton = dynamic(() => import('@/components/WhatsAppFloatButton'), {
  ssr: false,
  loading: () => null,
})
const ConciergeChatWidget = dynamic(() => import('@/components/ConciergeChatWidget'), {
  ssr: false,
  loading: () => null,
})
const SitePopupsRenderer = dynamic(() => import('@/components/popups/SitePopupsRenderer'), {
  ssr: false,
  loading: () => null,
})

type Props = { locale: string }

export function DeferredLayoutWidgets({ locale }: Props) {
  return (
    <>
      <WhatsAppFloatButton />
      <ConciergeChatWidget />
      <SitePopupsRenderer locale={locale} />
    </>
  )
}
