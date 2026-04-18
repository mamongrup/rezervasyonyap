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

/**
 * Loads region-specific hero config for a category+region combo.
 * Falls back to undefined if no config file exists.
 */
export async function getRegionHeroConfig(
  categorySlug: string,
  regionHandle: string,
): Promise<HeroOverride | undefined> {
  if (!categorySlug || !regionHandle || regionHandle === 'all') return undefined

  const filePath = path.join(DATA_DIR, `${categorySlug}--${regionHandle}.json`)
  try {
    const raw = await fs.readFile(filePath, 'utf8')
    const config = JSON.parse(raw) as RegionHeroConfig

    const allImages =
      config.images.length >= 3 && config.images[0] && config.images[1] && config.images[2]

    return {
      heading: config.heading || undefined,
      subheading: config.subheading || undefined,
      images: allImages
        ? ([config.images[0], config.images[1], config.images[2]] as [string, string, string])
        : undefined,
    }
  } catch {
    return undefined
  }
}
