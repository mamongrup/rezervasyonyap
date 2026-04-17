import { promises as fs } from 'node:fs'
import path from 'node:path'

const DATA_DIR = path.join(process.cwd(), 'public', 'region-hero')

export interface RegionHeroConfig {
  category: string
  region: string
  heading: string
  subheading: string
  images: [string, string, string]
  updatedAt: string
}

export interface HeroOverride {
  heading?: string
  subheading?: string
  images?: [string, string, string]
}

type RegionHeroCacheEntry = {
  expiresAt: number
  value: HeroOverride | undefined
}

const REGION_HERO_TTL_MS = 60_000
const REGION_HERO_MAX_ENTRIES = 120
const regionHeroCache = new Map<string, RegionHeroCacheEntry>()

/**
 * Loads region-specific hero config for a category+region combo.
 * Falls back to undefined if no config file exists.
 */
export async function getRegionHeroConfig(
  categorySlug: string,
  regionHandle: string,
): Promise<HeroOverride | undefined> {
  if (!categorySlug || !regionHandle || regionHandle === 'all') return undefined

  const cacheKey = `${categorySlug}|${regionHandle}`
  const cached = regionHeroCache.get(cacheKey)
  if (cached && cached.expiresAt > Date.now()) return cached.value
  if (cached && cached.expiresAt <= Date.now()) regionHeroCache.delete(cacheKey)

  const filePath = path.join(DATA_DIR, `${categorySlug}--${regionHandle}.json`)
  try {
    const raw = await fs.readFile(filePath, 'utf8')
    const config = JSON.parse(raw) as RegionHeroConfig

    const allImages =
      config.images.length >= 3 && config.images[0] && config.images[1] && config.images[2]

    const value: HeroOverride | undefined = {
      heading: config.heading || undefined,
      subheading: config.subheading || undefined,
      images: allImages
        ? ([config.images[0], config.images[1], config.images[2]] as [string, string, string])
        : undefined,
    }
    if (regionHeroCache.size >= REGION_HERO_MAX_ENTRIES) {
      const oldestKey = regionHeroCache.keys().next().value as string | undefined
      if (oldestKey) regionHeroCache.delete(oldestKey)
    }
    regionHeroCache.set(cacheKey, { value, expiresAt: Date.now() + REGION_HERO_TTL_MS })
    return value
  } catch {
    if (regionHeroCache.size >= REGION_HERO_MAX_ENTRIES) {
      const oldestKey = regionHeroCache.keys().next().value as string | undefined
      if (oldestKey) regionHeroCache.delete(oldestKey)
    }
    regionHeroCache.set(cacheKey, {
      value: undefined,
      expiresAt: Date.now() + REGION_HERO_TTL_MS,
    })
    return undefined
  }
}
