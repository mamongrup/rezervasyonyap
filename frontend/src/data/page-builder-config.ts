/**
 * Server-side helper to load saved page builder config for a category.
 * Falls back to the registry's default modules if no custom config exists.
 */

import { promises as fs } from 'node:fs'
import path from 'node:path'
import type {
  CategoryPageBuilderConfig,
  FeaturedByRegionConfig,
  FeaturedRegionEntry,
  PageBuilderModule,
  PageBuilderModuleType,
} from '@/types/listing-types'
export type { FeaturedByRegionConfig, FeaturedRegionEntry }
import { getCategoryBySlug } from './category-registry'
import { getLocalizedDefaultModules, getRegionDetailDefaultModules } from '@/lib/page-builder-default-modules'
import { getMessages } from '@/utils/getT'
import {
  recordToNormalizedThumbnails,
  type CategoryThumbnailNormalized,
} from '@/lib/category-thumbnail-entry'

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

/** İçerik → Kategori Resimleri — tüm vitrin sayfalarındaki kategori slider/grid için ortak havuz */
const SHARED_TRAVEL_CATEGORY_THUMBNAILS_PATH = path.join(
  process.cwd(),
  'public',
  'page-builder',
  'shared-travel-category-thumbnails.json',
)

export interface SharedTravelCategoryThumbnailsFile {
  /** Slug → görsel URL veya `{ src, objectPosition }` */
  thumbnails: Record<string, unknown>
  updatedAt: string
}

/** Dosyadan ham thumbnail kaydı (birleştirme için). */
export async function getSharedTravelCategoryThumbnailsRaw(): Promise<Record<string, unknown>> {
  try {
    const raw = await fs.readFile(SHARED_TRAVEL_CATEGORY_THUMBNAILS_PATH, 'utf-8')
    const p = JSON.parse(raw) as SharedTravelCategoryThumbnailsFile
    const t = p.thumbnails
    if (!t || typeof t !== 'object' || Array.isArray(t)) return {}
    return { ...t }
  } catch {
    return {}
  }
}

/** Normalize edilmiş ortak havuz (salt okunur yardımcılar için). */
export async function getSharedTravelCategoryThumbnails(): Promise<
  Record<string, CategoryThumbnailNormalized>
> {
  const raw = await getSharedTravelCategoryThumbnailsRaw()
  return recordToNormalizedThumbnails(raw)
}

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

/** Eski kayıtlarda yoksa hero + breadcrumb eklenir (sıra korunur). */
const REGION_DETAIL_CORE_CHAIN: PageBuilderModuleType[] = ['region_detail_hero', 'region_detail_breadcrumb']

function ensureRegionDetailCoreModules(modules: PageBuilderModule[], locale: string): PageBuilderModule[] {
  const missing = REGION_DETAIL_CORE_CHAIN.filter((t) => !modules.some((m) => m.type === t))
  if (missing.length === 0) return modules

  const m = getMessages(locale)
  const defaults = getRegionDetailDefaultModules(m)
  const injected: PageBuilderModule[] = missing.map((t, idx) => {
    const def = defaults.find((d) => d.type === t)
    if (!def) return null
    return {
      ...def,
      id: `bolge-detay-core-${t}`,
      order: idx + 1,
    }
  }).filter((x): x is PageBuilderModule => x != null)

  if (injected.length === 0) return modules

  const shift = injected.length
  const shifted = modules.map((mod) => ({ ...mod, order: mod.order + shift }))
  return [...injected, ...shifted].sort((a, b) => a.order - b.order)
}

function ensureRegionDetailPlacesVitrinModule(modules: PageBuilderModule[], locale: string): PageBuilderModule[] {
  const t: PageBuilderModuleType = 'region_detail_places_vitrin'
  if (modules.some((m) => m.type === t)) return modules

  const m = getMessages(locale)
  const defaults = getRegionDetailDefaultModules(m)
  const stub = defaults.find((d) => d.type === t)
  if (!stub) return modules

  const travel = modules.find((x) => x.type === 'region_detail_travel_ideas')
  const insertAfterOrder = travel?.order ?? 7
  const newOrder = insertAfterOrder + 1

  const shifted = modules.map((mod) =>
    mod.order > insertAfterOrder ? { ...mod, order: mod.order + 1 } : mod,
  )

  return [
    ...shifted,
    {
      ...stub,
      id: 'bolge-detay-injected-places-vitrin',
      order: newOrder,
    },
  ].sort((a, b) => a.order - b.order)
}

/** `/bolge/…` vitrinı için tek şablon (`public/page-builder/bolge-detay.json`). */
export async function getRegionDetailPageBuilderConfig(locale = 'tr'): Promise<PageBuilderModule[]> {
  const slug = 'bolge-detay'
  const filePath = path.join(DATA_DIR, `${slug}.json`)
  try {
    const raw = await fs.readFile(filePath, 'utf-8')
    const config = JSON.parse(raw) as CategoryPageBuilderConfig
    const withCore = ensureRegionDetailCoreModules(config.modules, locale)
    return ensureRegionDetailPlacesVitrinModule(withCore, locale)
  } catch {
    const m = getMessages(locale)
    return getRegionDetailDefaultModules(m).map((mod, i) => ({
      ...mod,
      id: `${slug}-default-${i}`,
    }))
  }
}
