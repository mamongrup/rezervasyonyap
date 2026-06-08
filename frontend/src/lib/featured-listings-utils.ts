/** Vitrin öne çıkan ilan yardımcıları — istemci + sunucu güvenli (fs yok). */

export const DEFAULT_FEATURED_DISPLAY_COUNT = 4
export const MAX_FEATURED_DISPLAY_COUNT = 24

export function normalizeFeaturedDisplayCount(raw: unknown): number {
  const n = typeof raw === 'number' ? raw : Number(raw)
  if (!Number.isFinite(n)) return DEFAULT_FEATURED_DISPLAY_COUNT
  return Math.min(MAX_FEATURED_DISPLAY_COUNT, Math.max(1, Math.round(n)))
}

export function safeCategorySlug(raw: string | null | undefined): string {
  if (!raw) return ''
  return raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 96)
}

/** Seçili ilanları başa al; geri kalanı mevcut sırayla devam eder. */
export function applyFeaturedListingOrder<T extends { id: string }>(
  listings: T[],
  featuredIds: string[],
): T[] {
  if (featuredIds.length === 0) return listings
  const byId = new Map(listings.map((l) => [l.id, l]))
  const featured = featuredIds.map((id) => byId.get(id)).filter((l): l is T => Boolean(l))
  const featuredSet = new Set(featuredIds)
  const rest = listings.filter((l) => !featuredSet.has(l.id))
  return [...featured, ...rest]
}

/** «Öne Çıkan» sekmesi — panel seçimi varsa yalnızca onlar. */
export function pickFeaturedTabListings<T extends { id: string; isCampaign?: boolean }>(
  listings: T[],
  featuredIds: string[],
): T[] {
  if (featuredIds.length > 0) {
    const byId = new Map(listings.map((l) => [l.id, l]))
    return featuredIds.map((id) => byId.get(id)).filter((l): l is T => Boolean(l))
  }
  return listings.filter((l) => l.isCampaign)
}
