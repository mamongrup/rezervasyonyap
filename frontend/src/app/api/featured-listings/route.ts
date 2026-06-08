import { promises as fs } from 'node:fs'
import path from 'node:path'
import { NextRequest, NextResponse } from 'next/server'
import { requireAdminCookie } from '@/lib/api-require-admin'
import { normalizeFeaturedDisplayCount, safeCategorySlug } from '@/lib/featured-listings-utils'
import type { FeaturedListingsConfig } from '@/types/listing-types'

const DATA_DIR = path.join(process.cwd(), 'public', 'featured-listings')

async function ensureDir() {
  await fs.mkdir(DATA_DIR, { recursive: true })
}

export async function GET(req: NextRequest) {
  const authErr = await requireAdminCookie()
  if (authErr) return authErr

  const categorySlug = safeCategorySlug(req.nextUrl.searchParams.get('category'))
  if (!categorySlug) {
    return NextResponse.json({ error: 'category param required' }, { status: 400 })
  }

  try {
    const raw = await fs.readFile(path.join(DATA_DIR, `${categorySlug}.json`), 'utf-8')
    return NextResponse.json(JSON.parse(raw))
  } catch {
    return NextResponse.json({ categorySlug, listingIds: [], displayCount: normalizeFeaturedDisplayCount(undefined) })
  }
}

export async function POST(req: NextRequest) {
  const authErr = await requireAdminCookie()
  if (authErr) return authErr

  const categorySlug = safeCategorySlug(req.nextUrl.searchParams.get('category'))
  if (!categorySlug) {
    return NextResponse.json({ error: 'category param required' }, { status: 400 })
  }

  try {
    const body = (await req.json()) as FeaturedListingsConfig
    const listingIds = Array.isArray(body.listingIds)
      ? body.listingIds.filter((id): id is string => typeof id === 'string' && id.trim() !== '')
      : []

    await ensureDir()
    const toSave: FeaturedListingsConfig = {
      categorySlug,
      listingIds,
      displayCount: normalizeFeaturedDisplayCount(body.displayCount),
      updatedAt: new Date().toISOString(),
    }
    await fs.writeFile(
      path.join(DATA_DIR, `${categorySlug}.json`),
      JSON.stringify(toSave, null, 2),
      'utf-8',
    )
    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
