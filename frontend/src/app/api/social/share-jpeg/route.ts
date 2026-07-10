import { NextRequest, NextResponse } from 'next/server'
import sharp from 'sharp'
import { getPublicSiteUrl } from '@/lib/site-branding-seo'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function hostApexKey(hostname: string): string {
  return hostname.replace(/^www\./i, '').toLowerCase()
}

function configuredMediaHosts(): Set<string> {
  const hosts = new Set<string>()
  const candidates = [
    getPublicSiteUrl(),
    process.env.NEXT_PUBLIC_UPLOADS_ORIGIN,
    process.env.NEXT_PUBLIC_IMAGE_REMOTE_HOST,
  ]

  for (const raw of candidates) {
    if (!raw?.trim()) continue
    try {
      hosts.add(new URL(raw).hostname.toLowerCase())
    } catch {
      /* Ignore malformed optional environment values. */
    }
  }

  const site = getPublicSiteUrl()
  if (site) {
    try {
      const apex = hostApexKey(new URL(site).hostname)
      hosts.add(apex)
      hosts.add(`www.${apex}`)
      if (process.env.CSP_CDN_AUTO === '1' || process.env.NEXT_PUBLIC_CDN_AUTO === '1') {
        const subdomain = process.env.CSP_CDN_SUBDOMAIN?.trim().toLowerCase() || 'cdn'
        if (/^[a-z0-9-]+$/.test(subdomain)) hosts.add(`${subdomain}.${apex}`)
      }
    } catch {
      /* getPublicSiteUrl is validated again by the caller. */
    }
  }

  return hosts
}

function isAllowedSourceUrl(raw: string): URL | null {
  try {
    const url = new URL(raw)
    const site = getPublicSiteUrl()
    if (!site) return null
    if (url.protocol !== 'https:') return null
    if (!configuredMediaHosts().has(url.hostname.toLowerCase())) return null
    return url
  } catch {
    return null
  }
}

export async function GET(req: NextRequest) {
  const src = req.nextUrl.searchParams.get('src')?.trim() ?? ''
  const url = isAllowedSourceUrl(src)
  if (!url) {
    return NextResponse.json({ error: 'invalid_social_share_image_src' }, { status: 400 })
  }

  let jpeg: Buffer
  try {
    const upstream = await fetch(url.toString(), {
      headers: { Accept: 'image/avif,image/webp,image/png,image/jpeg,*/*' },
      cache: 'no-store',
      signal: AbortSignal.timeout(15_000),
    })
    if (!upstream.ok) {
      return NextResponse.json({ error: 'social_share_image_fetch_failed' }, { status: 502 })
    }

    const contentType = (upstream.headers.get('content-type') ?? '').toLowerCase()
    if (!contentType.startsWith('image/')) {
      return NextResponse.json({ error: 'social_share_source_is_not_image' }, { status: 415 })
    }

    const raw = Buffer.from(await upstream.arrayBuffer())
    jpeg = await sharp(raw)
      .rotate()
      .resize(1080, 1080, { fit: 'cover', withoutEnlargement: true })
      .jpeg({ quality: 90, mozjpeg: true })
      .toBuffer()
  } catch {
    return NextResponse.json({ error: 'social_share_image_conversion_failed' }, { status: 502 })
  }

  return new NextResponse(new Uint8Array(jpeg), {
    status: 200,
    headers: {
      'Content-Type': 'image/jpeg',
      'Cache-Control': 'public, max-age=300',
    },
  })
}
