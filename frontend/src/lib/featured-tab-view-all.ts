import { categorySupportsLuxuryEconomicTabs } from '@/lib/featured-listings-utils'
import type { FeaturedTabKind } from '@/lib/featured-listings-utils'

export type FeaturedVitrinTabParam = 'luxury' | 'economic'

/** Kategori listesi — fiyat analizine göre lüks / ekonomik tam liste */
export function buildFeaturedTabViewAllHref(
  categorySlug: string,
  kind: Extract<FeaturedTabKind, 'luxury' | 'economic'>,
): string {
  const base = `/${categorySlug}/all`
  if (!categorySupportsLuxuryEconomicTabs(categorySlug)) return base

  const u = new URLSearchParams({ vitrin_tab: kind })
  if (kind === 'luxury') u.set('sort', 'price_desc')
  if (kind === 'economic') u.set('sort', 'price_asc')
  return `${base}?${u.toString()}`
}

export function parseFeaturedVitrinTab(
  raw: string | undefined,
): FeaturedVitrinTabParam | undefined {
  const v = raw?.trim().toLowerCase()
  if (v === 'luxury' || v === 'economic') return v
  return undefined
}
