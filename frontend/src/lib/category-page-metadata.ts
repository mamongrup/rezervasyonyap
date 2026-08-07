import { getCategoryBySlug } from '@/data/category-registry'
import { resolveCategoryDisplay } from '@/lib/localized-category'
import { buildLocaleAlternatesLocalized } from '@/lib/metadata-i18n'
import { resolveCanonicalBaseUrl } from '@/lib/resolve-canonical-base-url'
import { brandingSiteName, shareOgImageMeta } from '@/lib/site-branding-seo'
import { getCachedSiteConfig } from '@/lib/site-config-cache'
import { resolveRequestBranding } from '@/lib/request-branding-seo'
import type { Metadata } from 'next'
import type { SitePublicConfig } from '@/lib/travel-api'

/**
 * Returns locale-aware title & description metadata for a category page.
 * Usage: export async function generateMetadata({ params }) { return categoryMetadata('slug', (await params).locale) }
 *
 * WhatsApp/Facebook için mutlak JPEG `og:image` ekler (layout AVIF logosunu ezmez).
 * Canonical + hreflang: `/[slug]/all` hub yolu.
 */
export async function categoryMetadata(slug: string, locale?: string): Promise<Metadata> {
  const loc = locale ?? 'tr'
  const raw = getCategoryBySlug(slug)
  const category = raw ? resolveCategoryDisplay(raw, loc) : null
  const title = category?.name
  const description = category?.heroSubheading
  const base = await resolveCanonicalBaseUrl()
  const pub = await getCachedSiteConfig()
  const { branding: hostBranding } = await resolveRequestBranding(
    (pub?.branding ?? null) as Record<string, unknown> | null,
  )
  const pubForBrand = (pub ? { ...pub, branding: hostBranding } : null) as SitePublicConfig | null
  const siteName = brandingSiteName(pubForBrand)
  const shareImage = shareOgImageMeta(base, pubForBrand, title || siteName || 'Rezervasyon Yap')
  const hubPath = category?.categoryRoute ? `${category.categoryRoute}/all` : `/${slug}/all`
  const alternates = await buildLocaleAlternatesLocalized(loc, hubPath)

  const categoryName = title || slug
  const richTitle = `${categoryName} — En Uygun Fiyatlar ve Erken Rezervasyon`
  const richDescription =
    description?.trim() ||
    `${categoryName} kategorisinde en iyi fiyat garantisi, detaylı fotoğraflar, gerçek misafir değerlendirmeleri ve anında güvenli online rezervasyon imkanı.`

  return {
    title: richTitle,
    description: richDescription,
    ...alternates,
    openGraph: {
      title: `${richTitle} | ${siteName}`,
      description: richDescription,
      ...(shareImage && { images: [shareImage] }),
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: `${richTitle} | ${siteName}`,
      description: richDescription,
      ...(shareImage && { images: [shareImage.url] }),
    },
  }
}
