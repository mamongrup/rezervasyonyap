import { en } from '@locales/en'
import type { FeaturedByRegionConfig, FeaturedRegionEntry, TListingBase } from '@/types/listing-types'

/**
 * İlan listesinden otomatik bölge yapılandırması üretir (sunucu bileşenlerinde güvenle çağrılabilir).
 * En fazla ilana sahip şehirler önce gelir.
 */
export function buildDefaultFeaturedRegionConfig(
  allListings: TListingBase[],
  opts: { heading?: string; subheading?: string; viewAllHref?: string } = {},
): FeaturedByRegionConfig {
  const counts: Record<string, number> = {}
  for (const l of allListings) {
    const city = l.city
    if (city) counts[city] = (counts[city] ?? 0) + 1
  }

  const regions: FeaturedRegionEntry[] = Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .map(([name]) => ({
      name,
      slug: name
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/İ/g, 'i')
        .replace(/ı/g, 'i')
        .replace(/ş/g, 's')
        .replace(/ğ/g, 'g')
        .replace(/ü/g, 'u')
        .replace(/ö/g, 'o')
        .replace(/ç/g, 'c'),
    }))

  return {
    heading: opts.heading ?? en.homePage.featuredStay.heading,
    subheading: opts.subheading ?? en.homePage.featuredStay.subheading,
    viewAllHref: opts.viewAllHref,
    regions,
  }
}
