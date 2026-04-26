'use client'

import CookieConsentBanner from '@/components/CookieConsentBanner'
import Footer2 from '@/components/Footer2'
import FooterQuickNavigation from '@/components/FooterQuickNavigation'
import AsideSidebarNavigation from '@/components/aside-sidebar-navigation'
import { useEffect, useState } from 'react'
import { getCachedSiteConfig } from '@/lib/site-config-cache'

/**
 * Non-critical layout widgets deferred until after hydration.
 * Includes: Footer2, FooterQuickNavigation, AsideSidebarNavigation, CookieConsentBanner
 * These don't affect LCP or CLS, so deferring them improves performance metrics.
 * 
 * Using useEffect mount pattern for proper RSC manifest handling.
 */
type Props = { locale: string }

export function DeferredFooterWidgets({ locale }: Props) {
  const [mounted, setMounted] = useState(false)
  const [config, setConfig] = useState<Awaited<ReturnType<typeof getCachedSiteConfig>> | null>(null)
  
  useEffect(() => {
    setMounted(true)
    // Fetch site config for cookie banner
    getCachedSiteConfig().then(setConfig)
  }, [])

  if (!mounted) return null

  const ui = config?.ui as Record<string, unknown> | null | undefined
  const cc = ui?.cookie_consent as Record<string, unknown> | undefined
  const bannerEnabled = cc?.banner_enabled !== false

  return (
    <>
      {/* FooterQuickNavigation - Displays on mobile devices and is fixed at the bottom of the screen */}
      <FooterQuickNavigation />
      {/* Chose footer style here!!!! */}
      <Footer2 locale={locale} />
      <AsideSidebarNavigation locale={locale} />
      <CookieConsentBanner locale={locale} bannerEnabled={bannerEnabled} />
    </>
  )
}
