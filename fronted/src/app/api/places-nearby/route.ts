import { NextRequest, NextResponse } from 'next/server'

// ─── Haversine mesafe (km) ────────────────────────────────────────────────────
function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLng = ((lng2 - lng1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

// ─── Google Places API sonuç tipi (Nearby Search + Text Search ortak alanlar) ─
interface PlacesResult {
  place_id: string
  name: string
  vicinity?: string
  formatted_address?: string
  geometry: { location: { lat: number; lng: number } }
  rating?: number
  user_ratings_total?: number
  opening_hours?: { open_now?: boolean }
  types?: string[]
  photos?: { photo_reference: string }[]
  price_level?: number
}

interface PlacesResponse {
  status: string
  results: PlacesResult[]
  next_page_token?: string
  error_message?: string
}

export interface NearbyPlace {
  placeId: string
  name: string
  address: string
  distanceKm: number
  lat: number
  lng: number
  rating?: number
  userRatingsTotal?: number
  openNow?: boolean
  types: string[]
  photoRef?: string
}

// ─── Google Places API'si için uygun endpoint seçimi ─────────────────────────
//
// Nearby Search: maks 50 km (50 000 m). Türe göre yakın mekan bulur.
// Text Search  : yarıçap sınırı yok (önyargı olarak kullanılır). 50 km+
//                mesafeler için (havalimanı, ören yeri vb.) daha uygundur.
//
const NEARBY_SEARCH_MAX_RADIUS_M = 50_000

function buildNearbySearchUrl(lat: number, lng: number, radiusM: number, googleType: string, language: string, key: string): string {
  const url = new URL('https://maps.googleapis.com/maps/api/place/nearbysearch/json')
  url.searchParams.set('location', `${lat},${lng}`)
  url.searchParams.set('radius', String(Math.min(radiusM, NEARBY_SEARCH_MAX_RADIUS_M)))
  url.searchParams.set('type', googleType)
  url.searchParams.set('language', language)
  url.searchParams.set('key', key)
  return url.toString()
}

function buildTextSearchUrl(lat: number, lng: number, radiusM: number, googleType: string, language: string, key: string): string {
  const url = new URL('https://maps.googleapis.com/maps/api/place/textsearch/json')
  // Text Search sorgu olarak türün kendisini kullanır; konum önyargısı ile birlikte çalışır
  url.searchParams.set('query', googleType)
  url.searchParams.set('location', `${lat},${lng}`)
  url.searchParams.set('radius', String(radiusM))
  url.searchParams.set('language', language)
  url.searchParams.set('key', key)
  return url.toString()
}

// ─── POST /api/places-nearby ──────────────────────────────────────────────────
// Body: { lat, lng, googleType, radiusM, maxCount, language?, apiKey? }
export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as {
      lat: number
      lng: number
      googleType: string
      radiusM: number
      maxCount: number
      language?: string
      apiKey?: string
    }

    const { lat, lng, googleType, radiusM, maxCount, language = 'tr', apiKey } = body

    if (!lat || !lng || !googleType) {
      return NextResponse.json({ error: 'lat, lng ve googleType zorunludur.' }, { status: 400 })
    }

    const key = apiKey?.trim() || process.env.GOOGLE_MAPS_API_KEY || ''
    if (!key) {
      return NextResponse.json(
        { error: 'Google Maps API anahtarı bulunamadı. Ayarlardan ekleyin veya GOOGLE_MAPS_API_KEY env değişkeni tanımlayın.' },
        { status: 400 },
      )
    }

    const safeRadius = Math.max(radiusM ?? 5000, 100)
    const safeMax = Math.min(Math.max(maxCount, 1), 20)

    // 50 km üzerinde Text Search, altında Nearby Search kullan
    const useTextSearch = safeRadius > NEARBY_SEARCH_MAX_RADIUS_M
    const apiUrl = useTextSearch
      ? buildTextSearchUrl(lat, lng, safeRadius, googleType, language, key)
      : buildNearbySearchUrl(lat, lng, safeRadius, googleType, language, key)

    const res = await fetch(apiUrl, { next: { revalidate: 0 } })
    if (!res.ok) {
      return NextResponse.json(
        { error: `Google API HTTP hatası: ${res.status}` },
        { status: 502 },
      )
    }

    const data = (await res.json()) as PlacesResponse

    if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
      return NextResponse.json(
        { error: `Google Places hatası: ${data.status} — ${data.error_message ?? ''}` },
        { status: 502 },
      )
    }

    // Mesafeyi hesapla, talep edilen yarıçap dışındakileri filtrele (Text Search için önemli),
    // ardından mesafeye göre sırala ve limitle
    const radiusKm = safeRadius / 1000
    const places: NearbyPlace[] = (data.results ?? [])
      .map((r) => ({
        placeId: r.place_id,
        name: r.name,
        address: r.vicinity ?? r.formatted_address ?? '',
        distanceKm: haversineKm(lat, lng, r.geometry.location.lat, r.geometry.location.lng),
        lat: r.geometry.location.lat,
        lng: r.geometry.location.lng,
        rating: r.rating,
        userRatingsTotal: r.user_ratings_total,
        openNow: r.opening_hours?.open_now,
        types: r.types ?? [],
        photoRef: r.photos?.[0]?.photo_reference,
      }))
      .filter((p) => p.distanceKm <= radiusKm)
      .sort((a, b) => a.distanceKm - b.distanceKm)
      .slice(0, safeMax)

    return NextResponse.json({
      places,
      status: data.status,
      total: data.results?.length ?? 0,
      usedTextSearch: useTextSearch,
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Beklenmedik hata'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
