import type { RegionSliderItem } from '@/components/SectionSliderRegions'

/** `/oteller/TR/antalya` ve `antalya` → karşılaştırılabilir anahtar */
export function normalizeRegionKey(slug: string): string {
  const s = slug.trim().replace(/^TR\//i, '').replace(/\/+$/, '')
  return s.toLowerCase()
}

/** Filtreli bölge sayfasında mevcut bölgeyi slider'dan çıkar */
export function filterRegionsForHandle(
  regions: RegionSliderItem[],
  currentHandle?: string,
): RegionSliderItem[] {
  if (!currentHandle || currentHandle === 'all') return regions
  const key = normalizeRegionKey(currentHandle)
  return regions.filter((r) => normalizeRegionKey(r.slug) !== key)
}

/** Sadece ilanı olan bölgeler (count > 0) */
export function regionsWithListings(regions: RegionSliderItem[]): RegionSliderItem[] {
  return regions.filter((r) => r.count > 0)
}
