import CookieConsentBanner from '@/components/CookieConsentBanner'
import Footer2 from '@/components/Footer2'
import FooterQuickNavigation from '@/components/FooterQuickNavigation'
import AsideSidebarNavigation from '@/components/aside-sidebar-navigation'
import { getCachedSiteConfig } from '@/lib/site-config-cache'
import { use } from 'react'

/**
 * Non-critical layout widgets deferred until after hydration.
 * Includes: Footer2, FooterQuickNavigation, AsideSidebarNavigation, CookieConsentBanner
 * These don't affect LCP or CLS, so deferring them improves performance metrics.
 */
type Props = { locale: string }

export function DeferredFooterWidgets({ locale }: Props) {
  const config = use(getCachedSiteConfig())
  const ui = config?.ui as Record<string, unknown> | null | undefined
  const cc = ui?.cookie_consent as Record<string, unknown> | undefined
  const bannerEnabled = cc?.banner_enabled !== false

  return (
    <>
      {/* FooterQuickNavigation - Displays on mobile devices and is fixed at the bottom of the screen */}
      <FooterQuickNavigation />
      {/* Chose footer style here!!!! */}
      <Footer2 locale={locale} branding={config?.branding ?? null} />
      <AsideSidebarNavigation locale={locale} />
      <CookieConsentBanner locale={locale} bannerEnabled={bannerEnabled} />
    </>
  )
}
