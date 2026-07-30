import { getCategoryBySlug } from '@/data/category-registry'
import { resolveCategoryDisplay } from '@/lib/localized-category'
import { resolveCanonicalBaseUrl } from '@/lib/resolve-canonical-base-url'
import { shareOgImageMeta } from '@/lib/site-branding-seo'
import type { Metadata } from 'next'

/**
 * Returns locale-aware title & description metadata for a category page.
 * Usage: export async function generateMetadata({ params }) { return categoryMetadata('slug', (await params).locale) }
 *
 * WhatsApp/Facebook için mutlak JPEG `og:image` ekler (layout AVIF logosunu ezmez).
 */
export async function categoryMetadata(slug: string, locale?: string): Promise<Metadata> {
  const raw = getCategoryBySlug(slug)
  const category = raw ? resolveCategoryDisplay(raw, locale ?? 'tr') : null
  const title = category?.name
  const description = category?.heroSubheading
  const base = await resolveCanonicalBaseUrl()
  const shareImage = shareOgImageMeta(base, null, title || 'Rezervasyon Yap')

  return {
    title,
    description,
    openGraph: {
      title: title || undefined,
      description: description || undefined,
      ...(shareImage && { images: [shareImage] }),
    },
    twitter: {
      card: 'summary_large_image',
      title: title || undefined,
      description: description || undefined,
      ...(shareImage && { images: [shareImage.url] }),
    },
  }
}
