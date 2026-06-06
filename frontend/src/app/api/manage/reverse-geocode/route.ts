import { NextRequest, NextResponse } from 'next/server'
import { apiOriginForFetch } from '@/lib/api-origin'
import { requireAdminCookie } from '@/lib/api-require-admin'

export const dynamic = 'force-dynamic'

async function resolveGoogleGeocodeKey(): Promise<string> {
  const apiBase = apiOriginForFetch() || (process.env.API_URL ?? '').replace(/\/$/, '')
  if (apiBase) {
    try {
      const res = await fetch(`${apiBase}/api/v1/site/public-config`, { next: { revalidate: 60 } })
      if (res.ok) {
        const data = (await res.json()) as { maps?: { google_maps_api_key?: string } }
        const k = data.maps?.google_maps_api_key ?? ''
        if (k) return k
      }
    } catch {
      /* ignore */
    }
  }
  return process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? ''
}

/**
 * Yönetim oturumu: lat/lng → Google Geocoding `formatted_address` (Türkçe).
 * Harita pin’i otomatik doldurulurken insan okunur adres satırı için.
 */
export async function POST(req: NextRequest) {
  const authErr = await requireAdminCookie()
  if (authErr) return authErr

  let lat: number
  let lng: number
  try {
    const body = (await req.json()) as { lat?: unknown; lng?: unknown }
    lat = typeof body.lat === 'number' ? body.lat : Number.parseFloat(String(body.lat))
    lng = typeof body.lng === 'number' ? body.lng : Number.parseFloat(String(body.lng))
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
  }
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return NextResponse.json({ error: 'invalid_coords' }, { status: 400 })
  }

  const key = await resolveGoogleGeocodeKey()
  if (!key) {
    return NextResponse.json({ error: 'maps_key_missing' }, { status: 503 })
  }

  const u = new URL('https://maps.googleapis.com/maps/api/geocode/json')
  u.searchParams.set('latlng', `${lat},${lng}`)
  u.searchParams.set('language', 'tr')
  u.searchParams.set('key', key)

  const gres = await fetch(u.toString())
  if (!gres.ok) {
    return NextResponse.json({ error: 'geocode_upstream' }, { status: 502 })
  }
  const data = (await gres.json()) as {
    status?: string
    results?: { formatted_address?: string }[]
  }
  if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
    return NextResponse.json({ formatted_address: null, status: data.status ?? 'unknown' })
  }
  const formatted = data.results?.[0]?.formatted_address ?? null
  return NextResponse.json({ formatted_address: formatted })
}
