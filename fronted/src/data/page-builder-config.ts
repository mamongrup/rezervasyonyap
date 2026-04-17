/**
 * Server-side helper to load saved page builder config for a category.
 * Falls back to the registry's default modules if no custom config exists.
 */

import { promises as fs } from 'node:fs'
import path from 'node:path'
import type { CategoryPageBuilderConfig, FeaturedByRegionConfig, FeaturedRegionEntry, PageBuilderModule } from '@/types/listing-types'
export type { FeaturedByRegionConfig, FeaturedRegionEntry }
import { getCategoryBySlug } from './category-registry'
import { getLocalizedDefaultModules } from '@/lib/page-builder-default-modules'
import { getMessages } from '@/utils/getT'

export interface HomepageConfig {
  heroHeading: string
  heroSubheading: string
  heroCtaText: string
  heroCtaHref: string
  heroImages: [string, string, string]
  updatedAt: string
  /** Kayıtlı anasayfa page builder modülleri — yoksa `getHomepageDefaultModules` kullanılır */
  modules?: PageBuilderModule[]
}

const HOMEPAGE_CONFIG_PATH = path.join(process.cwd(), 'public', 'page-builder', 'homepage.json')

export async function getHomepageConfig(): Promise<HomepageConfig | null> {
  try {
    const raw = await fs.readFile(HOMEPAGE_CONFIG_PATH, 'utf-8')
    return JSON.parse(raw) as HomepageConfig
  } catch {
    return null
  }
}

// ─── Featured-by-region config ────────────────────────────────────────────────

const FEATURED_REGION_DIR = path.join(process.cwd(), 'public', 'featured-regions')

export async function getFeaturedRegionConfig(pageKey: string): Promise<FeaturedByRegionConfig | null> {
  try {
    const raw = await fs.readFile(path.join(FEATURED_REGION_DIR, `${pageKey}.json`), 'utf-8')
    return JSON.parse(raw) as FeaturedByRegionConfig
  } catch {
    return null
  }
}

// ─── Page builder ─────────────────────────────────────────────────────────────

const DATA_DIR = path.join(process.cwd(), 'public', 'page-builder')

export async function getCategoryPageBuilderConfig(
  categorySlug: string,
  locale = 'tr',
): Promise<PageBuilderModule[]> {
  const filePath = path.join(DATA_DIR, `${categorySlug.replace(/[^a-z0-9-]/g, '')}.json`)

  try {
    const raw = await fs.readFile(filePath, 'utf-8')
    const config = JSON.parse(raw) as CategoryPageBuilderConfig
    return config.modules
  } catch {
    const cat = getCategoryBySlug(categorySlug)
    if (!cat) return []
    const m = getMessages(locale)
    return getLocalizedDefaultModules(categorySlug, m).map((mod, i) => ({
      ...mod,
      id: `${categorySlug}-default-${i}`,
    }))
  }
}
