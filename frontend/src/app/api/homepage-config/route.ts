import { promises as fs } from 'node:fs'
import path from 'node:path'
import { NextRequest, NextResponse } from 'next/server'
import { requireAdminCookie } from '@/lib/api-require-admin'
import { revalidateHomepageLocales } from '@/lib/revalidate-page-builder'
import type { PageBuilderModule } from '@/types/listing-types'

const FILE_PATH = path.join(process.cwd(), 'public', 'page-builder', 'homepage.json')

export interface HomepageConfig {
  heroHeading: string
  heroSubheading: string
  heroCtaText: string
  heroCtaHref: string
  heroImages: [string, string, string]
  updatedAt: string
  modules?: PageBuilderModule[]
}

const DEFAULT_CONFIG: Omit<HomepageConfig, 'updatedAt'> = {
  heroHeading: 'Otel, Araba, Deneyim',
  heroSubheading: 'Bizimle seyahatiniz unutulmaz deneyimlerle dolacak.',
  heroCtaText: 'Aramaya Başla',
  heroCtaHref: '/oteller/all',
  heroImages: ['', '', ''],
}

/** Anasayfa hero, render'da `modules[].config` (hero) ÖNCELİKLİ okunur. Tek efektif kaynak modül olsun. */
function findHeroModule(modules: PageBuilderModule[] | undefined): PageBuilderModule | undefined {
  return modules?.find((m) => m.type === 'hero' && m.enabled) ?? modules?.find((m) => m.type === 'hero')
}

function moduleImagesTuple(cfg: Record<string, unknown>): [string, string, string] {
  const imgs = Array.isArray(cfg.images) ? (cfg.images as unknown[]) : []
  return [String(imgs[0] ?? ''), String(imgs[1] ?? ''), String(imgs[2] ?? '')]
}

/** GET: form mevcut canlı değeri göstersin — üst-seviye boşsa hero modül config'inden doldur. */
function withHeroFieldsFromModule(config: HomepageConfig): HomepageConfig {
  const cfg = (findHeroModule(config.modules)?.config as Record<string, unknown>) ?? {}
  const topImages = Array.isArray(config.heroImages) ? config.heroImages : []
  const hasTopImages = topImages.some((u) => (u ?? '').trim())
  const moduleImages = moduleImagesTuple(cfg)
  const hasModuleImages = moduleImages.some((u) => u.trim())
  return {
    ...config,
    heroHeading:
      (config.heroHeading ?? '').trim() || (typeof cfg.heading === 'string' ? cfg.heading.trim() : ''),
    heroSubheading:
      (config.heroSubheading ?? '').trim() || (typeof cfg.subheading === 'string' ? cfg.subheading.trim() : ''),
    heroCtaText:
      (config.heroCtaText ?? '').trim() || (typeof cfg.ctaText === 'string' ? cfg.ctaText.trim() : ''),
    heroCtaHref:
      (config.heroCtaHref ?? '').trim() || (typeof cfg.ctaHref === 'string' ? cfg.ctaHref.trim() : ''),
    heroImages: hasTopImages ? (topImages as [string, string, string]) : hasModuleImages ? moduleImages : ['', '', ''],
  }
}

/** POST: üst-seviye hero alanlarını hero modülüne yaz — render modül-öncelikli okuduğundan değişiklik görünür olur. */
function syncHeroModuleConfig(
  modules: PageBuilderModule[] | undefined,
  config: HomepageConfig,
): PageBuilderModule[] | undefined {
  if (!modules) return modules
  let done = false
  return modules.map((mod): PageBuilderModule => {
    if (done || mod.type !== 'hero') return mod
    done = true
    return {
      ...mod,
      config: {
        ...mod.config,
        heading: config.heroHeading,
        subheading: config.heroSubheading,
        ctaText: config.heroCtaText,
        ctaHref: config.heroCtaHref,
        images: config.heroImages,
      },
    }
  })
}

export async function GET() {
  const authErr = await requireAdminCookie()
  if (authErr) return authErr
  try {
    const raw = await fs.readFile(FILE_PATH, 'utf-8')
    const config = JSON.parse(raw) as HomepageConfig
    return NextResponse.json({ ok: true, config: withHeroFieldsFromModule(config) })
  } catch {
    return NextResponse.json({
      ok: true,
      config: { ...DEFAULT_CONFIG, updatedAt: '' },
    })
  }
}

export async function POST(req: NextRequest) {
  const authErr = await requireAdminCookie()
  if (authErr) return authErr

  let body: Partial<HomepageConfig>
  try {
    body = (await req.json()) as Partial<HomepageConfig>
  } catch {
    return NextResponse.json({ ok: false, error: 'invalid_json_body' }, { status: 400 })
  }

  let previousModules: PageBuilderModule[] | undefined
  try {
    const prev = JSON.parse(await fs.readFile(FILE_PATH, 'utf-8')) as HomepageConfig
    previousModules = prev.modules
  } catch {
    previousModules = undefined
  }

  const config: HomepageConfig = {
    heroHeading: body.heroHeading ?? DEFAULT_CONFIG.heroHeading,
    heroSubheading: body.heroSubheading ?? DEFAULT_CONFIG.heroSubheading,
    heroCtaText: body.heroCtaText ?? DEFAULT_CONFIG.heroCtaText,
    heroCtaHref: body.heroCtaHref ?? DEFAULT_CONFIG.heroCtaHref,
    heroImages: (body.heroImages as [string, string, string]) ?? DEFAULT_CONFIG.heroImages,
    updatedAt: new Date().toISOString(),
    modules: body.modules !== undefined ? body.modules : previousModules,
  }

  // Hero metin/görselleri render'da modül config'inden okunur; üst-seviye değerleri modüle yansıt.
  config.modules = syncHeroModuleConfig(config.modules, config)

  await fs.mkdir(path.dirname(FILE_PATH), { recursive: true })
  await fs.writeFile(FILE_PATH, JSON.stringify(config, null, 2), 'utf-8')

  revalidateHomepageLocales()

  return NextResponse.json({ ok: true, savedAt: config.updatedAt })
}
