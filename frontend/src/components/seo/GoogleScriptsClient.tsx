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
   * `true` (varsayılan): vitrin çerez şeridi açıksa yalnızca kullanıcı «Tümünü kabul et» dediyse
   * analitik / pazarlama scriptleri yüklenir.
   * `false`: şerit kapalı — onay beklemeden yükle (önceki site davranışı).
   */
  consentGate: boolean
}

function computeHasScripts(cfg: GoogleAnalyticsPublicConfig): boolean {
  const { ga4_id, gtm_id, adsense_id, google_ads_id } = cfg
  const gtagIds: string[] = []
  if (ga4_id) gtagIds.push(ga4_id)
  if (google_ads_id) gtagIds.push(google_ads_id)
  return Boolean(gtm_id || gtagIds.length > 0 || adsense_id)
}

export default function GoogleScriptsClient({ analytics, consentGate }: Props) {
  const cfg = analytics
  const { ga4_id, gtm_id, adsense_id, adsense_auto_ads, google_ads_id } = cfg

  const gtagIds: string[] = []
  if (ga4_id) gtagIds.push(ga4_id)
  if (google_ads_id) gtagIds.push(google_ads_id)
  const hasGtag = gtagIds.length > 0

  const hasAnyConfigured = computeHasScripts(cfg)
  const [allow, setAllow] = useState(() => allowAnalyticsScripts(consentGate))

  useEffect(() => {
    setAllow(allowAnalyticsScripts(consentGate))
  }, [consentGate])

  useEffect(() => {
    const sync = () => setAllow(allowAnalyticsScripts(consentGate))
    window.addEventListener('travel-cookie-consent', sync)
    return () => window.removeEventListener('travel-cookie-consent', sync)
  }, [consentGate])

  if (!hasAnyConfigured || !allow) return null

  return (
    <>
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
window.dataLayer=window.dataLayer||[];
function gtag(){dataLayer.push(arguments);}
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
