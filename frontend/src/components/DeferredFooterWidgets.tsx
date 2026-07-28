import CookieConsentBanner from '@/components/CookieConsentBanner'
import Footer2 from '@/components/Footer2'
import FooterQuickNavigation from '@/components/FooterQuickNavigation'
import HideOnManageStaff from '@/components/HideOnManageStaff'
import { applyBrandingDomainOverrides } from '@/lib/branding-for-host'
import { getRequestHostname } from '@/lib/request-hostname'
import { getCachedSiteConfig } from '@/lib/site-config-cache'
import { Suspense } from 'react'

/**
 * Non-critical layout widgets deferred until after hydration.
 * FooterQuickNavigation mounts immediately; site config (Footer2, cookies) suspends separately.
 * /manage ve /staff: vitrin Footer2 + cookie banner yok (panel kendi kabuğunu kullanır).
 */
type Props = { locale: string }

async function FooterConfigWidgets({ locale }: Props) {
  const [config, hostname] = await Promise.all([getCachedSiteConfig(), getRequestHostname()])
  const ui = config?.ui as Record<string, unknown> | null | undefined
  const cc = ui?.cookie_consent as Record<string, unknown> | undefined
  const bannerEnabled = cc?.banner_enabled !== false
  const branding = applyBrandingDomainOverrides(
    (config?.branding as Record<string, unknown> | null) ?? {},
    hostname,
  )

  return (
    <>
      <Footer2 locale={locale} branding={branding} />
      <CookieConsentBanner locale={locale} bannerEnabled={bannerEnabled} />
    </>
  )
}

export function DeferredFooterWidgets({ locale }: Props) {
  return (
    <>
      <FooterQuickNavigation />
      <HideOnManageStaff>
        <Suspense fallback={null}>
          <FooterConfigWidgets locale={locale} />
        </Suspense>
      </HideOnManageStaff>
    </>
  )
}
