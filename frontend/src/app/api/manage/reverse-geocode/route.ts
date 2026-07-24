import { NextRequest, NextResponse } from 'next/server'
import {
  resolveGoogleMapsServerApiKey,
  GOOGLE_MAPS_SERVER_KEY_HELP,
} from '@/lib/google-maps-api-key'
import { requireAdminCookie } from '@/lib/api-require-admin'

export const dynamic = 'force-dynamic'

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

  const key = resolveGoogleMapsServerApiKey()
  if (!key) {
    return NextResponse.json(
      { error: 'maps_server_key_missing', message: GOOGLE_MAPS_SERVER_KEY_HELP },
      { status: 503 },
    )
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
    error_message?: string
  }
  if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
    return NextResponse.json({
      formatted_address: null,
      status: data.status ?? 'unknown',
      error_message: data.error_message,
    })
  }
  const formatted = data.results?.[0]?.formatted_address ?? null
  return NextResponse.json({ formatted_address: formatted })
}
