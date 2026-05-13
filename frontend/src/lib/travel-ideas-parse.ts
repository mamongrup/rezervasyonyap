import type { TravelIdea } from '@/lib/travel-api'

/** JSON/DB bazen sayı veya başka tipte döner; `.trim()` çağrılarında güvenli metin. */
export function asTrimmedString(v: unknown): string {
  if (v == null) return ''
  if (typeof v === 'string') return v.trim()
  if (typeof v === 'number' && Number.isFinite(v)) return String(v)
  if (typeof v === 'boolean') return v ? 'true' : 'false'
  return String(v).trim()
}

/** API `travel_ideas_json` alanı string veya dizi olabilir. */
export function parseTravelIdeas(raw: unknown): TravelIdea[] {
  if (raw == null) return []
  if (Array.isArray(raw)) return raw as TravelIdea[]
  if (typeof raw === 'string') {
    const s = asTrimmedString(raw)
    if (s === '') return []
    try {
      const parsed = JSON.parse(s) as unknown
      return Array.isArray(parsed) ? (parsed as TravelIdea[]) : []
    } catch {
      return []
    }
  }
  return []
}

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371
  const dLat = (lat2 - lat1) * (Math.PI / 180)
  const dLng = (lng2 - lng1) * (Math.PI / 180)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function parseIdeaCoord(v: unknown): number | null {
  if (v == null) return null
  const n = typeof v === 'number' ? v : Number.parseFloat(String(v).trim().replace(',', '.'))
  return Number.isFinite(n) ? n : null
}

function ideaLatLngPair(idea: TravelIdea): { lat: number; lng: number } | null {
  const lat = parseIdeaCoord(idea.lat)
  const lng = parseIdeaCoord(idea.lng)
  if (lat == null || lng == null) return null
  return { lat, lng }
}

function median1d(values: number[]): number {
  if (values.length === 0) return Number.NaN
  const s = [...values].sort((a, b) => a - b)
  const m = Math.floor(s.length / 2)
  return s.length % 2 ? s[m]! : (s[m - 1]! + s[m]!) / 2
}

/**
 * Harita merkezi için gezi fikirlerinden tek nokta: varsa `anchor` (ör. il/ilçe merkezi) en yakın
 * fikir; anchor yoksa koordinatların medyanı. Anchor varken en yakın fikir çok uzaktaysa `null`
 * (çağıran `region_center` vb. kullanır) — «listedeki ilk satır» veya uç POI yanıltmasını keser.
 */
export function pickTravelIdeasMapCoords(
  raw: unknown,
  anchor: { lat: number; lng: number } | null | undefined,
  opts?: { maxKmFromAnchor?: number },
): { lat: number; lng: number } | null {
  const ideas = parseTravelIdeas(raw)
  const pairs: { lat: number; lng: number }[] = []
  for (const idea of ideas) {
    const p = ideaLatLngPair(idea)
    if (p) pairs.push(p)
  }
  if (pairs.length === 0) return null

  const a =
    anchor && Number.isFinite(anchor.lat) && Number.isFinite(anchor.lng) ? anchor : null
  const maxKm = opts?.maxKmFromAnchor ?? 60

  if (pairs.length === 1) {
    const only = pairs[0]!
    if (a) {
      const d = haversineKm(a.lat, a.lng, only.lat, only.lng)
      if (d > maxKm) return null
    }
    return only
  }

  if (a) {
    let best = pairs[0]!
    let bestD = haversineKm(a.lat, a.lng, best.lat, best.lng)
    for (let i = 1; i < pairs.length; i++) {
      const q = pairs[i]!
      const d = haversineKm(a.lat, a.lng, q.lat, q.lng)
      if (d < bestD) {
        best = q
        bestD = d
      }
    }
    if (bestD > maxKm) return null
    return best
  }

  return {
    lat: median1d(pairs.map((p) => p.lat)),
    lng: median1d(pairs.map((p) => p.lng)),
  }
}
