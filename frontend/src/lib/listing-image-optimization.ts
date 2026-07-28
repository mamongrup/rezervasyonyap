/**
 * Kart/liste görsellerinde yerel `/uploads` kaynaklarını Next image optimizer'a bırakırız:
 * - daha küçük responsive türevler üretir
 * - ham AVIF decode sorunlarını azaltır
 * Harici/proxy/data URL'leri ise doğrudan yüklemek daha güvenlidir.
 */
export function shouldUnoptimizeListingImage(src: string): boolean {
  const s = src.trim()
  if (!s) return true
  if (s.startsWith('data:')) return true
  if (s.startsWith('/api/listing-ext-image')) return true
  if (/^https?:\/\//i.test(s)) return true
  return false
}
