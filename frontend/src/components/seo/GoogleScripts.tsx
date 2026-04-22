import { getCachedSiteConfig } from '@/lib/site-config-cache'
import GoogleScriptsClient, { type GoogleAnalyticsPublicConfig } from './GoogleScriptsClient'

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
 * Google Tag Manager, GA4, Google Ads (gtag), AdSense — vitrin çerez şeridi açıksa
 * yalnızca kullanıcı «Tümünü kabul et» dedikten sonra yüklenir (`GoogleScriptsClient`).
 */
export default async function GoogleScripts() {
  const pub = await getCachedSiteConfig()
  const analytics = pickAnalytics(pub)

  const ui = pub?.ui as Record<string, unknown> | null | undefined
  const cc = ui?.cookie_consent as Record<string, unknown> | undefined
  const consentGate = cc?.banner_enabled !== false

  const { ga4_id, gtm_id, adsense_id, google_ads_id } = analytics
  const hasSomething = Boolean(
    gtm_id || (ga4_id || google_ads_id) || adsense_id,
  )
  if (!hasSomething) return null

  return <GoogleScriptsClient analytics={analytics} consentGate={consentGate} />
}
