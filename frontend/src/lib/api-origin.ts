/**
 * Gleam API kökü (sonda `/` yok).
 * - Tarayıcı: `NEXT_PUBLIC_API_URL` (genelde public site origin).
 * - Sunucu (RSC, Route Handlers): sırayla `INTERNAL_API_ORIGIN`, yoksa `API_URL`, sonra `NEXT_PUBLIC_API_URL`.
 *   VPS’te yalnızca public URL kullanılırsa kendi domain’ine hairpin/NAT olmadan çıkamama olabilir;
 *   bu yüzden üretimde loopback tercih edilir: `INTERNAL_API_ORIGIN=http://127.0.0.1:8080`
 *   (`deploy/systemd/frontend.env.example`). `API_URL` yedek olarak `listing-search` route ile uyumludur.
 */
export function apiOriginForFetch(): string {
  const strip = (s: string) => s.replace(/\/$/, '')
  if (typeof window === 'undefined') {
    const internal = process.env.INTERNAL_API_ORIGIN?.trim()
    if (internal) return strip(internal)
    const apiUrl = process.env.API_URL?.trim()
    if (apiUrl) return strip(apiUrl)
  }
  const pub = process.env.NEXT_PUBLIC_API_URL?.trim() ?? ''
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
