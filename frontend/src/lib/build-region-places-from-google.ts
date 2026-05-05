import type { RegionPlaceData } from '@/app/api/region-places/route'
import { buildDefaultNearbyVitrinColumns } from '@/lib/nearby-vitrin-columns'

type NearbyPlaceRow = {
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
}

function sleep(ms: number) {
  return new Promise<void>((r) => setTimeout(r, ms))
}

async function fetchPlacesNearbyMerged(
  lat: number,
  lng: number,
  radiusM: number,
  googleTypes: string[],
  maxPerType: number,
  language: string,
  apiKey: string,
): Promise<NearbyPlaceRow[]> {
  const byId = new Map<string, NearbyPlaceRow>()
  const hints = googleTypes.length ? googleTypes : ['tourist_attraction']
  for (const gt of hints) {
    const res = await fetch('/api/places-nearby', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        lat,
        lng,
        googleType: gt,
        radiusM,
        maxCount: maxPerType,
        language,
        apiKey,
      }),
    })
    if (res.ok) {
      const pd = (await res.json()) as { places?: NearbyPlaceRow[] }
      for (const p of pd.places ?? []) {
        const prev = byId.get(p.placeId)
        if (!prev || p.distanceKm < prev.distanceKm) byId.set(p.placeId, p)
      }
    }
    await sleep(320)
  }
  return [...byId.values()].sort((a, b) => a.distanceKm - b.distanceKm).slice(0, maxPerType)
}

const COL_ICONS = ['🗺️', '🛒', '🚌']

/**
 * Site varsayılan vitrin şablonundaki satırlar için Google Places çağrıları yapıp
 * `RegionNearbyPlacesVitrin` + `NearbyPlacesSection` ile uyumlu JSON üretir.
 */
export async function buildRegionPlaceDataFromGoogleDefaults(opts: {
  regionName: string
  regionSlug: string
  lat: number
  lng: number
  apiKey: string
  locale?: string
  radiusM?: number
  maxPlacesPerRow?: number
}): Promise<RegionPlaceData> {
  const locale = opts.locale ?? 'tr'
  const radiusM = opts.radiusM ?? 45_000
  const maxPlacesPerRow = opts.maxPlacesPerRow ?? 8
  const cfg = buildDefaultNearbyVitrinColumns(locale)

  const categories: RegionPlaceData['categories'] = []
  for (let colIdx = 0; colIdx < cfg.columns.length; colIdx++) {
    const col = cfg.columns[colIdx]
    const types: RegionPlaceData['categories'][0]['types'] = []
    for (let rowIdx = 0; rowIdx < col.rows.length; rowIdx++) {
      const row = col.rows[rowIdx]
      const googleTypes = row.googleTypes ?? []
      const placesRaw = await fetchPlacesNearbyMerged(
        opts.lat,
        opts.lng,
        radiusM,
        googleTypes,
        maxPlacesPerRow,
        locale,
        opts.apiKey,
      )
      const places = placesRaw.map((p) => ({
        placeId: p.placeId,
        name: p.name,
        address: p.address,
        distanceKm: p.distanceKm,
        lat: p.lat,
        lng: p.lng,
        rating: p.rating,
        userRatingsTotal: p.userRatingsTotal,
        openNow: p.openNow,
        types: p.types ?? [],
      }))
      types.push({
        id: `nv-c${colIdx}-r${rowIdx}`,
        name: row.label,
        googleType: googleTypes[0] ?? 'point_of_interest',
        emoji: '📍',
        places,
      })
    }
    categories.push({
      id: `nv-col-${colIdx}`,
      name: col.title,
      icon: COL_ICONS[colIdx % COL_ICONS.length] ?? '📌',
      types,
    })
  }

  return {
    regionName: opts.regionName,
    regionSlug: opts.regionSlug,
    coordinates: { lat: opts.lat, lng: opts.lng },
    savedAt: new Date().toISOString(),
    categories,
  }
}

export async function postRegionPlacesJson(data: RegionPlaceData): Promise<{ ok: boolean; error?: string }> {
  const res = await fetch('/api/region-places', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'same-origin',
    body: JSON.stringify(data),
  })
  if (!res.ok) {
    const j = (await res.json().catch(() => ({}))) as { error?: string }
    return { ok: false, error: j.error ?? `HTTP ${res.status}` }
  }
  return { ok: true }
}
