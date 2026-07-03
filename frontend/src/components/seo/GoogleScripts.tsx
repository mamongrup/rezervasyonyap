import {
  hasConfiguredGoogleAnalytics,
  type GoogleAnalyticsPublicConfig,
} from '@/lib/google-analytics-config'
import { getCachedSiteConfig } from '@/lib/site-config-cache'
import GoogleScriptsClient from './GoogleScriptsClient'

function pickAnalytics(pub: Awaited<ReturnType<typeof getCachedSiteConfig>>): GoogleAnalyticsPublicConfig {
  if (!pub?.analytics || typeof pub.analytics !== 'object') return {}
  const a = pub.analytics as Record<string, unknown>
  return {
    ga4_id: typeof a.ga4_id === 'string' ? a.ga4_id : undefined,
    gtm_id: typeof a.gtm_id === 'string' ? a.gtm_id : undefined,
    adsense_id: typeof a.adsense_id === 'string' ? a.adsense_id : undefined,
    adsense_auto_ads: a.adsense_auto_ads === true,
    google_ads_id: typeof a.google_ads_id === 'string' ? a.google_ads_id : undefined,
  }
}

/**
 * Google Tag Manager, GA4, Google Ads (gtag), AdSense — Consent Mode v2 ile vitrinde yüklenir.
 * GTM yapılandırılmışsa GA4/Ads doğrudan gtag ile tekrar yüklenmez (çift sayım önlenir).
 */
export default async function GoogleScripts() {
  const pub = await getCachedSiteConfig()
  const analytics = pickAnalytics(pub)

  const ui = pub?.ui as Record<string, unknown> | null | undefined
  const cc = ui?.cookie_consent as Record<string, unknown> | undefined
  const consentGate = cc?.banner_enabled !== false

  if (!hasConfiguredGoogleAnalytics(analytics)) return null

  return <GoogleScriptsClient analytics={analytics} consentGate={consentGate} />
}
