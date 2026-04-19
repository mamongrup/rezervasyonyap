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

// ─── Slider & banner config ───────────────────────────────────────────────────

import { normalizeLocalizedText, type LocalizedText } from '@/lib/sliders-i18n'

const SLIDERS_DIR = path.join(process.cwd(), 'public', 'sliders')

export type SliderTextAlign = 'left' | 'center' | 'right'
export type SliderTextTheme = 'light' | 'dark'

export interface SlidersBannerSlide {
  id: string
  enabled: boolean
  eyebrow?: LocalizedText
  title?: LocalizedText
  subtitle?: LocalizedText
  ctaText?: LocalizedText
  ctaHref?: string
  imageUrl?: string
  mobileImageUrl?: string
  overlay?: number
  textTheme?: SliderTextTheme
  align?: SliderTextAlign
}

export interface SlidersBannerConfig {
  autoplayMs: number
  height: 'short' | 'normal' | 'tall'
  showArrows: boolean
  showDots: boolean
  slides: SlidersBannerSlide[]
  updatedAt: string
}

function normalizeSlide(raw: Record<string, unknown>, idx: number): SlidersBannerSlide {
  const overlayRaw = Number(raw.overlay)
  const align: SliderTextAlign =
    raw.align === 'left' || raw.align === 'right' ? (raw.align as SliderTextAlign) : 'center'
  const textTheme: SliderTextTheme = raw.textTheme === 'dark' ? 'dark' : 'light'
  return {
    id: typeof raw.id === 'string' && raw.id ? raw.id : `slide-${idx}`,
    enabled: raw.enabled !== false,
    eyebrow: normalizeLocalizedText(raw.eyebrow),
    title: normalizeLocalizedText(raw.title),
    subtitle: normalizeLocalizedText(raw.subtitle),
    ctaText: normalizeLocalizedText(raw.ctaText),
    ctaHref: typeof raw.ctaHref === 'string' ? raw.ctaHref : '',
    imageUrl: typeof raw.imageUrl === 'string' ? raw.imageUrl : '',
    mobileImageUrl: typeof raw.mobileImageUrl === 'string' ? raw.mobileImageUrl : '',
    overlay: Number.isFinite(overlayRaw) ? Math.min(80, Math.max(0, Math.round(overlayRaw))) : 35,
    textTheme,
    align,
  }
}

export async function getSlidersConfig(pageKey: string): Promise<SlidersBannerConfig | null> {
  const safeKey = pageKey.replace(/[^a-z0-9_-]/gi, '').toLowerCase()
  if (!safeKey) return null
  try {
    const raw = await fs.readFile(path.join(SLIDERS_DIR, `${safeKey}.json`), 'utf-8')
    const parsed = JSON.parse(raw) as Record<string, unknown>
    const slidesIn = Array.isArray(parsed.slides)
      ? (parsed.slides as Array<Record<string, unknown>>)
      : []
    return {
      autoplayMs:
        typeof parsed.autoplayMs === 'number' && Number.isFinite(parsed.autoplayMs)
          ? Math.max(0, Math.round(parsed.autoplayMs))
          : 6000,
      height:
        parsed.height === 'short' || parsed.height === 'tall'
          ? (parsed.height as SlidersBannerConfig['height'])
          : 'normal',
      showArrows: parsed.showArrows !== false,
      showDots: parsed.showDots !== false,
      slides: slidesIn.map((s, i) => normalizeSlide(s ?? {}, i)),
      updatedAt: typeof parsed.updatedAt === 'string' ? parsed.updatedAt : '',
    }
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
