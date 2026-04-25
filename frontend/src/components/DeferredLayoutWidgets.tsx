'use client'

import dynamic from 'next/dynamic'

/**
 * Tüm sitede footer üstü widget'lar (WhatsApp, concierge, çerez, popup).
 * `next/dynamic` + `ssr: false` ile ana RSC/ilk JS paketinden ayrı chunk'lar; ilk boyama ve TBT'ye katkıları azalır.
 */
const WhatsAppFloatButton = dynamic(() => import('@/components/WhatsAppFloatButton'), {
  ssr: false,
  loading: () => null,
})
const ConciergeChatWidget = dynamic(() => import('@/components/ConciergeChatWidget'), {
  ssr: false,
  loading: () => null,
})
const CookieConsentBanner = dynamic(() => import('@/components/CookieConsentBanner'), {
  ssr: false,
  loading: () => null,
})
const SitePopupsRenderer = dynamic(() => import('@/components/popups/SitePopupsRenderer'), {
  ssr: false,
  loading: () => null,
})

type Props = {
  locale: string
  /** Sunucudan: `ui.cookie_consent.banner_enabled === false` ise çubuk kapalı */
  bannerEnabled: boolean
}

export function DeferredLayoutWidgets({ locale, bannerEnabled }: Props) {
  return (
    <>
      <WhatsAppFloatButton />
      <ConciergeChatWidget />
      <CookieConsentBanner locale={locale} bannerEnabled={bannerEnabled} />
      <SitePopupsRenderer locale={locale} />
    </>
  )
}
