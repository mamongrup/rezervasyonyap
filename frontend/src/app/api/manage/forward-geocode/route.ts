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

function readLatLng(loc: unknown): { lat: number; lng: number } | null {
  if (!loc || typeof loc !== 'object') return null
  const o = loc as { lat?: unknown; lng?: unknown }
  const la = typeof o.lat === 'function' ? (o.lat as () => number)() : Number(o.lat)
  const lo = typeof o.lng === 'function' ? (o.lng as () => number)() : Number(o.lng)
  if (!Number.isFinite(la) || !Number.isFinite(lo)) return null
  return { lat: la, lng: lo }
}

/**
 * Yönetim oturumu: adres metni → ilk Google Geocoding sonucu (Türkçe).
 * İlçe tablosunda merkez yokken slug/ilçe adından Fethiye düzeyi ipucu için.
 */
export async function POST(req: NextRequest) {
  const authErr = await requireAdminCookie()
  if (authErr) return authErr

  let address = ''
  try {
    const body = (await req.json()) as { address?: unknown }
    address = typeof body.address === 'string' ? body.address.trim() : ''
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
  }
  if (!address) {
    return NextResponse.json({ error: 'address_required' }, { status: 400 })
  }

  const key = await resolveGoogleGeocodeKey()
  if (!key) {
    return NextResponse.json({ error: 'maps_key_missing' }, { status: 503 })
  }

  const u = new URL('https://maps.googleapis.com/maps/api/geocode/json')
  u.searchParams.set('address', address)
  u.searchParams.set('language', 'tr')
  u.searchParams.set('region', 'tr')
  u.searchParams.set('key', key)

  const gres = await fetch(u.toString())
  if (!gres.ok) {
    return NextResponse.json({ error: 'geocode_upstream' }, { status: 502 })
  }
  const data = (await gres.json()) as {
    status?: string
    results?: { geometry?: { location?: unknown }; formatted_address?: string }[]
  }
  if (data.status !== 'OK' || !data.results?.length) {
    return NextResponse.json({ lat: null, lng: null, status: data.status ?? 'ZERO_RESULTS' })
  }
  const loc = readLatLng(data.results[0]?.geometry?.location)
  if (!loc) {
    return NextResponse.json({ lat: null, lng: null, status: 'no_geometry' })
  }
  return NextResponse.json({
    lat: loc.lat,
    lng: loc.lng,
    formatted_address: data.results[0]?.formatted_address ?? null,
  })
}
