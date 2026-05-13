/**
 * POST /api/distance-matrix
 *
 * Google Maps Distance Matrix API proxy.
 * Tek origin'den birden fazla destination'a sürüş (driving) mesafesi döndürür.
 *
 * Body: {
 *   origin: { lat: number; lng: number }
 *   destinations: { id: string; lat: number; lng: number }[]
 *   apiKey?: string
 *   language?: string
 * }
 * Response: {
 *   results: { id: string; distanceM: number; distanceText: string; durationText: string }[]
 * }
 */
import { NextRequest, NextResponse } from 'next/server'

interface DistanceElement {
  status: string
  distance?: { value: number; text: string }
  duration?: { value: number; text: string }
}

interface DistanceMatrixResponse {
  status: string
  rows: { elements: DistanceElement[] }[]
  error_message?: string
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as {
      origin: { lat: number; lng: number }
      destinations: { id: string; lat: number; lng: number }[]
      apiKey?: string
      language?: string
    }

    const { origin, destinations, apiKey, language = 'tr' } = body

    if (!origin?.lat || !origin?.lng || !destinations?.length) {
      return NextResponse.json({ error: 'origin ve destinations zorunludur.' }, { status: 400 })
    }

    const key =
      apiKey?.trim() ||
      process.env.GOOGLE_MAPS_API_KEY?.trim() ||
      process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY?.trim() ||
      ''
    if (!key) {
      return NextResponse.json({ error: 'API anahtarı bulunamadı.' }, { status: 400 })
    }

    const originStr = `${origin.lat},${origin.lng}`
    const destStr = destinations.map((d) => `${d.lat},${d.lng}`).join('|')

    const url = new URL('https://maps.googleapis.com/maps/api/distancematrix/json')
    url.searchParams.set('origins', originStr)
    url.searchParams.set('destinations', destStr)
    url.searchParams.set('mode', 'driving')
    url.searchParams.set('language', language)
    url.searchParams.set('key', key)

    const res = await fetch(url.toString(), { next: { revalidate: 0 } })
    if (!res.ok) {
      return NextResponse.json({ error: `Google API HTTP hatası: ${res.status}` }, { status: 502 })
    }

    const data = (await res.json()) as DistanceMatrixResponse

    if (data.status !== 'OK') {
      return NextResponse.json(
        { error: `Distance Matrix hatası: ${data.status} — ${data.error_message ?? ''}` },
        { status: 502 },
      )
    }

    const elements = data.rows?.[0]?.elements ?? []
    const results = destinations.map((dest, i) => {
      const el = elements[i]
      if (!el || el.status !== 'OK') {
        return { id: dest.id, distanceM: null, distanceText: null, durationText: null }
      }
      return {
        id: dest.id,
        distanceM: el.distance?.value ?? null,
        distanceText: el.distance?.text ?? null,
        durationText: el.duration?.text ?? null,
      }
    })

    return NextResponse.json({ results })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Beklenmedik hata'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
