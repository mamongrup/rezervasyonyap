import { getCategoryBySlug } from '@/data/category-registry'
import { categoryOgImageMeta, categorySeoCopy } from '@/lib/category-seo'
import { resolveCategoryDisplay } from '@/lib/localized-category'
import { buildLocaleAlternatesLocalized } from '@/lib/metadata-i18n'
import { resolveCanonicalBaseUrl } from '@/lib/resolve-canonical-base-url'
import { brandingSiteName, ogLocaleForSite } from '@/lib/site-branding-seo'
import { getCachedSiteConfig } from '@/lib/site-config-cache'
import { resolveRequestBranding } from '@/lib/request-branding-seo'
import type { Metadata } from 'next'
import type { SitePublicConfig } from '@/lib/travel-api'

/** Kategori hub sayfası için dil, canonical, sosyal görsel ve arama sonucu metadata sözleşmesi. */
export async function categoryMetadata(slug: string, locale?: string): Promise<Metadata> {
  const loc = locale ?? 'tr'
  const raw = getCategoryBySlug(slug)
  const category = raw ? resolveCategoryDisplay(raw, loc) : null
  const base = await resolveCanonicalBaseUrl()
  const pub = await getCachedSiteConfig()
  const { branding: hostBranding } = await resolveRequestBranding(
    (pub?.branding ?? null) as Record<string, unknown> | null,
  )
  const pubForBrand = (pub ? { ...pub, branding: hostBranding } : null) as SitePublicConfig | null
  const siteName = brandingSiteName(pubForBrand)
  const categoryName = category?.name || slug
  const copy = category
    ? categorySeoCopy(category, loc)
    : { title: categoryName, description: categoryName }
  const hubPath = category?.categoryRoute ? `${category.categoryRoute}/all` : `/${slug}/all`
  const alternates = await buildLocaleAlternatesLocalized(loc, hubPath)
  const canonicalRaw = alternates.alternates?.canonical
  const canonical =
    typeof canonicalRaw === 'string' || canonicalRaw instanceof URL ? canonicalRaw : undefined
  const shareImage = categoryOgImageMeta(base, slug, `${categoryName} rezervasyon seçenekleri`)

  return {
    title: copy.title,
    description: copy.description,
    robots: { index: true, follow: true },
    ...alternates,
    openGraph: {
      title: `${copy.title} | ${siteName}`,
      description: copy.description,
      siteName,
      locale: ogLocaleForSite(loc),
      ...(canonical ? { url: canonical } : {}),
      images: [shareImage],
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: `${copy.title} | ${siteName}`,
      description: copy.description,
      images: [shareImage.url],
    },
  }
}
