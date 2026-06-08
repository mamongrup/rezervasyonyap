import { promises as fs } from 'node:fs'
import path from 'node:path'
import { normalizeFeaturedDisplayCount, safeCategorySlug } from '@/lib/featured-listings-utils'
import type { FeaturedListingsConfig } from '@/types/listing-types'

const DATA_DIR = path.join(process.cwd(), 'public', 'featured-listings')

export async function getFeaturedListingsConfig(
  categorySlug: string,
): Promise<FeaturedListingsConfig | null> {
  const slug = safeCategorySlug(categorySlug)
  if (!slug) return null
  try {
    const raw = await fs.readFile(path.join(DATA_DIR, `${slug}.json`), 'utf-8')
    const parsed = JSON.parse(raw) as FeaturedListingsConfig
    if (!Array.isArray(parsed.listingIds)) return null
    return {
      ...parsed,
      categorySlug: slug,
      listingIds: parsed.listingIds.filter(Boolean),
      displayCount: normalizeFeaturedDisplayCount(parsed.displayCount),
    }
  } catch {
    return null
  }
}
