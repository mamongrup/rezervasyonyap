import { NextRequest, NextResponse } from 'next/server'
import sharp from 'sharp'
import { getPublicSiteUrl } from '@/lib/site-branding-seo'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function hostApexKey(hostname: string): string {
  return hostname.replace(/^www\./i, '').toLowerCase()
}

function isAllowedSourceUrl(raw: string): URL | null {
  try {
    const url = new URL(raw)
    const site = getPublicSiteUrl()
    if (!site) return null
    const siteUrl = new URL(site)
    if (url.protocol !== 'https:') return null
    if (hostApexKey(url.hostname) !== hostApexKey(siteUrl.hostname)) return null
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

  const upstream = await fetch(url.toString(), {
    headers: { Accept: 'image/avif,image/webp,image/png,image/jpeg,*/*' },
    cache: 'no-store',
  })
  if (!upstream.ok) {
    return NextResponse.json({ error: 'social_share_image_fetch_failed' }, { status: 502 })
  }

  const raw = Buffer.from(await upstream.arrayBuffer())
  const jpeg = await sharp(raw)
    .rotate()
    .resize(1080, 1080, { fit: 'cover', withoutEnlargement: true })
    .jpeg({ quality: 90, mozjpeg: true })
    .toBuffer()

  return new NextResponse(new Uint8Array(jpeg), {
    status: 200,
    headers: {
      'Content-Type': 'image/jpeg',
      'Cache-Control': 'public, max-age=300',
    },
  })
}
