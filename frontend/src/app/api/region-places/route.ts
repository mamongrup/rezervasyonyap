/**
 * /api/region-places
 *
 * GET  ?slug=fethiye          — public; returns saved places for a region slug
 * GET  (no slug)              — returns a list of all saved region slugs
 * POST { slug, data }         — saves region places (admin oturumu gerekli)
 * DELETE ?slug=fethiye        — removes a region's places data (admin oturumu gerekli)
 *
 * Data is stored as JSON files in public/region-places/{slug}.json
 * so they can also be served as static assets in production if needed.
 */

import { promises as fs } from 'node:fs'
import path from 'node:path'
import { NextRequest, NextResponse } from 'next/server'
import { requireAdminCookie } from '@/lib/api-require-admin'

const DATA_DIR = path.join(process.cwd(), 'public', 'region-places')

async function ensureDir() {
  await fs.mkdir(DATA_DIR, { recursive: true })
}

function slugToFilename(slug: string): string {
  // Sanitize: only allow alphanumeric, hyphens, underscores, and slashes (converted to double-dash)
  return slug.replace(/[^a-z0-9\-_/]/gi, '').replace(/\//g, '--') + '.json'
}

export interface RegionPlaceData {
  regionName: string
  regionSlug: string
  coordinates: { lat: number; lng: number }
  savedAt: string
  categories: {
    id: string
    name: string
    icon: string
    types: {
      id: string
      name: string
      googleType: string
      emoji: string
      places: {
        placeId: string
        name: string
        address: string
        distanceKm: number
        lat: number
        lng: number
        rating?: number
        userRatingsTotal?: number
        openNow?: boolean
        types: string[]
      }[]
    }[]
  }[]
}

// ─── GET ─────────────────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const slug = req.nextUrl.searchParams.get('slug')

  await ensureDir()

  try {
    if (!slug) {
      // Return list of all saved region slugs
      const files = await fs.readdir(DATA_DIR)
      const slugs = files
        .filter((f) => f.endsWith('.json'))
        .map((f) => f.replace(/--/g, '/').replace('.json', ''))
      return NextResponse.json({ slugs })
    }

    const filename = slugToFilename(slug)
    const filepath = path.join(DATA_DIR, filename)

    try {
      const raw = await fs.readFile(filepath, 'utf-8')
      const data = JSON.parse(raw) as RegionPlaceData
      return NextResponse.json(data)
    } catch {
      return NextResponse.json({ error: `Bu bölge için kayıtlı mekan verisi bulunamadı: ${slug}` }, { status: 404 })
    }
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

// ─── POST ────────────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as RegionPlaceData

    if (!body.regionSlug) {
      return NextResponse.json({ error: 'regionSlug zorunludur.' }, { status: 400 })
    }

    await ensureDir()

    const filename = slugToFilename(body.regionSlug)
    const filepath = path.join(DATA_DIR, filename)

    await fs.writeFile(filepath, JSON.stringify({ ...body, savedAt: new Date().toISOString() }, null, 2), 'utf-8')

    return NextResponse.json({ ok: true, slug: body.regionSlug, file: filename })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

// ─── DELETE ──────────────────────────────────────────────────────────────────
export async function DELETE(req: NextRequest) {
  const authErr = await requireAdminCookie()
  if (authErr) return authErr

  const slug = req.nextUrl.searchParams.get('slug')
  if (!slug) return NextResponse.json({ error: 'slug gerekli' }, { status: 400 })

  await ensureDir()

  try {
    const filename = slugToFilename(slug)
    const filepath = path.join(DATA_DIR, filename)
    await fs.unlink(filepath)
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Dosya bulunamadı.' }, { status: 404 })
  }
}
