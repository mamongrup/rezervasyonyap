import { promises as fs } from 'node:fs'
import path from 'node:path'
import { normalizeFeaturedListingsConfig, safeCategorySlug } from '@/lib/featured-listings-utils'
import type { FeaturedListingsConfig } from '@/types/listing-types'

const DATA_DIR = path.join(process.cwd(), 'public', 'featured-listings')

export async function getFeaturedListingsConfig(
  categorySlug: string,
): Promise<FeaturedListingsConfig | null> {
  const slug = safeCategorySlug(categorySlug)
  if (!slug) return null
  try {
    const raw = await fs.readFile(path.join(DATA_DIR, `${slug}.json`), 'utf-8')
    const parsed = JSON.parse(raw) as Partial<FeaturedListingsConfig>
    return normalizeFeaturedListingsConfig(parsed, slug)
  } catch {
    return null
  }
}
