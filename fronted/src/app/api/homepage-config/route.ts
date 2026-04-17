import { promises as fs } from 'node:fs'
import path from 'node:path'
import { NextRequest, NextResponse } from 'next/server'
import { requireAdminCookie } from '@/lib/api-require-admin'
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

export async function GET() {
  try {
    const raw = await fs.readFile(FILE_PATH, 'utf-8')
    const config = JSON.parse(raw) as HomepageConfig
    return NextResponse.json({ ok: true, config })
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

  const body = (await req.json()) as Partial<HomepageConfig>

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

  await fs.mkdir(path.dirname(FILE_PATH), { recursive: true })
  await fs.writeFile(FILE_PATH, JSON.stringify(config, null, 2), 'utf-8')

  return NextResponse.json({ ok: true, savedAt: config.updatedAt })
}
