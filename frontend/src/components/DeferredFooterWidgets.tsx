import CookieConsentBanner from '@/components/CookieConsentBanner'
import Footer2 from '@/components/Footer2'
import FooterQuickNavigation from '@/components/FooterQuickNavigation'
import { getCachedSiteConfig } from '@/lib/site-config-cache'
import { use } from 'react'

/**
 * Non-critical layout widgets deferred until after hydration.
 * FooterQuickNavigation mounts immediately; site config (Footer2, cookies) suspends separately.
 */
type Props = { locale: string }

async function FooterConfigWidgets({ locale }: Props) {
  const config = use(getCachedSiteConfig())
  const ui = config?.ui as Record<string, unknown> | null | undefined
  const cc = ui?.cookie_consent as Record<string, unknown> | undefined
  const bannerEnabled = cc?.banner_enabled !== false

  return (
    <>
      <Footer2 locale={locale} branding={config?.branding ?? null} />
      <CookieConsentBanner locale={locale} bannerEnabled={bannerEnabled} />
    </>
  )
}

export function DeferredFooterWidgets({ locale }: Props) {
  return (
    <>
      <FooterQuickNavigation />
      <FooterConfigWidgets locale={locale} />
    </>
  )
}
