/**
 * Harici ilan görselleri — tarayıcıda hotlink / bölgesel engel riski olan CDN'ler
 * kendi origin'imiz üzerinden proxy'lenir (`/api/listing-ext-image`).
 */
import { preferListingGalleryFullAsset } from '@/lib/listing-gallery-display-url'

/** Vitrin kartında proxy gerektiren host sonekleri (travelapi/hotelbeds genelde doğrudan açılır). */
const PROXY_HOST_SUFFIXES = [
  'bookeder.com',
  // productcdn.tatilbudur.com: VPS egress sık 504; tarayıcı doğrudan 200 — proxy etme.
  'aegeanhotels.net',
  'reserwation.com',
  'fairystonetravel.com',
  'upload.wikimedia.org',
  'integration-static.yolcu360.com',
  'static.yolcu360.com',
] as const

export function listingExtImageNeedsProxy(url: string): boolean {
  const s = url.trim()
  if (!/^https?:\/\//i.test(s)) return false
  try {
    const host = new URL(s).hostname.toLowerCase()
    return PROXY_HOST_SUFFIXES.some((suffix) => host === suffix || host.endsWith(`.${suffix}`))
  } catch {
    return false
  }
}

export function listingExtImageProxyPath(upstreamUrl: string): string {
  return `/api/listing-ext-image?u=${encodeURIComponent(upstreamUrl.trim())}`
}

/** Kapak / galeri URL'si — kplus unwrap, aegean→bookeder, thumb upgrade, gerekirse proxy. */
export function resolveListingDisplayImageUrl(raw: string | null | undefined): string {
  const normalized = preferListingGalleryFullAsset(String(raw ?? '').trim())
  if (!normalized) return ''
  if (listingExtImageNeedsProxy(normalized)) {
    return listingExtImageProxyPath(normalized)
  }
  return normalized
}

/** Proxy route allowlist — SSRF koruması. */
export function isAllowedListingExtImageHost(hostname: string): boolean {
  const host = hostname.toLowerCase()
  const allowed = [
    'bookeder.com',
    'productcdn.tatilbudur.com',
    'reserwation.com',
    'fairystonetravel.com',
    'upload.wikimedia.org',
    'i.travelapi.com',
    'photos.hotelbeds.com',
    'cdn.kplus.com.tr',
    'pics.avs.io',
    'integration-static.yolcu360.com',
    'static.yolcu360.com',
    'yolcu360.com',
    ...PROXY_HOST_SUFFIXES,
  ] as const
  for (const suffix of allowed) {
    if (host === suffix || host.endsWith(`.${suffix}`)) return true
  }
  return false
}
