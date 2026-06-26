import { getPublicSiteUrl } from '@/lib/site-branding-seo'

export function buildListingOgImageUrl(opts: {
  kind: 'stay' | 'experience'
  handle: string
  locale: string
  variant?: 'og' | 'social'
  listingId?: string
  title?: string
  categoryCode?: string
  themeCodes?: string
}): string | null {
  const base = getPublicSiteUrl()
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
  return u.toString()
}
