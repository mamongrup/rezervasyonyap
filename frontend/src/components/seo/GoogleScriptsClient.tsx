'use client'

import {
  buildGoogleConsentDefaultScript,
  hasConfiguredGoogleAnalytics,
  normalizeGoogleAnalyticsIds,
  type GoogleAnalyticsPublicConfig,
} from '@/lib/google-analytics-config'
import Script from 'next/script'
import { useEffect, useState } from 'react'

export type { GoogleAnalyticsPublicConfig }

type Props = {
  analytics: GoogleAnalyticsPublicConfig
  /**
   * `true` (varsayılan): vitrin çerez şeridi açık. Consent Mode v2 ile etiketler
   * yüklenir; kullanıcı «Tümünü kabul» demeden depolama `denied` kalır.
   * `false`: şerit kapalı — onay beklemeden tam izinli yükleme.
   */
  consentGate: boolean
}

function pushConsentUpdate() {
  const w = window as unknown as { gtag?: (...args: unknown[]) => void }
  if (typeof w.gtag !== 'function') return
  w.gtag('consent', 'update', {
    ad_storage: 'granted',
    analytics_storage: 'granted',
    ad_user_data: 'granted',
    ad_personalization: 'granted',
  })
}

export default function GoogleScriptsClient({ analytics, consentGate }: Props) {
  const { ga4_id, gtm_id, adsense_id, google_ads_id } = normalizeGoogleAnalyticsIds(analytics)

  // GTM varken doğrudan gtag yüklemeyin — aksi halde GA4/Ads çift sayılır.
  const gtagIds: string[] = []
  if (!gtm_id) {
    if (ga4_id) gtagIds.push(ga4_id)
    if (google_ads_id) gtagIds.push(google_ads_id)
  }
  const hasGtag = gtagIds.length > 0
  const hasAnyConfigured = hasConfiguredGoogleAnalytics(analytics)
  const [mayLoadTags, setMayLoadTags] = useState(false)

  useEffect(() => {
    const sync = () => {
      try {
        const raw = localStorage.getItem('travel_cookie_consent_v1')
        if (raw && JSON.parse(raw).mode === 'all') {
          setMayLoadTags(true)
          pushConsentUpdate()
        }
      } catch {
        /* ignore */
      }
    }
    sync()

    if (!consentGate) {
      const enable = () => setMayLoadTags(true)
      const timer = window.setTimeout(enable, 15_000)
      const events: (keyof WindowEventMap)[] = ['pointerdown', 'keydown', 'scroll']
      events.forEach((event) =>
        window.addEventListener(event, enable, { once: true, passive: true }),
      )
      return () => {
        window.clearTimeout(timer)
        events.forEach((event) => window.removeEventListener(event, enable))
      }
    }

    window.addEventListener('travel-cookie-consent', sync)
    return () => window.removeEventListener('travel-cookie-consent', sync)
  }, [consentGate])

  if (!hasAnyConfigured) return null

  const gtagConfigLines = gtagIds.map((id) => `gtag('config','${id}');`).join('\n')

  return (
    <>
      {mayLoadTags && gtm_id && (
        <noscript>
          <iframe
            src={`https://www.googletagmanager.com/ns.html?id=${gtm_id}`}
            height={0}
            width={0}
            style={{ display: 'none', visibility: 'hidden' }}
            title="Google Tag Manager"
          />
        </noscript>
      )}

      {/* Consent Mode v2 — GTM/gtag config'lerinden ÖNCE (head'e enjekte edilir). */}
      <Script id="google-consent-default" strategy="beforeInteractive">
        {buildGoogleConsentDefaultScript(consentGate)}
      </Script>

      {/* lazyOnload: LCP/FCP sonrası — PSI "unused JS" + 3. taraf cezası düşer.
          Consent default hâlâ beforeInteractive; etiketler idle'da yüklenir. */}
      {mayLoadTags && gtm_id && (
        <Script id="gtm-init" strategy="lazyOnload">{`
(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','${gtm_id}');`}</Script>
      )}

      {mayLoadTags && hasGtag && (
        <>
          <Script
            src={`https://www.googletagmanager.com/gtag/js?id=${gtagIds[0]}`}
            strategy="lazyOnload"
          />
          <Script id="gtag-init" strategy="lazyOnload">{`
gtag('js',new Date());
${gtagConfigLines}`}</Script>
        </>
      )}

      {mayLoadTags && adsense_id && (
        <Script
          src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${adsense_id}`}
          strategy="lazyOnload"
          crossOrigin="anonymous"
        />
      )}
    </>
  )
}
