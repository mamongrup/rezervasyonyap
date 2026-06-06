import { promises as fs } from 'node:fs'
import path from 'node:path'
import { NextRequest, NextResponse } from 'next/server'
import type { CategoryPageBuilderConfig, PageBuilderModule } from '@/types/listing-types'
import { CATEGORY_REGISTRY } from '@/data/category-registry'
import { requireAdminCookie } from '@/lib/api-require-admin'
import {
  finalizePageBuilderConfigFromUnknown,
  finalizePageBuilderPostBody,
  MAX_PAGE_BUILDER_BODY_BYTES,
  sanitizePageSlugForFilesystem,
} from '@/lib/page-builder/config-pipeline'
import {
  getLocalizedDefaultModules,
  getHomepageDefaultModules,
  getRegionDetailDefaultModules,
} from '@/lib/page-builder-default-modules'
import { revalidateAfterPageBuilderSave } from '@/lib/revalidate-page-builder'
import { getMessages } from '@/utils/getT'

const DATA_DIR = path.join(process.cwd(), 'public', 'page-builder')

async function ensureDir() {
  await fs.mkdir(DATA_DIR, { recursive: true })
}

// Özel sayfalar (kategori dışı) — ana sayfa, arama, bölge vitrin şablonu
const SPECIAL_PAGES = [
  { slug: 'homepage', name: 'Ana Sayfa', emoji: '🏠' },
  { slug: 'ara', name: 'Arama Sonuçları', emoji: '🔍' },
  { slug: 'bolge-detay', name: 'Bölge detay (vitrin)', emoji: '📍' },
]

function buildAllowedSlugSet(): Set<string> {
  const s = new Set<string>()
  for (const p of SPECIAL_PAGES) {
    s.add(sanitizePageSlugForFilesystem(p.slug))
  }
  for (const c of CATEGORY_REGISTRY) {
    s.add(sanitizePageSlugForFilesystem(c.slug))
  }
  return s
}

const ALLOWED_PAGE_BUILDER_SLUGS = buildAllowedSlugSet()

