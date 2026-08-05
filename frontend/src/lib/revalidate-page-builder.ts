import { revalidatePath, revalidateTag } from 'next/cache'
import { fallbackLocaleCodes } from '@/lib/i18n-config'
import { regionBrowseSegment } from '@/lib/region-public-path'

/** Kategori vitrin `unstable_cache` etiketleri — `category-page-data` / `category-page-shell-cache`. */
export const CATEGORY_LISTING_TAG_PREFIX = 'category-listings-'
export const CATEGORY_SHELL_TAG_PREFIX = 'category-shell-'

const KNOWN_CATEGORY_SLUGS = [
  'oteller',
  'tatil-evleri',
  'yat-kiralama',
  'turlar',
  'aktiviteler',
  'kruvaziyer',
  'hac-umre',
  'vize',
  'arac-kiralama',
  'transfer',
  'feribot',
  'ucak-bileti',
  'plaj-sezlong',
  'sinema-biletleri',
  'etkinlikler',
  'restoran-rezervasyon',
] as const

export function revalidateCategoryDataTags(categorySlug: string): void {
  const slug = categorySlug.trim().toLowerCase()
  if (!slug) return
  revalidateTag(`${CATEGORY_LISTING_TAG_PREFIX}${slug}`, 'max')
  revalidateTag(`${CATEGORY_SHELL_TAG_PREFIX}${slug}`, 'max')
}

export function revalidateAllCategoryDataTags(): void {
  for (const slug of KNOWN_CATEGORY_SLUGS) {
    revalidateCategoryDataTags(slug)
  }
}

/** Sayfa düzeni JSON’u okuyan ISR sayfalarını panel kaydından sonra tazeler. */
export function revalidateAfterPageBuilderSave(slug: string): void {
  for (const loc of fallbackLocaleCodes) {
    const base = `/${loc}`
    if (slug === 'homepage') {
      revalidatePath(base, 'page')
      continue
    }
    if (slug === 'ara') {
      revalidatePath(`${base}/ara`, 'layout')
      continue
    }
    if (slug === 'bolge-detay') {
      const seg = regionBrowseSegment(loc)
      revalidatePath(`${base}/${seg}`, 'layout')
      continue
    }
    revalidatePath(`${base}/${slug}`, 'layout')
  }
  // Kategori slug’ıysa liste + shell unstable_cache’ini de düşür
  if ((KNOWN_CATEGORY_SLUGS as readonly string[]).includes(slug)) {
    revalidateCategoryDataTags(slug)
  }
  if (slug === 'homepage') {
    revalidateAllCategoryDataTags()
  }
}

/** Ana sayfa hero / homepage-config kaydı — yalnızca locale kökü. */
export function revalidateHomepageLocales(): void {
  for (const loc of fallbackLocaleCodes) {
    revalidatePath(`/${loc}`, 'page')
  }
}

/** İçerik → Kategori Resimleri kaydı — tüm locale ağaçları (slider/grid thumb havuzu) */
export function revalidateAfterSharedTravelCategoryThumbnailsSave(): void {
  for (const loc of fallbackLocaleCodes) {
    revalidatePath(`/${loc}`, 'layout')
  }
  revalidateAllCategoryDataTags()
}
