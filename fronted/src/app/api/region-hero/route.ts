import { NextRequest, NextResponse } from 'next/server'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import { requireAdminCookie } from '@/lib/api-require-admin'

const DATA_DIR = path.join(process.cwd(), 'public', 'region-hero')

export interface RegionHeroConfig {
  category: string
  region: string
  heading: string
  subheading: string
  images: [string, string, string]
  updatedAt: string
}

/** Dosya adı için — path traversal / garip karakter önlemi */
function safeSlugSegment(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 96)
}

function configKey(category: string, region: string): string {
  const c = safeSlugSegment(category)
  const r = safeSlugSegment(region)
  return `${c}--${r}`
}

function filePath(category: string, region: string) {
  const key = configKey(category, region)
  if (!key || key === '--') {
    throw new Error('invalid category/region')
  }
  const resolved = path.join(DATA_DIR, `${key}.json`)
  const normalizedData = path.normalize(DATA_DIR)
  if (!resolved.startsWith(normalizedData)) {
    throw new Error('invalid path')
  }
  return resolved
}

async function ensureDir() {
  await fs.mkdir(DATA_DIR, { recursive: true })
}

/** GET /api/region-hero?category=oteller&region=antalya → config
 *  GET /api/region-hero → list all configs */
export async function GET(req: NextRequest) {
  await ensureDir()
  const { searchParams } = new URL(req.url)
  const category = searchParams.get('category')
  const region = searchParams.get('region')

  if (category && region) {
    try {
      const raw = await fs.readFile(filePath(category, region), 'utf8')
      return NextResponse.json({ ok: true, config: JSON.parse(raw) as RegionHeroConfig })
    } catch {
      return NextResponse.json({
        ok: true,
        config: { category, region, heading: '', subheading: '', images: ['', '', ''], updatedAt: '' },
      })
    }
  }

  // List all
  try {
    const files = await fs.readdir(DATA_DIR)
    const configs: RegionHeroConfig[] = await Promise.all(
      files
        .filter((f) => f.endsWith('.json'))
        .map(async (f) => {
          const raw = await fs.readFile(path.join(DATA_DIR, f), 'utf8')
          return JSON.parse(raw) as RegionHeroConfig
        }),
    )
    return NextResponse.json({ ok: true, configs })
  } catch {
    return NextResponse.json({ ok: true, configs: [] })
  }
}

/** POST /api/region-hero → save config */
export async function POST(req: NextRequest) {
  const authErr = await requireAdminCookie()
  if (authErr) return authErr

  await ensureDir()
  try {
    const body = (await req.json()) as Partial<RegionHeroConfig>
    const { category, region } = body
    if (!category || !region) {
      return NextResponse.json({ ok: false, error: 'category ve region zorunludur.' }, { status: 400 })
    }

    const c = safeSlugSegment(category)
    const r = safeSlugSegment(region)
    if (!c || !r) {
      return NextResponse.json({ ok: false, error: 'Geçersiz category veya region.' }, { status: 400 })
    }

    const config: RegionHeroConfig = {
      category: c,
      region: r,
      heading: body.heading ?? '',
      subheading: body.subheading ?? '',
      images: body.images ?? ['', '', ''],
      updatedAt: new Date().toISOString(),
    }
    await fs.writeFile(filePath(c, r), JSON.stringify(config, null, 2), 'utf8')
    return NextResponse.json({ ok: true, config })
  } catch (err) {
    console.error('[region-hero POST]', err)
    return NextResponse.json({ ok: false, error: 'Kaydedilemedi.' }, { status: 500 })
  }
}

/** DELETE /api/region-hero?category=oteller&region=antalya → remove config */
export async function DELETE(req: NextRequest) {
  const authErr = await requireAdminCookie()
  if (authErr) return authErr

  const { searchParams } = new URL(req.url)
  const category = searchParams.get('category')
  const region = searchParams.get('region')
  if (!category || !region) {
    return NextResponse.json({ ok: false, error: 'category ve region zorunludur.' }, { status: 400 })
  }
  try {
    await fs.unlink(filePath(category, region))
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ ok: true })
  }
}
