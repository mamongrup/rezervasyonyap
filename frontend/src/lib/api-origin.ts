/**
 * Gleam API kökü (sonda `/` yok).
 * - Tarayıcı: `NEXT_PUBLIC_API_URL` (genelde public site origin).
 * - Sunucu (RSC, Route Handlers): sırayla `INTERNAL_API_ORIGIN`, yoksa `API_URL`, sonra `NEXT_PUBLIC_API_URL`.
 *   VPS’te yalnızca public URL kullanılırsa kendi domain’ine hairpin/NAT olmadan çıkamama olabilir;
 *   bu yüzden üretimde loopback tercih edilir: `INTERNAL_API_ORIGIN=http://127.0.0.1:8080`
 *   (`deploy/systemd/frontend.env.example`). `API_URL` yedek olarak `listing-search` route ile uyumludur.
 *
 * ### www / apex / marka domainleri (CORS + 502)
 * Build’de `NEXT_PUBLIC_API_URL=https://rezervasyonyap.tr` iken kullanıcı
 * `https://www.rezervasyonyap.com.tr` üzerinden sayfayı açarsa tarayıcı isteği farklı origin’e gider.
 * Upstream 502’de nginx CORS header eklemez → konsolda hem CORS hem 502 görünür.
 * Aynı deploy’a bağlı marka host’larında API kökü olarak **geçerli sekme origin’i** kullanılır
 * (nginx `/api` proxy → same-origin, CORS gerekmez).
 */
function stripTrailingSlash(s: string): string {
  return s.replace(/\/$/, '')
}

/** `www.` önekini at; karşılaştırma için. */
export function hostApexKey(hostname: string): string {
  return hostname.replace(/^www\./i, '').toLowerCase()
}

/**
 * Aynı uygulamayı / nginx `/api` proxy’sini paylaşan üretim apex host’ları
 * (`deploy/DOMAIN.md`, `ensure-multidomain-frontend-env.sh`).
 * Bunlar arasında www/apex veya `.tr` / `.com.tr` farkı cross-origin sayılmaz.
 */
export const SAME_DEPLOYMENT_SITE_APEXES = [
  'rezervasyonyap.tr',
  'rezervasyonyap.com.tr',
  'reservationinturkey.com',
] as const

export function isSameDeploymentSiteHost(hostname: string): boolean {
  const apex = hostApexKey(hostname)
  return (SAME_DEPLOYMENT_SITE_APEXES as readonly string[]).includes(apex)
}

/** API host ile sayfa host’u aynı deploy ailesindeyse same-origin kullanılmalı. */
export function shouldPreferPageOriginForApi(apiHostname: string, pageHostname: string): boolean {
  const apiApex = hostApexKey(apiHostname)
  const pageApex = hostApexKey(pageHostname)
  if (apiApex === pageApex) return true
  return isSameDeploymentSiteHost(apiHostname) && isSameDeploymentSiteHost(pageHostname)
}

export function apiOriginForFetch(): string {
  const strip = stripTrailingSlash
  if (typeof window === 'undefined') {
    const internal = process.env.INTERNAL_API_ORIGIN?.trim()
    if (internal) return strip(internal)
    const apiUrl = process.env.API_URL?.trim()
    if (apiUrl) return strip(apiUrl)
  }
  /** Yerel `next dev`: `/api/v1/*` rewrite ile aynı origin — CORS olmadan kur + katalog istekleri. */
  if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
    const o = window.location?.origin ?? ''
    if (o) return strip(o)
  }
  const pub = process.env.NEXT_PUBLIC_API_URL?.trim() ?? ''

  if (typeof window !== 'undefined' && pub !== '') {
    try {
      const abs = /^https?:\/\//i.test(pub) ? pub : `https://${pub}`
      const apiHostname = new URL(abs).hostname
      const pageHostname = window.location.hostname
      if (shouldPreferPageOriginForApi(apiHostname, pageHostname)) {
        const o = window.location?.origin ?? ''
        if (o) return strip(o)
      }
    } catch {
      /* yoksay — pub’a düş */
    }
  }

  if (pub) return strip(pub)
  /**
   * Üretimde `NEXT_PUBLIC_API_URL` build'e hiç verilmediyse tarayıcıda kök boş kalırdı
   * (`NEXT_PUBLIC_API_URL_missing`). API genelde aynı domain + nginx `/api/v1` proxy ile
   * sunulur; bu durumda `origin` doğru API köküdür.
   */
  if (
    typeof window !== 'undefined' &&
    window.location?.origin &&
    process.env.NODE_ENV === 'production'
  ) {
    return strip(window.location.origin)
  }
  return ''
}
