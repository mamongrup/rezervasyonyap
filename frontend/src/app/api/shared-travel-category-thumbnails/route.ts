import { promises as fs } from 'node:fs'
import path from 'node:path'
import { NextRequest, NextResponse } from 'next/server'
import type { SharedTravelCategoryThumbnailsFile } from '@/data/page-builder-config'
import { requireAdminCookie } from '@/lib/api-require-admin'
import { parseCategoryThumbnailEntry, serializeThumbnailForStorage } from '@/lib/category-thumbnail-entry'
import { revalidateAfterSharedTravelCategoryThumbnailsSave } from '@/lib/revalidate-page-builder'

const FILE_PATH = path.join(process.cwd(), 'public', 'page-builder', 'shared-travel-category-thumbnails.json')

export async function GET() {
  const authErr = await requireAdminCookie()
  if (authErr) return authErr

  try {
    const raw = await fs.readFile(FILE_PATH, 'utf-8')
    const p = JSON.parse(raw) as SharedTravelCategoryThumbnailsFile
    return NextResponse.json({
      ok: true,
      thumbnails: p.thumbnails && typeof p.thumbnails === 'object' && !Array.isArray(p.thumbnails) ? p.thumbnails : {},
      updatedAt: typeof p.updatedAt === 'string' ? p.updatedAt : '',
    })
  } catch {
    return NextResponse.json({ ok: true, thumbnails: {}, updatedAt: '' })
  }
}

export async function POST(req: NextRequest) {
  const authErr = await requireAdminCookie()
  if (authErr) return authErr

  let body: { thumbnails?: Record<string, unknown> }
  try {
    body = (await req.json()) as { thumbnails?: Record<string, unknown> }
  } catch {
    return NextResponse.json({ ok: false, error: 'invalid_json_body' }, { status: 400 })
  }

  const raw = body.thumbnails
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return NextResponse.json({ ok: false, error: 'thumbnails_required' }, { status: 400 })
  }

  const cleaned: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(raw)) {
    const key = k.trim()
    if (!key) continue
    const parsed = parseCategoryThumbnailEntry(v)
    if (parsed) cleaned[key] = serializeThumbnailForStorage(parsed)
  }

  const payload: SharedTravelCategoryThumbnailsFile = {
    thumbnails: cleaned,
    updatedAt: new Date().toISOString(),
  }

  await fs.mkdir(path.dirname(FILE_PATH), { recursive: true })
  await fs.writeFile(FILE_PATH, JSON.stringify(payload, null, 2), 'utf-8')

  revalidateAfterSharedTravelCategoryThumbnailsSave()

  return NextResponse.json({ ok: true, savedAt: payload.updatedAt })
}
