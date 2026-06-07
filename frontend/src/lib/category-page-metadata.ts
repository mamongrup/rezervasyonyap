import { getCategoryBySlug } from '@/data/category-registry'
import { resolveCategoryDisplay } from '@/lib/localized-category'
import type { Metadata } from 'next'

/**
 * Returns locale-aware title & description metadata for a category page.
 * Usage: export async function generateMetadata({ params }) { return categoryMetadata('slug', (await params).locale) }
 */
export function categoryMetadata(slug: string, locale?: string): Metadata {
  const raw = getCategoryBySlug(slug)
  const category = raw ? resolveCategoryDisplay(raw, locale ?? 'tr') : null
  return {
    title: category?.name,
    description: category?.heroSubheading,
  }
}
