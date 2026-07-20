import {
  resolveGoogleMapsServerApiKey,
  GOOGLE_MAPS_SERVER_KEY_HELP,
} from '@/lib/google-maps-api-key'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const MAX_WIDTH_MIN = 64
const MAX_WIDTH_MAX = 1600

function safeMaxWidth(raw: string | null): number {
  const n = Number(raw ?? 800)
  if (!Number.isFinite(n)) return 800
  return Math.min(Math.max(Math.round(n), MAX_WIDTH_MIN), MAX_WIDTH_MAX)
}

export async function GET(req: NextRequest) {
  const ref = req.nextUrl.searchParams.get('photo_reference')?.trim() ?? ''
  if (!ref || !/^[A-Za-z0-9_-]+$/.test(ref)) {
    return NextResponse.json({ error: 'invalid_photo_reference' }, { status: 400 })
  }

  const key = resolveGoogleMapsServerApiKey()
  if (!key) {
    return NextResponse.json({ error: 'google_maps_server_api_key_missing', message: GOOGLE_MAPS_SERVER_KEY_HELP }, { status: 400 })
  }

  const url = new URL('https://maps.googleapis.com/maps/api/place/photo')
  url.searchParams.set('maxwidth', String(safeMaxWidth(req.nextUrl.searchParams.get('maxwidth'))))
  url.searchParams.set('photo_reference', ref)
  url.searchParams.set('key', key)

  const upstream = await fetch(url, { cache: 'no-store' })
  if (!upstream.ok) {
    return NextResponse.json({ error: 'google_place_photo_failed' }, { status: upstream.status })
  }

  const contentType = upstream.headers.get('content-type') ?? ''
  if (!contentType.toLowerCase().startsWith('image/')) {
    return NextResponse.json({ error: 'google_place_photo_not_image' }, { status: 502 })
  }

  return new NextResponse(upstream.body, {
    status: 200,
    headers: {
      'Content-Type': contentType,
      'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800',
    },
  })
}
