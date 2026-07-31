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
 * Footer2 vitrin + yönetim panelinde görünür; cookie banner yalnızca vitrinde.
 */
type Props = { locale: string }

async function SiteFooter({ locale }: Props) {
  const [config, hostname] = await Promise.all([getCachedSiteConfig(), getRequestHostname()])
  const branding = applyBrandingDomainOverrides(
    (config?.branding as Record<string, unknown> | null) ?? {},
    hostname,
  )
  return <Footer2 locale={locale} branding={branding} />
}

async function CookieWidget({ locale }: Props) {
  const config = await getCachedSiteConfig()
  const ui = config?.ui as Record<string, unknown> | null | undefined
  const cc = ui?.cookie_consent as Record<string, unknown> | undefined
  const bannerEnabled = cc?.banner_enabled !== false
  return <CookieConsentBanner locale={locale} bannerEnabled={bannerEnabled} />
}

export function DeferredFooterWidgets({ locale }: Props) {
  return (
    <>
      <FooterQuickNavigation />
      <Suspense fallback={null}>
        <SiteFooter locale={locale} />
      </Suspense>
      <HideOnManageStaff>
        <Suspense fallback={null}>
          <CookieWidget locale={locale} />
        </Suspense>
      </HideOnManageStaff>
    </>
  )
}
