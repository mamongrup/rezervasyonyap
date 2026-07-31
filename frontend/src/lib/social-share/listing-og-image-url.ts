import { getPublicSiteUrl } from '@/lib/site-branding-seo'
import { siteOriginForDeploymentHost } from '@/lib/resolve-canonical-base-url'

/**
 * Listing Open Graph / WhatsApp image URL.
 * `siteBase` verilirse (önerilen: `resolveCanonicalBaseUrl`) marka host’a göre üretilir;
 * aksi halde `NEXT_PUBLIC_SITE_URL`.
 */
export function buildListingOgImageUrl(opts: {
  kind: 'stay' | 'experience'
  handle: string
  locale: string
  variant?: 'og' | 'social'
  listingId?: string
  title?: string
  categoryCode?: string
  themeCodes?: string
  /** Örn. https://rezervasyonyap.com.tr — WhatsApp paylaşım host’u ile aynı olsun */
  siteBase?: string | null
}): string | null {
  const base = (opts.siteBase ?? getPublicSiteUrl()).replace(/\/$/, '')
  if (!base) return null
  const u = new URL('/api/og/listing', base)
  u.searchParams.set('kind', opts.kind)
  u.searchParams.set('handle', opts.handle)
  u.searchParams.set('locale', opts.locale)
  if (opts.variant && opts.variant !== 'og') {
    u.searchParams.set('variant', opts.variant)
  }
  if (opts.listingId) u.searchParams.set('listing_id', opts.listingId)
  if (opts.title) u.searchParams.set('title', opts.title)
  if (opts.categoryCode) u.searchParams.set('category_code', opts.categoryCode)
  if (opts.themeCodes) u.searchParams.set('theme_codes', opts.themeCodes)
  // WhatsApp/Facebook OG önbelleğini kırmak — JPEG kapak sürümü
  if (!opts.variant || opts.variant === 'og') {
    u.searchParams.set('v', '3')
  }
  return u.toString()
}

/** İstek Host’undan OG kökü (marka domain). */
export function listingOgSiteBaseFromHost(hostname: string | null | undefined): string {
  const host = (hostname ?? '').split(',')[0]?.trim().split(':')[0]?.trim() ?? ''
  if (host) {
    const fromHost = siteOriginForDeploymentHost(host)
    if (fromHost) return fromHost
  }
  return getPublicSiteUrl().replace(/\/$/, '')
}
