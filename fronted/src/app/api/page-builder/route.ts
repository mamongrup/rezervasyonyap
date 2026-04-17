import { promises as fs } from 'node:fs'
import path from 'node:path'
import { NextRequest, NextResponse } from 'next/server'
import type { CategoryPageBuilderConfig, PageBuilderModule } from '@/types/listing-types'
import { CATEGORY_REGISTRY } from '@/data/category-registry'
import { requireAdminCookie } from '@/lib/api-require-admin'
import { getLocalizedDefaultModules, getHomepageDefaultModules } from '@/lib/page-builder-default-modules'
import { getMessages } from '@/utils/getT'

const DATA_DIR = path.join(process.cwd(), 'public', 'page-builder')

function safeSlug(slug: string): string {
  return slug.replace(/[^a-z0-9-]/g, '')
}

async function ensureDir() {
  await fs.mkdir(DATA_DIR, { recursive: true })
}

// Special pages that appear in the page builder alongside category pages
const SPECIAL_PAGES = [
  { slug: 'homepage', name: 'Ana Sayfa', emoji: '🏠' },
  { slug: 'ara', name: 'Arama Sonuçları', emoji: '🔍' },
]

/** GET /api/page-builder?slug=oteller — fetch config for a category */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const slug = searchParams.get('slug')
  const locale = searchParams.get('locale')?.trim() || 'tr'

  await ensureDir()

  if (!slug) {
    // Return list of all pages (special + category) with whether they have a custom config
    const files = await fs.readdir(DATA_DIR).catch(() => [] as string[])
    const configured = files.map((f) => f.replace('.json', ''))
    const specialList = SPECIAL_PAGES.map((p) => ({
      slug: p.slug,
      name: p.name,
      emoji: p.emoji,
      hasCustomConfig: configured.includes(p.slug),
      isSpecial: true,
    }))
    const categoryList = CATEGORY_REGISTRY.map((cat) => ({
      slug: cat.slug,
      name: cat.name,
      emoji: cat.emoji,
      hasCustomConfig: configured.includes(cat.slug),
      isSpecial: false,
    }))
    return NextResponse.json({ ok: true, categories: [...specialList, ...categoryList] })
  }

  const filePath = path.join(DATA_DIR, `${safeSlug(slug)}.json`)
  try {
    const raw = await fs.readFile(filePath, 'utf-8')
    const config = JSON.parse(raw) as CategoryPageBuilderConfig
    return NextResponse.json({ ok: true, config })
  } catch {
    const messages = getMessages(locale)

    // Special case: homepage
    if (slug === 'homepage') {
      const defaultConfig: CategoryPageBuilderConfig = {
        categorySlug: 'homepage',
        modules: getHomepageDefaultModules(messages).map((m, i) => ({
          ...m,
          id: `homepage-module-${i}`,
        })),
        updatedAt: new Date().toISOString(),
      }
      return NextResponse.json({ ok: true, config: defaultConfig })
    }

    // Special case: search page
    if (slug === 'ara') {
      const { getSearchPageDefaultModules } = await import('@/lib/page-builder-default-modules')
      const defaultConfig: CategoryPageBuilderConfig = {
        categorySlug: 'ara',
        modules: getSearchPageDefaultModules().map((m, i) => ({
          ...m,
          id: `ara-module-${i}`,
        })),
        updatedAt: new Date().toISOString(),
      }
      return NextResponse.json({ ok: true, config: defaultConfig })
    }

    // Return default config from registry
    const cat = CATEGORY_REGISTRY.find((c) => c.slug === slug)
    if (!cat) return NextResponse.json({ ok: false, error: 'Category not found' }, { status: 404 })

    const defaultConfig: CategoryPageBuilderConfig = {
      categorySlug: slug,
      modules: getLocalizedDefaultModules(slug, messages).map((m, i) => ({
        ...m,
        id: `${slug}-module-${i}`,
      })),
      updatedAt: new Date().toISOString(),
    }
    return NextResponse.json({ ok: true, config: defaultConfig })
  }
}

/** POST /api/page-builder — save config for a category */
export async function POST(req: NextRequest) {
  const authErr = await requireAdminCookie()
  if (authErr) return authErr

  const body = (await req.json()) as { slug: string; modules: PageBuilderModule[] }
  const { slug, modules } = body

  if (!slug || !modules) {
    return NextResponse.json({ ok: false, error: 'slug and modules are required' }, { status: 400 })
  }

  await ensureDir()

  const config: CategoryPageBuilderConfig = {
    categorySlug: slug,
    modules,
    updatedAt: new Date().toISOString(),
  }

  const filePath = path.join(DATA_DIR, `${safeSlug(slug)}.json`)
  await fs.writeFile(filePath, JSON.stringify(config, null, 2), 'utf-8')

  return NextResponse.json({ ok: true, savedAt: config.updatedAt })
}

/** DELETE /api/page-builder?slug=oteller — reset to defaults */
export async function DELETE(req: NextRequest) {
  const authErr = await requireAdminCookie()
  if (authErr) return authErr

  const { searchParams } = new URL(req.url)
  const slug = searchParams.get('slug')
  if (!slug) return NextResponse.json({ ok: false, error: 'slug required' }, { status: 400 })

  const filePath = path.join(DATA_DIR, `${safeSlug(slug)}.json`)
  await fs.unlink(filePath).catch(() => null)
  return NextResponse.json({ ok: true })
}
