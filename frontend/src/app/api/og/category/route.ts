import { getCategoryBySlug } from '@/data/category-registry'
import {
  CATEGORY_CARD_SEED_SOURCES,
  categoryCardUploadPath,
} from '@/lib/category-default-thumbnails'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { NextRequest, NextResponse } from 'next/server'
import sharp from 'sharp'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const WIDTH = 1200
const HEIGHT = 630
const HOME_SLUGS = ['oteller', 'tatil-evleri', 'turlar', 'aktiviteler'] as const

function escapeSvg(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;')
}

async function localPublicImage(relativePath: string): Promise<Buffer | null> {
  const rel = relativePath.replace(/^\/+/, '')
  const candidates = [
    path.join(process.cwd(), 'public', rel),
    path.join(process.cwd(), 'frontend', 'public', rel),
  ]
  for (const candidate of candidates) {
    try {
      return await readFile(candidate)
    } catch {
      // Production and local working directories differ; try the next root.
    }
  }
  return null
}

async function categorySource(slug: string): Promise<Buffer | null> {
  const local = await localPublicImage(categoryCardUploadPath(slug))
  if (local) return local
  const remote = CATEGORY_CARD_SEED_SOURCES[slug]?.url
  if (!remote) return null
  try {
    const response = await fetch(remote, {
      headers: { Accept: 'image/avif,image/webp,image/jpeg,image/png,*/*' },
      signal: AbortSignal.timeout(8_000),
      next: { revalidate: 86_400 },
    })
    return response.ok ? Buffer.from(await response.arrayBuffer()) : null
  } catch {
    return null
  }
}

async function fallbackCanvas(): Promise<Buffer> {
  const fallback = await localPublicImage('/og-default.jpg')
  if (fallback) {
    return sharp(fallback).resize(WIDTH, HEIGHT, { fit: 'cover' }).jpeg({ quality: 84 }).toBuffer()
  }
  return sharp({
    create: { width: WIDTH, height: HEIGHT, channels: 3, background: '#0f172a' },
  })
    .jpeg({ quality: 84 })
    .toBuffer()
}

async function homeCanvas(): Promise<Buffer> {
  const sources = await Promise.all(HOME_SLUGS.map(categorySource))
  if (sources.every((source) => !source)) return fallbackCanvas()
  const fallback = await fallbackCanvas()
  const tiles = await Promise.all(
    sources.map((source) =>
      sharp(source ?? fallback)
        .resize(600, 315, { fit: 'cover', position: 'centre' })
        .jpeg({ quality: 82 })
        .toBuffer(),
    ),
  )
  return sharp({ create: { width: WIDTH, height: HEIGHT, channels: 3, background: '#0f172a' } })
    .composite([
      { input: tiles[0], left: 0, top: 0 },
      { input: tiles[1], left: 600, top: 0 },
      { input: tiles[2], left: 0, top: 315 },
      { input: tiles[3], left: 600, top: 315 },
    ])
    .jpeg({ quality: 84, mozjpeg: true })
    .toBuffer()
}

function overlay(title: string, eyebrow: string): Buffer {
  const titleSize = title.length > 38 ? 42 : title.length > 28 ? 50 : 58
  return Buffer.from(`
    <svg width="${WIDTH}" height="${HEIGHT}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="shade" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#020617" stop-opacity="0.06" />
          <stop offset="0.55" stop-color="#020617" stop-opacity="0.18" />
          <stop offset="1" stop-color="#020617" stop-opacity="0.92" />
        </linearGradient>
      </defs>
      <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#shade)" />
      <text x="72" y="472" fill="#ffffff" font-size="26" font-family="Arial, sans-serif" font-weight="700" letter-spacing="2">${escapeSvg(eyebrow.toUpperCase())}</text>
      <text x="72" y="548" fill="#ffffff" font-size="${titleSize}" font-family="Arial, sans-serif" font-weight="800">${escapeSvg(title)}</text>
    </svg>
  `)
}

export async function GET(request: NextRequest) {
  const slug = request.nextUrl.searchParams.get('slug')?.trim().toLowerCase() || 'home'
  const category = slug === 'home' ? null : getCategoryBySlug(slug)
  if (slug !== 'home' && !category) {
    return NextResponse.json({ error: 'category_not_found' }, { status: 404 })
  }

  const title = category?.name ?? 'Otel, Villa, Tur ve Aktivite Rezervasyonu'
  const base = slug === 'home' ? await homeCanvas() : await categorySource(slug)
  const canvas = base
    ? await sharp(base).resize(WIDTH, HEIGHT, { fit: 'cover', position: 'centre' }).jpeg().toBuffer()
    : await fallbackCanvas()
  const jpeg = await sharp(canvas)
    .composite([{ input: overlay(title, 'Rezervasyon Yap'), left: 0, top: 0 }])
    .jpeg({ quality: 84, mozjpeg: true })
    .toBuffer()

  return new NextResponse(new Uint8Array(jpeg), {
    headers: {
      'Content-Type': 'image/jpeg',
      'Content-Length': String(jpeg.length),
      'Cache-Control': 'public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800',
      'X-Content-Type-Options': 'nosniff',
    },
  })
}
