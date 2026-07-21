import { getCategoryBySlug } from '@/data/category-registry'
import { resolveCategoryDisplay } from '@/lib/localized-category'
import { getPublicSiteUrl, shareOgImageMeta } from '@/lib/site-branding-seo'
import type { Metadata } from 'next'

/**
 * Returns locale-aware title & description metadata for a category page.
 * Usage: export async function generateMetadata({ params }) { return categoryMetadata('slug', (await params).locale) }
 *
 * WhatsApp/Facebook için mutlak JPEG `og:image` ekler (layout AVIF logosunu ezmez).
 */
export function categoryMetadata(slug: string, locale?: string): Metadata {
  const raw = getCategoryBySlug(slug)
  const category = raw ? resolveCategoryDisplay(raw, locale ?? 'tr') : null
  const title = category?.name
  const description = category?.heroSubheading
  const shareImage = shareOgImageMeta(getPublicSiteUrl(), null, title || 'Rezervasyon Yap')

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