/** GET /api/page-builder?slug=oteller — fetch config for a category */
export async function GET(req: NextRequest) {
  const authErr = await requireAdminCookie()
  if (authErr) return authErr
  const { searchParams } = new URL(req.url)
  const slugParam = searchParams.get('slug')
  const locale = searchParams.get('locale')?.trim() || 'tr'

  await ensureDir()

  if (!slugParam) {
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

  const slugSafe = sanitizePageSlugForFilesystem(slugParam)
  if (!slugSafe || !ALLOWED_PAGE_BUILDER_SLUGS.has(slugSafe)) {
    return NextResponse.json({ ok: false, error: 'invalid_slug' }, { status: 404 })
  }

  const filePath = path.join(DATA_DIR, `${slugSafe}.json`)

  const tryFinalize = (raw: unknown): CategoryPageBuilderConfig | null => {
    const fin = finalizePageBuilderConfigFromUnknown(raw, slugSafe)
    return fin.ok ? fin.config : null
  }

  try {
    const raw = await fs.readFile(filePath, 'utf-8')
    const parsed = JSON.parse(raw) as unknown
    const fin = tryFinalize(parsed)
    if (fin) return NextResponse.json({ ok: true, config: fin })
  } catch {
    // fallthrough to defaults
  }

  const messages = getMessages(locale)

  // Special case: homepage
  if (slugSafe === 'homepage') {
    const base: CategoryPageBuilderConfig = {
      categorySlug: 'homepage',
      modules: getHomepageDefaultModules(messages).map((m, i) => ({
        ...m,
        id: `homepage-module-${i}`,
      })) as PageBuilderModule[],
      updatedAt: new Date().toISOString(),
    }
    const fin = finalizePageBuilderConfigFromUnknown(base, slugSafe)
    const config = fin.ok ? fin.config : base
    return NextResponse.json({ ok: true, config })
  }

  // Special case: search page
  if (slugSafe === 'ara') {
    const { getSearchPageDefaultModules } = await import('@/lib/page-builder-default-modules')
    const base: CategoryPageBuilderConfig = {
      categorySlug: 'ara',
      modules: getSearchPageDefaultModules().map((m, i) => ({
        ...m,
        id: `ara-module-${i}`,
      })) as PageBuilderModule[],
      updatedAt: new Date().toISOString(),
    }
    const fin = finalizePageBuilderConfigFromUnknown(base, slugSafe)
    const config = fin.ok ? fin.config : base
    return NextResponse.json({ ok: true, config })
  }

  if (slugSafe === 'bolge-detay') {
    const base: CategoryPageBuilderConfig = {
      categorySlug: 'bolge-detay',
      modules: getRegionDetailDefaultModules(messages).map((m, i) => ({
        ...m,
        id: `bolge-detay-module-${i}`,
      })) as PageBuilderModule[],
      updatedAt: new Date().toISOString(),
    }
    const fin = finalizePageBuilderConfigFromUnknown(base, slugSafe)
    const config = fin.ok ? fin.config : base
    return NextResponse.json({ ok: true, config })
  }

  const cat = CATEGORY_REGISTRY.find((c) => sanitizePageSlugForFilesystem(c.slug) === slugSafe)
  if (!cat) return NextResponse.json({ ok: false, error: 'Category not found' }, { status: 404 })

  const base: CategoryPageBuilderConfig = {
    categorySlug: cat.slug,
    modules: getLocalizedDefaultModules(cat.slug, messages).map((m, i) => ({
      ...m,
      id: `${cat.slug}-module-${i}`,
    })) as PageBuilderModule[],
    updatedAt: new Date().toISOString(),
  }
  const fin = finalizePageBuilderConfigFromUnknown(base, slugSafe)
  const config = fin.ok ? fin.config : base
  return NextResponse.json({ ok: true, config })
}

/** POST /api/page-builder — save config for a category */
export async function POST(req: NextRequest) {
  const authErr = await requireAdminCookie()
  if (authErr) return authErr

  const rawText = await req.text().catch(() => '')
  if (rawText.length > MAX_PAGE_BUILDER_BODY_BYTES) {
    return NextResponse.json({ ok: false, error: 'payload_too_large' }, { status: 413 })
  }

  let body: unknown
  try {
    body = JSON.parse(rawText || 'null')
  } catch {
    return NextResponse.json({ ok: false, error: 'invalid_json_body' }, { status: 400 })
  }

  const slugPeek = sanitizePageSlugForFilesystem(
    (body && typeof body === 'object' && 'slug' in body && typeof (body as { slug?: unknown }).slug === 'string')
      ? (body as { slug: string }).slug
      : '',
  )
  if (!slugPeek || !ALLOWED_PAGE_BUILDER_SLUGS.has(slugPeek)) {
    return NextResponse.json({ ok: false, error: 'invalid_slug' }, { status: 400 })
  }

  const finalized = finalizePageBuilderPostBody(body, slugPeek)
  if (!finalized.ok) {
    return NextResponse.json({ ok: false, error: finalized.error }, { status: 400 })
  }

  await ensureDir()

  const filePath = path.join(DATA_DIR, `${slugPeek}.json`)
  await fs.writeFile(filePath, JSON.stringify(finalized.config, null, 2), 'utf-8')

  revalidateAfterPageBuilderSave(slugPeek)

  return NextResponse.json({
    ok: true,
    savedAt: finalized.config.updatedAt,
    config: finalized.config,
  })
}

/** DELETE /api/page-builder?slug=oteller — reset to defaults */
export async function DELETE(req: NextRequest) {
  const authErr = await requireAdminCookie()
  if (authErr) return authErr

  const { searchParams } = new URL(req.url)
  const slug = searchParams.get('slug')
  if (!slug) return NextResponse.json({ ok: false, error: 'slug required' }, { status: 400 })

  const safe = sanitizePageSlugForFilesystem(slug)
  if (!safe || !ALLOWED_PAGE_BUILDER_SLUGS.has(safe)) {
    return NextResponse.json({ ok: false, error: 'invalid_slug' }, { status: 400 })
  }

  const filePath = path.join(DATA_DIR, `${safe}.json`)
  await fs.unlink(filePath).catch(() => null)
  revalidateAfterPageBuilderSave(safe)
  return NextResponse.json({ ok: true })
}
