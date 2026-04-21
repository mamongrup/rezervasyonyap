import { apiOriginForFetch } from '@/lib/api-origin'
import { NextResponse } from 'next/server'

/** Returns Google Maps API key + default center from the backend site settings.
 *  This is intentionally public – the key is already visible in the browser
 *  when the map renders. Cache for 60 s on the edge. */
export async function GET() {
  const apiBase =
    apiOriginForFetch() || (process.env.API_URL ?? '').replace(/\/$/, '')
  if (!apiBase) {
    // Fall back to env-only key
    return NextResponse.json({
      apiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? '',
      defaultLat: 39.9334,
      defaultLng: 32.8597,
      defaultZoom: 6,
    })
  }

  try {
    const res = await fetch(`${apiBase}/api/v1/site/public-config`, {
      next: { revalidate: 60 },
    })
    if (!res.ok) throw new Error('upstream')
    const data = (await res.json()) as {
      maps?: {
        google_maps_api_key?: string
        default_center?: { lat?: number; lng?: number }
        default_zoom?: number
      }
    }
    const maps = data.maps ?? {}
    return NextResponse.json({
      apiKey: maps.google_maps_api_key ?? process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? '',
      defaultLat: maps.default_center?.lat ?? 39.9334,
      defaultLng: maps.default_center?.lng ?? 32.8597,
      defaultZoom: maps.default_zoom ?? 6,
    })
  } catch {
    return NextResponse.json({
      apiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? '',
      defaultLat: 39.9334,
      defaultLng: 32.8597,
      defaultZoom: 6,
    })
  }
}
