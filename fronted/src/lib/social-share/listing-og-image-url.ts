import { getPublicSiteUrl } from '@/lib/site-branding-seo'

export function buildListingOgImageUrl(opts: {
  kind: 'stay' | 'experience'
  handle: string
  locale: string
}): string | null {
  const base = getPublicSiteUrl()
  if (!base) return null
  const u = new URL('/api/og/listing', base)
  u.searchParams.set('kind', opts.kind)
  u.searchParams.set('handle', opts.handle)
  u.searchParams.set('locale', opts.locale)
  return u.toString()
}
