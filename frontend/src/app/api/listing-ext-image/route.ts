import { isAllowedListingExtImageHost } from '@/lib/listing-ext-image-proxy'
import { unwrapKplusCdnUrl, rewriteAegeanHotelsImageToBookeder } from '@/lib/listing-gallery-display-url'
import { repairExternalListingImageExt } from '@/lib/listing-image-url-fallbacks'
import { NextRequest, NextResponse } from 'next/server'
import sharp from 'sharp'

export const dynamic = 'force-dynamic'

const FETCH_TIMEOUT_MS = 12_000
const USER_AGENT =
  'Mozilla/5.0 (compatible; RezervasyonYapListingImage/1.0; +https://rezervasyonyap.tr)'
const IMMUTABLE_IMAGE_CACHE =
  'public, max-age=31536000, s-maxage=31536000, stale-while-revalidate=604800, immutable'

function boundedInt(raw: string | null, fallback: number, min: number, max: number): number {
  const value = Number.parseInt(raw ?? '', 10)
  return Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : fallback
}

function normalizeUpstreamUrl(raw: string): string | null {
  const trimmed = raw.trim()
  if (!trimmed || !/^https?:\/\//i.test(trimmed)) return null
  try {
    const u = new URL(trimmed)
    if (u.protocol !== 'https:' && u.protocol !== 'http:') return null
    if (!isAllowedListingExtImageHost(u.hostname)) return null
    // Türkçe dosya adları: pathname percent-encode (Mısır → M%C4%B1s%C4%B1r)
    u.pathname = u.pathname
      .split('/')
      .map((seg) => {
        if (!seg) return seg
        try {
          return encodeURIComponent(decodeURIComponent(seg))
        } catch {
          return encodeURIComponent(seg)
        }
      })
      .join('/')
    return rewriteAegeanHotelsImageToBookeder(
      unwrapKplusCdnUrl(repairExternalListingImageExt(u.toString())),
    )
  } catch {
    return null
  }
}

export async function GET(req: NextRequest) {
  const raw = req.nextUrl.searchParams.get('u')?.trim() ?? ''
  const requestedWidth = req.nextUrl.searchParams.has('w')
    ? boundedInt(req.nextUrl.searchParams.get('w'), 720, 240, 1600)
    : null
  const quality = boundedInt(req.nextUrl.searchParams.get('q'), 72, 48, 86)
  const requestedFormat = req.nextUrl.searchParams.get('format')?.trim().toLowerCase()
  const upstreamUrl = normalizeUpstreamUrl(raw)
  if (!upstreamUrl) {
    return NextResponse.json({ error: 'invalid_image_url' }, { status: 400 })
  }

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)

  try {
    const upstreamHeaders: Record<string, string> = {
      Accept: 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8',
      'User-Agent': USER_AGENT,
    }
    try {
      const host = new URL(upstreamUrl).hostname.toLowerCase()
      if (host === 'upload.wikimedia.org' || host.endsWith('.wikimedia.org')) {
        upstreamHeaders.Referer = 'https://commons.wikimedia.org/'
      } else if (host.includes('yolcu360.com')) {
        upstreamHeaders.Referer = 'https://www.yolcu360.com/'
      } else if (host.includes('tatilbudur.com')) {
        upstreamHeaders.Referer = 'https://www.tatilbudur.com/'
        upstreamHeaders.Accept = 'image/webp,image/apng,image/*,*/*;q=0.8'
      } else if (host.includes('gezinomi.com')) {
        upstreamHeaders.Referer = 'https://www.gezinomi.com/'
      } else if (host === 'bookeder.com' || host.endsWith('.bookeder.com')) {
        upstreamHeaders.Referer = 'https://bookeder.com/'
      }
    } catch {
      /* ignore */
    }

    const upstream = await fetch(upstreamUrl, {
      signal: controller.signal,
      headers: upstreamHeaders,
      next: { revalidate: 86400 },
    })

    if (!upstream.ok) {
      return NextResponse.json({ error: 'upstream_image_failed' }, { status: upstream.status })
    }

    const contentType = upstream.headers.get('content-type') ?? ''
    if (!contentType.toLowerCase().startsWith('image/')) {
      return NextResponse.json({ error: 'upstream_not_image' }, { status: 502 })
    }

    if (requestedWidth != null && requestedFormat === 'webp') {
      const original = Buffer.from(await upstream.arrayBuffer())
      try {
        const optimized = await sharp(original)
          .rotate()
          .resize({ width: requestedWidth, withoutEnlargement: true })
          .webp({ quality, effort: 4 })
          .toBuffer()
        return new NextResponse(new Uint8Array(optimized), {
          status: 200,
          headers: {
            'Content-Type': 'image/webp',
            'Content-Length': String(optimized.byteLength),
            'Cache-Control': IMMUTABLE_IMAGE_CACHE,
          },
        })
      } catch {
        return new NextResponse(new Uint8Array(original), {
          status: 200,
          headers: {
            'Content-Type': contentType,
            'Content-Length': String(original.byteLength),
            'Cache-Control': IMMUTABLE_IMAGE_CACHE,
          },
        })
      }
    }

    return new NextResponse(upstream.body, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': IMMUTABLE_IMAGE_CACHE,
      },
    })
  } catch {
    return NextResponse.json({ error: 'upstream_image_timeout' }, { status: 504 })
  } finally {
    clearTimeout(timer)
  }
}
