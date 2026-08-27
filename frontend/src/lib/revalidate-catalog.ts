import { revalidatePath, revalidateTag } from 'next/cache'
import { fallbackLocaleCodes } from '@/lib/i18n-config'
import { revalidateCategoryDataTags } from '@/lib/revalidate-page-builder'

/**
 * İlan / kategori vitrin önbelleğini panel kaydından sonra düşürür.
 * Path’ler `isAllowedRevalidatePath` ile uyumlu önekler kullanır.
 */

const LISTING_DETAIL_SEGMENTS = [
  'otel',
  'tatil-evi',
  'yat',
  'tur',
  'aktivite',
  'gemi-turu',
  'hac-paket',
  'vize-basvuru',
  'arac',
  'car-listings',
  'tasima',
  'feribot-rezervasyon',
  'ucak-ilan',
  'plaj-sezlong-ilan',
  'sinema-bileti',
  'etkinlik',
  'restoran-masa',
  'stay-listings',
  'experience-listings',
] as const

export function listingDetailTag(handle: string): string {
  return `listing-detail-${handle.trim().toLowerCase()}`
}

export function revalidateListingDetailCaches(opts: {
  handle?: string
  categorySlug?: string
  /** Örn. otel, tur — verilirse locale × segment × handle path bust */
  detailSegment?: string
}): void {
  // 1. Ana sayfadaki vitrin ve arama etiketlerini düşür
  revalidateTag('public-listings', 'max')
  revalidateTag('homepage-featured', 'max')
  revalidatePath('/api/homepage-featured', 'page')

  // 2. Ana sayfa rotalarını tüm vitrin dillerinde düşür
  for (const loc of fallbackLocaleCodes) {
    revalidatePath(`/${loc}`, 'page')
    revalidatePath(`/${loc}`, 'layout')
  }

  // 3. İlan detay sayfasını düşür
  const handle = opts.handle?.trim()
  if (handle) {
    revalidateTag(listingDetailTag(handle), 'max')
    const segment =
      opts.detailSegment &&
      (LISTING_DETAIL_SEGMENTS as readonly string[]).includes(opts.detailSegment)
        ? opts.detailSegment
        : null
    if (segment) {
      for (const loc of fallbackLocaleCodes) {
        revalidatePath(`/${loc}/${segment}/${handle}`, 'page')
      }
    } else {
      // Segment bilinmiyorsa yaygın detay path’lerini dene (zararsız no-op)
      for (const loc of fallbackLocaleCodes) {
        for (const seg of LISTING_DETAIL_SEGMENTS) {
          revalidatePath(`/${loc}/${seg}/${handle}`, 'page')
        }
      }
    }
  }

  // 4. Kategori sayfasını düşür
  if (opts.categorySlug) {
    revalidateCategoryDataTags(opts.categorySlug)
    for (const loc of fallbackLocaleCodes) {
      revalidatePath(`/${loc}/${opts.categorySlug}`, 'layout')
      revalidatePath(`/${loc}/${opts.categorySlug}`, 'page')
    }
  }
}

export function revalidateBlogCaches(slug?: string): void {
  for (const loc of fallbackLocaleCodes) {
    revalidatePath(`/${loc}/blog`, 'layout')
    if (slug?.trim()) {
      revalidatePath(`/${loc}/blog/${slug.trim()}`, 'page')
    }
  }
}
