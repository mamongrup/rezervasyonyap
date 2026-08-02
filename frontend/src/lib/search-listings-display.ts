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

/**
 * Baransen yat ↔ Bravo villa id çakışması: slug villa adı, galeri /yatlar/{kanonik}/.
 * Arama/öneride bu bozuk kimlikler villa sanılıp "Yat kiralama" diye çıkmasın.
 */
export function isYachtIdentityCollision(item: PublicListingItem): boolean {
  if (item.category_code !== 'yacht_charter') return false
  const img = (item.featured_image_url || item.thumbnail_url || '').trim()
  const m = img.match(/\/yatlar\/([^/]+)\//i)
  if (!m) return false
  return normalizeSlugKey(m[1]) !== normalizeSlugKey(item.slug)
}

/** Aynı slug için çift kayıt (biri çeviri başlığı, biri ham slug) — en iyi satırı bırak.
 *  Kategori + slug ile ayır: holiday_home ugurlu-villa ile bozuk yacht ugurlu-villa çakışmasın.
 */
export function dedupeSearchListings(items: PublicListingItem[]): PublicListingItem[] {
  const byKey = new Map<string, PublicListingItem>()
  for (const item of items) {
    if (isYachtIdentityCollision(item)) continue
    const slugKey = normalizeSlugKey(item.slug)
    if (!slugKey) continue
    const key = `${item.category_code || ''}:${slugKey}`
    const prev = byKey.get(key)
    if (!prev || listingDisplayScore(item) > listingDisplayScore(prev)) {
      byKey.set(key, item)
    }
  }
  return [...byKey.values()]
}

export function publicListingDetailPath(categoryCode: string, slug: string): string {
  const seg = DETAIL_SEGMENT[categoryCode] ?? 'otel'
  return `/${seg}/${slug}`
}

/**
 * Arama / vitrin alt başlıkları: önce `listing.browseCategory`, yoksa
 * `categoryPage.verticalLabels`. Eksik browse anahtarında ham kod (`activity`) görünmez.
 */
export function searchCategoryLabelsFromMessages(msgs: {
  listing?: { browseCategory?: Record<string, string> }
  categoryPage?: { verticalLabels?: Record<string, string> }
}): Record<string, string> {
  return {
    ...(msgs.categoryPage?.verticalLabels ?? {}),
    ...(msgs.listing?.browseCategory ?? {}),
  }
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

/**
 * Hero / kategori yoluna göre `listing-search` için `category_code`.
 * Ana sayfa veya bilinmeyen yol → `undefined` (tüm kategoriler).
 */
export function listingCategoryCodeForHeroPath(path: string): string | undefined {
  const p = (path.split('?')[0] ?? path).trim() || '/'
  if (p.startsWith('/oteller') || p.includes('/oteller-harita')) return 'hotel'
  if (p.startsWith('/tatil-evleri') || p.includes('/tatil-evleri-harita')) return 'holiday_home'
  if (p.startsWith('/yat-kiralama') || p.includes('/yat-kiralama-harita')) return 'yacht_charter'
  if (
    p.startsWith('/turlar') ||
    p.includes('/turlar-harita') ||
    p.startsWith('/hac-umre') ||
    p.startsWith('/vize')
  ) {
    return 'tour'
  }
  if (p.startsWith('/kruvaziyer') || p.includes('/kruvaziyer-harita')) return 'cruise'
  if (
    p.startsWith('/aktiviteler') ||
    p.includes('/aktiviteler-harita') ||
    p.startsWith('/plaj-sezlong') ||
    p.startsWith('/sinema-biletleri') ||
    p.startsWith('/etkinlikler') ||
    p.startsWith('/restoran-rezervasyon')
  ) {
    return 'activity'
  }
  return undefined
}
