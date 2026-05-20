/**
 * Yakın mekan (POI) görselleri — vitrinde güvenilir URL ve yedek görsel.
 * Google Place Photo URL'leri tarayıcıda genelde kırılır (referrer, süresi dolan ref, anahtar kısıtı).
 */

/** Tema vitrininde kullanılan genel yer tutucu (mega menü / modül varsayılanları ile uyumlu). */
export const NEARBY_POI_FALLBACK_SRC = '/uploads/external/604495586a104b5cbac8.avif'

const GOOGLE_PLACE_PHOTO_RE = /maps\.googleapis\.com\/maps\/api\/place\/photo/i

export function buildPlacePhotoProxySrc(photoReference: string, maxwidth = 800): string {
  const ref = photoReference.trim()
  const width = Number.isFinite(maxwidth) ? Math.min(Math.max(Math.round(maxwidth), 64), 1600) : 800
  return `/api/place-photo?maxwidth=${width}&photo_reference=${encodeURIComponent(ref)}`
}

export function isGooglePlacePhotoUrl(url: string): boolean {
  return GOOGLE_PLACE_PHOTO_RE.test(url.trim())
}

/** Vitrinde doğrudan `<img src>` olarak kullanılabilir mi? */
export function isClientRenderablePoiImageUrl(url: string | undefined | null): boolean {
  const s = typeof url === 'string' ? url.trim() : ''
  if (!s) return false
  if (isGooglePlacePhotoUrl(s)) return true
  if (s.startsWith('/uploads/') || s.startsWith('/api/')) return true
  if (/^https?:\/\//i.test(s)) return true
  if (s.startsWith('//')) return true
  return false
}

/** POI kartı için gösterilecek src; güvenilir değilse null (çağıran yedek gösterir). */
export function resolveNearbyPoiImageSrc(url: string | undefined | null): string | null {
  const s = typeof url === 'string' ? url.trim() : ''
  if (!isClientRenderablePoiImageUrl(s)) return null
  if (isGooglePlacePhotoUrl(s)) {
    try {
      const u = new URL(s)
      const ref = u.searchParams.get('photo_reference') ?? ''
      if (!ref) return null
      const width = Number(u.searchParams.get('maxwidth') ?? 800)
      return buildPlacePhotoProxySrc(ref, width)
    } catch {
      return null
    }
  }
  if (s.startsWith('//')) return `https:${s}`
  return s
}
