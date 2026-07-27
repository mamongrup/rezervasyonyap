/**
 * Harici ilan görselleri — tarayıcıda hotlink / bölgesel engel riski olan CDN'ler
 * kendi origin'imiz üzerinden proxy'lenir (`/api/listing-ext-image`).
 */
import { preferListingGalleryFullAsset } from '@/lib/listing-gallery-display-url'

/** Vitrin kartında proxy gerektiren host sonekleri (travelapi/hotelbeds genelde doğrudan açılır). */
const PROXY_HOST_SUFFIXES = [
  'bookeder.com',
  'productcdn.tatilbudur.com',
  'aegeanhotels.net',
  'reserwation.com',
  'fairystonetravel.com',
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
    'i.travelapi.com',
    'photos.hotelbeds.com',
    'cdn.kplus.com.tr',
    'pics.avs.io',
    'fairystonetravel.com',
    ...PROXY_HOST_SUFFIXES,
  ] as const
  for (const suffix of allowed) {
    if (host === suffix || host.endsWith(`.${suffix}`)) return true
  }
  return false
}
