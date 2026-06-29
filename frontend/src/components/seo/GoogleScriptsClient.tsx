'use client'

import { allowAnalyticsScripts } from '@/lib/cookie-consent-storage'
import Script from 'next/script'
import { useEffect, useState } from 'react'

export type GoogleAnalyticsPublicConfig = {
  ga4_id?: string
  gtm_id?: string
  adsense_id?: string
  adsense_auto_ads?: boolean
  google_ads_id?: string
}

type Props = {
  analytics: GoogleAnalyticsPublicConfig
  /**
   * `true` (varsayılan): vitrin çerez şeridi açık. Consent Mode v2 ile etiket
   * her zaman yüklenir (Google doğrulaması/Tag Assistant görebilsin diye) ancak
   * kullanıcı «Tümünü kabul» demeden ad_storage / analytics_storage `denied`
   * kalır (çerezsiz). Onay verilince `granted`'a güncellenir.
   * `false`: şerit kapalı — onay beklemeden tam izinli yükle.
   */
  consentGate: boolean
}

/**
 * Panelde yanlış alana girilen ID'leri otomatik doğru yere taşır:
 * - GTM alanına `AW-...` veya `G-...` girilmişse Ads / GA4'e yönlendirir.
 * - GTM ID `GTM-` ile başlamıyorsa yok sayar (geçersiz `gtm.js` isteği üretmemek için).
 */
function normalizeIds(cfg: GoogleAnalyticsPublicConfig): {
  ga4_id: string
  gtm_id: string
  adsense_id: string
  google_ads_id: string
} {
  const norm = (s?: string) => (s ?? '').trim()
  let ga4_id = norm(cfg.ga4_id)
  let gtm_id = norm(cfg.gtm_id)
  const adsense_id = norm(cfg.adsense_id)
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
    if (/^AW-/i.test(ga4_id)) {
      if (!google_ads_id) google_ads_id = ga4_id
    }
    ga4_id = ''
  }
  if (google_ads_id && !/^AW-/i.test(google_ads_id)) google_ads_id = ''

  return { ga4_id, gtm_id, adsense_id, google_ads_id }
}

export default function GoogleScriptsClient({ analytics, consentGate }: Props) {
  const { ga4_id, gtm_id, adsense_id, google_ads_id } = normalizeIds(analytics)
  const adsense_auto_ads = analytics.adsense_auto_ads === true

  const gtagIds: string[] = []
  if (ga4_id) gtagIds.push(ga4_id)
  if (google_ads_id) gtagIds.push(google_ads_id)
  const hasGtag = gtagIds.length > 0
  const hasAnyConfigured = Boolean(gtm_id || hasGtag || adsense_id)

  const [granted, setGranted] = useState(() => allowAnalyticsScripts(consentGate))

  useEffect(() => {
    const sync = () => {
      const ok = allowAnalyticsScripts(consentGate)
      setGranted(ok)
      if (ok && typeof window !== 'undefined') {
        const w = window as unknown as { gtag?: (...args: unknown[]) => void }
        if (typeof w.gtag === 'function') {
          w.gtag('consent', 'update', {
            ad_storage: 'granted',
            analytics_storage: 'granted',
            ad_user_data: 'granted',
            ad_personalization: 'granted',
          })
        }
      }
    }
    sync()
    window.addEventListener('travel-cookie-consent', sync)
    return () => window.removeEventListener('travel-cookie-consent', sync)
  }, [consentGate])

  if (!hasAnyConfigured) return null

  // Şerit açık ve onay yoksa çerezsiz (denied); aksi halde tam izin.
  const defaultState = consentGate && !granted ? 'denied' : 'granted'

  return (
    <>
      {/* Consent Mode v2 varsayılanı — gtag/GTM config'lerinden ÖNCE çalışmalı. */}
      <Script id="google-consent-default" strategy="afterInteractive">{`
window.dataLayer=window.dataLayer||[];
function gtag(){dataLayer.push(arguments);}
gtag('consent','default',{
  ad_storage:'${defaultState}',
  analytics_storage:'${defaultState}',
  ad_user_data:'${defaultState}',
  ad_personalization:'${defaultState}',
  functionality_storage:'granted',
  security_storage:'granted',
  wait_for_update:500
});
`}</Script>

      {gtm_id && (
        <Script id="gtm-init" strategy="afterInteractive">{`
(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','${gtm_id}');`}</Script>
      )}

      {hasGtag && (
        <>
          <Script src={`https://www.googletagmanager.com/gtag/js?id=${gtagIds[0]}`} strategy="afterInteractive" />
          <Script id="gtag-init" strategy="afterInteractive">{`
gtag('js',new Date());
${gtagIds.map((id) => `gtag('config','${id}');`).join('\n')}`}</Script>
        </>
      )}

      {adsense_id && (
        <Script
          src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${adsense_id}`}
          strategy={adsense_auto_ads ? 'afterInteractive' : 'lazyOnload'}
          crossOrigin="anonymous"
        />
      )}
    </>
  )
}
