import type { PublicListingItem } from '@/lib/travel-api'

const DETAIL_SEGMENT: Record<string, string> = {
  hotel: 'otel',
  holiday_home: 'tatil-evi',
  yacht_charter: 'yat',
  tour: 'tur',
  activity: 'aktivite',
  cruise: 'gemi-turu',
  transfer: 'tasima',
  car_rental: 'arac',
  ferry: 'feribot-rezervasyon',
  hajj: 'hac-paket',
  visa: 'vize-basvuru',
  flight: 'ucak-ilan',
}

export const SEARCH_MIN_QUERY_LEN = 3

function normalizeSlugKey(slug: string): string {
  return slug.trim().toLowerCase().replace(/[^a-z0-9]+/g, '')
}

export function isSlugLikeTitle(title: string, slug: string): boolean {
  const t = title.trim().toLowerCase()
  const s = slug.trim().toLowerCase()
  if (!t || !s) return false
  return t === s || t.replace(/\s+/g, '-') === s || t.replace(/[^a-z0-9]+/g, '') === s.replace(/[^a-z0-9]+/g, '')
}

function listingDisplayScore(item: PublicListingItem): number {
  let score = 0
  if (item.featured_image_url?.trim() || item.thumbnail_url?.trim()) score += 4
  if (!isSlugLikeTitle(item.title, item.slug)) score += 3
  if ((item.title?.length ?? 0) > (item.slug?.length ?? 0) + 2) score += 1
  return score
}

/** Aynı slug için çift kayıt (biri çeviri başlığı, biri ham slug) — en iyi satırı bırak */
export function dedupeSearchListings(items: PublicListingItem[]): PublicListingItem[] {
  const bySlug = new Map<string, PublicListingItem>()
  for (const item of items) {
    const key = normalizeSlugKey(item.slug)
    if (!key) continue
    const prev = bySlug.get(key)
    if (!prev || listingDisplayScore(item) > listingDisplayScore(prev)) {
      bySlug.set(key, item)
    }
  }
  return [...bySlug.values()]
}

export function publicListingDetailPath(categoryCode: string, slug: string): string {
  const seg = DETAIL_SEGMENT[categoryCode] ?? 'otel'
  return `/${seg}/${slug}`
}

export function categoryLabelForSearch(
  categoryCode: string,
  labels: Record<string, string> | undefined,
): string {
  const code = categoryCode.trim()
  if (!code) return ''
  const fromMessages = labels?.[code]
  if (fromMessages) return fromMessages
  return code.replace(/_/g, ' ')
}
