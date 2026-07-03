/** Panel `analytics` site_settings — vitrin Google etiketleri */

export type GoogleAnalyticsPublicConfig = {
  ga4_id?: string
  gtm_id?: string
  adsense_id?: string
  adsense_auto_ads?: boolean
  google_ads_id?: string
}

export type NormalizedGoogleAnalyticsIds = {
  ga4_id: string
  gtm_id: string
  adsense_id: string
  google_ads_id: string
}

const norm = (s?: string) => (s ?? '').trim()

/**
 * Panelde yanlış alana girilen ID'leri doğru yere taşır; geçersiz formatları eler.
 * - GTM alanına `AW-…` / `G-…` → Ads / GA4
 * - GTM yalnızca `GTM-…`
 * - AdSense yalnızca `ca-pub-…`
 */
export function normalizeGoogleAnalyticsIds(
  cfg: GoogleAnalyticsPublicConfig,
): NormalizedGoogleAnalyticsIds {
  let ga4_id = norm(cfg.ga4_id)
  let gtm_id = norm(cfg.gtm_id)
  let adsense_id = norm(cfg.adsense_id)
  let google_ads_id = norm(cfg.google_ads_id)

  if (/^AW-/i.test(gtm_id)) {
    if (!google_ads_id) google_ads_id = gtm_id
    gtm_id = ''
  } else if (/^G-/i.test(gtm_id)) {
    if (!ga4_id) ga4_id = gtm_id
    gtm_id = ''
  }
  if (gtm_id && !/^GTM-/i.test(gtm_id)) gtm_id = ''

  if (ga4_id && !/^G-/i.test(ga4_id)) {
    if (/^AW-/i.test(ga4_id) && !google_ads_id) google_ads_id = ga4_id
    ga4_id = ''
  }
  if (google_ads_id && !/^AW-/i.test(google_ads_id)) google_ads_id = ''
  if (adsense_id && !/^ca-pub-/i.test(adsense_id)) adsense_id = ''

  return { ga4_id, gtm_id, adsense_id, google_ads_id }
}

export function hasConfiguredGoogleAnalytics(cfg: GoogleAnalyticsPublicConfig): boolean {
  const ids = normalizeGoogleAnalyticsIds(cfg)
  return Boolean(ids.gtm_id || ids.ga4_id || ids.google_ads_id || ids.adsense_id)
}

/** Consent Mode v2 — GTM/gtag'ten önce çalışmalı; dönen ziyaretçi onayını localStorage'dan okur. */
export function buildGoogleConsentDefaultScript(consentGate: boolean): string {
  const storageKey = 'travel_cookie_consent_v1'
  if (!consentGate) {
    return `
window.dataLayer=window.dataLayer||[];
function gtag(){dataLayer.push(arguments);}
gtag('consent','default',{
  ad_storage:'granted',
  analytics_storage:'granted',
  ad_user_data:'granted',
  ad_personalization:'granted',
  functionality_storage:'granted',
  security_storage:'granted',
  wait_for_update:500
});`
  }

  return `
window.dataLayer=window.dataLayer||[];
function gtag(){dataLayer.push(arguments);}
gtag('consent','default',{
  ad_storage:'denied',
  analytics_storage:'denied',
  ad_user_data:'denied',
  ad_personalization:'denied',
  functionality_storage:'granted',
  security_storage:'granted',
  wait_for_update:500
});
try{
  var _cc=localStorage.getItem('${storageKey}');
  if(_cc&&JSON.parse(_cc).mode==='all'){
    gtag('consent','update',{
      ad_storage:'granted',
      analytics_storage:'granted',
      ad_user_data:'granted',
      ad_personalization:'granted'
    });
  }
}catch(e){}`
}
