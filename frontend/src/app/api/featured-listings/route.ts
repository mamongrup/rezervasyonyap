import { promises as fs } from 'node:fs'
import path from 'node:path'
import { NextRequest, NextResponse } from 'next/server'
import { requireAdminCookie } from '@/lib/api-require-admin'
import { fetchListingsByIds } from '@/lib/listings-fetcher'
import {
  collectAllFeaturedListingIds,
  normalizeFeaturedDisplayCount,
  normalizeFeaturedListingsConfig,
  safeCategorySlug,
} from '@/lib/featured-listings-utils'
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

  const locale = req.nextUrl.searchParams.get('locale')?.trim() || 'tr'

  try {
    const raw = await fs.readFile(path.join(DATA_DIR, `${categorySlug}.json`), 'utf-8')
    const parsed = JSON.parse(raw) as Partial<FeaturedListingsConfig>
    const config = normalizeFeaturedListingsConfig(parsed, categorySlug)
    const allIds = collectAllFeaturedListingIds(config.tabs)
    const listings =
      allIds.length > 0 ? await fetchListingsByIds(categorySlug, allIds, locale) : []
    return NextResponse.json({
      ...config,
      listings,
    })
  } catch {
    const empty = normalizeFeaturedListingsConfig(null, categorySlug)
    return NextResponse.json({
      ...empty,
      listings: [],
    })
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
    const body = (await req.json()) as Partial<FeaturedListingsConfig>
    const config = normalizeFeaturedListingsConfig(body, categorySlug)

    await ensureDir()
    const toSave: FeaturedListingsConfig = {
      categorySlug,
      tabs: config.tabs,
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
