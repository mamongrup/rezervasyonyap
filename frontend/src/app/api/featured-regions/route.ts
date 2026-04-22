import { promises as fs } from 'node:fs'
import path from 'node:path'
import { NextRequest, NextResponse } from 'next/server'
import { requireAdminCookie } from '@/lib/api-require-admin'
import type { FeaturedByRegionConfig } from '@/types/listing-types'

const DATA_DIR = path.join(process.cwd(), 'public', 'featured-regions')

function safePageKey(raw: string | null): string {
  if (!raw) return ''
  return raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 96)
}

async function ensureDir() {
  await fs.mkdir(DATA_DIR, { recursive: true })
}

export async function GET(req: NextRequest) {
  const pageKey = safePageKey(req.nextUrl.searchParams.get('page'))
  if (!pageKey) return NextResponse.json({ error: 'page param required' }, { status: 400 })

  try {
    const raw = await fs.readFile(path.join(DATA_DIR, `${pageKey}.json`), 'utf-8')
    return NextResponse.json(JSON.parse(raw))
  } catch {
    return NextResponse.json(null)
  }
}

export async function POST(req: NextRequest) {
  const authErr = await requireAdminCookie()
  if (authErr) return authErr

  const pageKey = safePageKey(req.nextUrl.searchParams.get('page'))
  if (!pageKey) return NextResponse.json({ error: 'page param required' }, { status: 400 })

  try {
    const body = (await req.json()) as FeaturedByRegionConfig
    await ensureDir()
    const toSave: FeaturedByRegionConfig = {
      heading: body.heading ?? '',
      subheading: body.subheading ?? '',
      viewAllHref: body.viewAllHref ?? '',
      regions: body.regions ?? [],
    }
    await fs.writeFile(
      path.join(DATA_DIR, `${pageKey}.json`),
      JSON.stringify(toSave, null, 2),
      'utf-8',
    )
    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
