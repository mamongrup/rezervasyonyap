/**
 * Gleam API kökü (sonda `/` yok).
 * - Tarayıcı: `NEXT_PUBLIC_API_URL` (genelde public site origin).
 * - Sunucu (RSC, Route Handlers): `INTERNAL_API_ORIGIN` tanımlıysa o kullanılır — VPS’te kendi
 *   domain’ine hairpin/NAT olmadan çıkamama (`ConnectTimeoutError: rezervasyonyap.tr:443`) önlenir.
 *   Örnek: `INTERNAL_API_ORIGIN=http://127.0.0.1:8080`
 */
export function apiOriginForFetch(): string {
  const strip = (s: string) => s.replace(/\/$/, '')
  const internal = process.env.INTERNAL_API_ORIGIN?.trim()
  if (internal && typeof window === 'undefined') {
    return strip(internal)
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
