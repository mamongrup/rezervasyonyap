import type { SubcategoryEntry } from '@/data/subcategory-registry'
import { tourSubcategoryListPath } from '@/lib/tour-subcategory-routes'
import { vitrinHref } from '@/lib/vitrin-href'

/**
 * Alt kategori liste URL’si — App Router iç yolu (`/tatil-evleri/villalar` vb.).
 * `vitrinHref` / `useVitrinHref` ile vitrin diline çevrilir.
 */
export function subcategoryInternalPath(entry: SubcategoryEntry): string {
  const custom = entry.href?.trim()
  if (custom) {
    return custom.startsWith('/') ? custom : `/${custom}`
  }
  const tourPath =
    entry.parentCategorySlug === 'turlar' ? tourSubcategoryListPath(entry.slug) : undefined
  if (tourPath) return tourPath
  const parent = entry.parentCategorySlug.trim()
  const slug = entry.slug.trim()
  if (!parent || !slug) return '/'
  return `/${parent}/${slug}`
}

/** Sunucu: locale’e göre vitrin href (ör. `/en/holiday-homes/villalar`). */
export async function subcategoryVitrinHref(locale: string, entry: SubcategoryEntry): Promise<string> {
  return vitrinHref(locale, subcategoryInternalPath(entry))
}

/** Birden fazla alt kategori için id → vitrin href haritası. */
export async function subcategoryVitrinHrefMap(
  locale: string,
  entries: SubcategoryEntry[],
): Promise<Record<string, string>> {
  const pairs = await Promise.all(
    entries.map(async (entry) => [entry.id, await subcategoryVitrinHref(locale, entry)] as const),
  )
  return Object.fromEntries(pairs)
}
