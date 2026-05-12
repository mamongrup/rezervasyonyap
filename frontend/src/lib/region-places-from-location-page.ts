/**
 * `public/region-places/*.json` yoksa bölge vitrinini DB'deki `travel_ideas_json`
 * ve `service_pois_json` ile besler (Gezi vitrinı + yakın mekanlar + harita merkezi).
 */
import type { RegionPlaceData } from '@/app/api/region-places/route'
import type { DistrictServicePoi, LocationPage, TravelIdea } from '@/lib/travel-api'
import { parseTravelIdeas } from '@/lib/travel-ideas-parse'
import { getMessages } from '@/utils/getT'

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371
  const dLat = (lat2 - lat1) * (Math.PI / 180)
  const dLng = (lng2 - lng1) * (Math.PI / 180)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function parseCoord(raw: string | null | undefined): number | null {
  if (raw == null) return null
  const n = Number.parseFloat(String(raw).trim().replace(',', '.'))
  return Number.isFinite(n) ? n : null
}

function parseServicePois(raw: unknown): DistrictServicePoi[] {
  if (raw == null) return []
  if (Array.isArray(raw)) return raw as DistrictServicePoi[]
  if (typeof raw === 'string') {
    const s = raw.trim()
    if (!s) return []
    try {
      const p = JSON.parse(s) as unknown
      return Array.isArray(p) ? (p as DistrictServicePoi[]) : []
    } catch {
      return []
    }
  }
  return []
}

function travelIdeaCoords(idea: TravelIdea): { lat: number; lng: number } | null {
  const lat = typeof idea.lat === 'number' ? idea.lat : Number.parseFloat(String(idea.lat ?? ''))
  const lng = typeof idea.lng === 'number' ? idea.lng : Number.parseFloat(String(idea.lng ?? ''))
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null
  return { lat, lng }
}

/** İlan / panel kaynaklı gezi kalemi için sabit place_id üretimi (Google place_id değil). */
function travelIdeaPlaceId(idea: TravelIdea, idx: number): string {
  const raw = typeof idea.place_id === 'string' ? idea.place_id.trim() : ''
  if (raw) return raw
  const title = typeof idea.title === 'string' ? idea.title.slice(0, 80) : String(idx)
  return `travel_idea:${idx}:${title}`
}

export function resolveRegionCenterCoords(page: LocationPage): { lat: number; lng: number } | null {
  const fromPair = (la?: string | null, lo?: string | null) => {
    const lat = parseCoord(la)
    const lng = parseCoord(lo)
    if (lat == null || lng == null) return null
    return { lat, lng }
  }
  const districtLinked = Boolean((page.district_id ?? '').trim())
  return (
    fromPair(page.map_lat, page.map_lng) ??
    fromPair(page.district_center_lat, page.district_center_lng) ??
    (!districtLinked ? fromPair(page.region_center_lat, page.region_center_lng) : null) ??
    null
  )
}

/**
 * Dosya tabanlı `region-places` yoksa vitrin + yakın liste için yapı üretir.
 */
export function buildRegionPlacesFromLocationPage(
  page: LocationPage,
  regionSlug: string,
  regionDisplayName: string,
  locale: string,
): RegionPlaceData | null {
  const center = resolveRegionCenterCoords(page)
  if (!center) return null

  const copy = getMessages(locale).site.region
  const categories: RegionPlaceData['categories'] = []

  const ideas = parseTravelIdeas(page.travel_ideas_json as unknown)
  const ideaPlaces: {
    idea: TravelIdea
    idx: number
    lat: number
    lng: number
    dist: number
  }[] = []
  ideas.forEach((idea, idx) => {
    const c = travelIdeaCoords(idea)
    if (!c) return
    ideaPlaces.push({
      idea,
      idx,
      lat: c.lat,
      lng: c.lng,
      dist: haversineKm(center.lat, center.lng, c.lat, c.lng),
    })
  })

  if (ideaPlaces.length > 0) {
    categories.push({
      id: 'travel_ideas_db',
      name: copy.nearbyVitrinColSightseeing,
      icon: '🗺️',
      types: ideaPlaces.map(({ idea, idx, lat, lng, dist }) => ({
        id: `travel_idea_${idea.id ?? idx}`,
        name: idea.title?.trim() || `Öneri ${idx + 1}`,
        googleType: 'tourist_attraction',
        emoji: '📍',
        places: [
          {
            placeId: travelIdeaPlaceId(idea, idx),
            name: idea.title?.trim() || `Öneri ${idx + 1}`,
            address: idea.summary?.trim()?.slice(0, 160) ?? '',
            distanceKm: dist,
            lat,
            lng,
            types: ['tourist_attraction'],
          },
        ],
      })),
    })
  }

  const services = parseServicePois(page.service_pois_json as unknown)
  const amenities = services.filter((s) => (s.category ?? 'amenity') !== 'transport')
  const transport = services.filter((s) => s.category === 'transport')

  const mapSvcPlaces = (rows: DistrictServicePoi[], prefix: string) =>
    rows
      .map((s, idx) => {
        const lat = Number.isFinite(s.lat) ? s.lat : NaN
        const lng = Number.isFinite(s.lng) ? s.lng : NaN
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null
        const label = (s.label ?? s.type ?? 'Mekân').trim()
        const gType = (s.googleType ?? s.type ?? 'point_of_interest').trim()
        return {
          id: `${prefix}_${idx}`,
          name: label,
          googleType: gType,
          emoji: prefix === 'transport' ? '🚌' : '⭐',
          places: [
            {
              placeId: `svc:${prefix}:${s.type}:${idx}:${lat.toFixed(4)},${lng.toFixed(4)}`,
              name: label,
              address: '',
              distanceKm: haversineKm(center.lat, center.lng, lat, lng),
              lat,
              lng,
              types: [gType],
            },
          ],
        }
      })
      .filter((x): x is NonNullable<typeof x> => x != null)

  const amenTypes = mapSvcPlaces(amenities, 'amenity')
  if (amenTypes.length > 0) {
    categories.push({
      id: 'service_amenity_db',
      name: copy.nearbyVitrinColEssentials,
      icon: '🛒',
      types: amenTypes,
    })
  }

  const transTypes = mapSvcPlaces(transport, 'transport')
  if (transTypes.length > 0) {
    categories.push({
      id: 'service_transport_db',
      name: copy.nearbyVitrinColTransport,
      icon: '🚌',
      types: transTypes,
    })
  }

  if (categories.length === 0) return null

  return {
    regionName: regionDisplayName,
    regionSlug,
    coordinates: { lat: center.lat, lng: center.lng },
    savedAt: page.created_at ?? new Date().toISOString(),
    categories,
  }
}

/** Önce dosya (`public/region-places`), yoksa DB türevi. */
export function resolveRegionPlacesForBolgePage(
  fileData: RegionPlaceData | null,
  page: LocationPage | null,
  regionSlug: string,
  regionDisplayName: string,
  locale: string,
): RegionPlaceData | null {
  if (fileData?.categories?.length) return fileData
  if (!page) return null
  return buildRegionPlacesFromLocationPage(page, regionSlug, regionDisplayName, locale)
}
