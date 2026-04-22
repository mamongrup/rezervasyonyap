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
  return strip(process.env.NEXT_PUBLIC_API_URL ?? '')
}
