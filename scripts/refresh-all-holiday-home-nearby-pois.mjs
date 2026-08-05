#!/usr/bin/env node
/**
 * Tüm koordinatlı villa/tatil evi ilanları için gerçek OpenStreetMap mekanlarını
 * bölgesel kümeler halinde çeker, ilana göre Haversine mesafesini hesaplar ve
 * nearby_pois_json alanını günceller.
 *
 * Tek tek villa komutu gerekmez:
 *   node scripts/refresh-all-holiday-home-nearby-pois.mjs
 *
 * Ortam:
 *   DRY_RUN=1            DB yazma
 *   ONLY_LISTING_ID=uuid yalnız bir ilan
 *   MAX_CLUSTERS=2       ilk N küme (test)
 *   OSM_CLUSTER_DEGREES  varsayılan 0.18 (~16–20 km)
 */
import { createPgClient } from './lib/pg-client.mjs'

const OVERPASS_ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.private.coffee/api/interpreter',
]
const CLUSTER_DEGREES = Number(process.env.OSM_CLUSTER_DEGREES ?? 0.18)
const LOCAL_RADIUS_M = Number(process.env.OSM_LOCAL_RADIUS_M ?? 28_000)
const AIRPORT_RADIUS_M = Number(process.env.OSM_AIRPORT_RADIUS_M ?? 180_000)
const REQUEST_TIMEOUT_MS = Number(process.env.OSM_REQUEST_TIMEOUT_MS ?? 90_000)
const MAX_CLUSTERS = Math.max(0, Number(process.env.MAX_CLUSTERS ?? 0))
const ONLY_LISTING_ID = String(process.env.ONLY_LISTING_ID ?? '').trim()
const DRY_RUN = process.env.DRY_RUN === '1'

const CATEGORY_LIMITS = {
  beach: 3,
  ruins: 3,
  historic: 3,
  market: 3,
  restaurant: 3,
  hospital: 2,
  pharmacy: 3,
  airport: 2,
  bus_station: 2,
  port: 3,
}

const CATEGORY_POPULARITY = {
  beach: 88,
  ruins: 90,
  historic: 88,
  market: 78,
  restaurant: 80,
  hospital: 92,
  pharmacy: 80,
  airport: 100,
  bus_station: 92,
  port: 90,
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export function haversineKm(lat1, lng1, lat2, lng2) {
  const toRad = (value) => (value * Math.PI) / 180
  const radius = 6371
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLng / 2) ** 2
  return radius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function elementCoords(element) {
  const lat = Number(element.lat ?? element.center?.lat)
  const lng = Number(element.lon ?? element.center?.lon)
  return Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null
}

function localizedName(tags = {}) {
  return String(tags['name:tr'] ?? tags.name ?? '').trim()
}

export function classifyOsmElement(element) {
  const tags = element?.tags ?? {}
  const name = localizedName(tags)
  const coords = elementCoords(element)
  if (!name || !coords || /[\u0370-\u03ff]/.test(name)) return null
  if (String(tags['addr:country'] ?? '').toUpperCase() === 'GR') return null

  let category
  let summary
  if (tags.natural === 'beach') {
    category = 'beach'; summary = 'Plaj'
  } else if (['archaeological_site', 'ruins'].includes(tags.historic)) {
    category = 'ruins'; summary = 'Ören yeri'
  } else if (tags.historic || ['museum', 'attraction', 'viewpoint'].includes(tags.tourism)) {
    category = 'historic'; summary = tags.tourism === 'museum' ? 'Müze' : 'Tarihi alan'
  } else if (tags.shop === 'supermarket') {
    category = 'market'; summary = 'Süpermarket'
  } else if (tags.amenity === 'restaurant') {
    category = 'restaurant'; summary = 'Restoran'
  } else if (tags.amenity === 'hospital') {
    category = 'hospital'; summary = 'Hastane'
  } else if (tags.amenity === 'pharmacy') {
    category = 'pharmacy'; summary = 'Eczane'
  } else if (tags.aeroway === 'aerodrome') {
    category = 'airport'; summary = 'Havalimanı'
  } else if (tags.amenity === 'bus_station') {
    category = 'bus_station'; summary = 'Otogar'
  } else if (tags.amenity === 'ferry_terminal' || tags.leisure === 'marina') {
    category = 'port'; summary = tags.leisure === 'marina' ? 'Marina' : 'Liman'
  } else {
    return null
  }

  let popularity = CATEGORY_POPULARITY[category] ?? 70
  if (tags.wikidata || tags.wikipedia) popularity += 8
  if (tags.brand || tags.operator) popularity += 3
  if (tags.website || tags['contact:website']) popularity += 2
  popularity = Math.min(100, popularity)

  return {
    title: name,
    summary,
    category,
    popularity,
    manual: false,
    place_id: `osm-${element.type}-${element.id}`,
    lat: coords.lat,
    lng: coords.lng,
  }
}

function localOverpassQuery(lat, lng) {
  return `[out:json][timeout:60];
(
  nwr(around:${LOCAL_RADIUS_M},${lat},${lng})[natural="beach"](if:t["name"]);
  nwr(around:${LOCAL_RADIUS_M},${lat},${lng})[historic~"archaeological_site|ruins|castle"](if:t["name"]);
  nwr(around:${LOCAL_RADIUS_M},${lat},${lng})[tourism~"attraction|museum|viewpoint"](if:t["name"]);
  nwr(around:${LOCAL_RADIUS_M},${lat},${lng})[shop="supermarket"](if:t["name"]);
  nwr(around:${LOCAL_RADIUS_M},${lat},${lng})[amenity~"restaurant|hospital|pharmacy|bus_station|ferry_terminal"](if:t["name"]);
  nwr(around:${LOCAL_RADIUS_M},${lat},${lng})[leisure="marina"](if:t["name"]);
);
out center tags 500;`
}

function airportOverpassQuery(lat, lng) {
  return `[out:json][timeout:45];
nwr(around:${AIRPORT_RADIUS_M},${lat},${lng})[aeroway="aerodrome"](if:t["name"]);
out center tags 40;`
}

async function fetchOverpass(query, label) {
  let lastError
  for (let attempt = 0; attempt < OVERPASS_ENDPOINTS.length * 2; attempt++) {
    const endpoint = OVERPASS_ENDPOINTS[attempt % OVERPASS_ENDPOINTS.length]
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
          'User-Agent': 'rezervasyonyap-travel/1.0 (nearby-poi-backfill)',
        },
        body: new URLSearchParams({ data: query }),
        signal: controller.signal,
      })
      const text = await response.text()
      if (!response.ok || !text.trim().startsWith('{')) {
        throw new Error(`HTTP ${response.status}: ${text.slice(-240)}`)
      }
      const data = JSON.parse(text)
      return Array.isArray(data.elements) ? data.elements : []
    } catch (error) {
      lastError = error
      console.warn(`[WARN] Overpass ${label} attempt=${attempt + 1}: ${error.message}`)
      await sleep(1500 * (attempt + 1))
    } finally {
      clearTimeout(timeout)
    }
  }
  throw lastError ?? new Error(`Overpass ${label} failed`)
}

export function clusterListings(listings, clusterDegrees = CLUSTER_DEGREES) {
  const clusters = new Map()
  for (const listing of listings) {
    const lat = Number(listing.map_lat)
    const lng = Number(listing.map_lng)
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue
    const key = `${Math.floor(lat / clusterDegrees)}:${Math.floor(lng / clusterDegrees)}`
    const cluster = clusters.get(key) ?? { key, listings: [], latSum: 0, lngSum: 0 }
    cluster.listings.push({ ...listing, map_lat: lat, map_lng: lng })
    cluster.latSum += lat
    cluster.lngSum += lng
    clusters.set(key, cluster)
  }
  return [...clusters.values()].map((cluster) => ({
    key: cluster.key,
    listings: cluster.listings,
    lat: cluster.latSum / cluster.listings.length,
    lng: cluster.lngSum / cluster.listings.length,
  }))
}

function dedupePois(pois) {
  const byKey = new Map()
  for (const poi of pois) {
    const key = poi.place_id || `${poi.category}:${poi.title.toLocaleLowerCase('tr')}`
    const previous = byKey.get(key)
    if (!previous || poi.popularity > previous.popularity) byKey.set(key, poi)
  }
  return [...byKey.values()]
}

export function selectPoisForListing(listing, allPois, existingPois = []) {
  const candidates = allPois
    .map((poi) => ({
      ...poi,
      distance_km: Math.round(haversineKm(listing.map_lat, listing.map_lng, poi.lat, poi.lng) * 10) / 10,
    }))
    .filter((poi) => poi.distance_km > 0 && poi.distance_km <= (poi.category === 'airport' ? 220 : 80))

  const selected = []
  for (const [category, limit] of Object.entries(CATEGORY_LIMITS)) {
    const categoryPois = candidates
      .filter((poi) => poi.category === category)
      .sort(
        (a, b) =>
          (b.popularity - Math.min(b.distance_km * 0.3, 35)) -
            (a.popularity - Math.min(a.distance_km * 0.3, 35)) ||
          a.distance_km - b.distance_km,
      )
    selected.push(...categoryPois.slice(0, limit))
    selected.push(
      ...categoryPois
        .slice(limit)
        .filter((poi) => poi.popularity >= 96)
        .slice(0, Math.max(0, 5 - limit)),
    )
  }

  const manual = (Array.isArray(existingPois) ? existingPois : []).filter((poi) => poi?.manual === true)
  return dedupePois([...selected, ...manual]).sort((a, b) => a.distance_km - b.distance_km)
}

async function main() {
  const db = createPgClient()
  await db.connect()
  try {
    const coverage = await db.query(
      `SELECT
         count(*)::int AS total,
         count(*) FILTER (WHERE l.map_lat IS NOT NULL AND l.map_lng IS NOT NULL)::int AS with_coords,
         count(*) FILTER (WHERE l.map_lat IS NULL OR l.map_lng IS NULL)::int AS missing_coords
       FROM listings l
       JOIN product_categories pc ON pc.id = l.category_id
       WHERE pc.code = 'holiday_home' AND l.status IN ('draft', 'published')`,
    )
    const params = []
    let idFilter = ''
    if (ONLY_LISTING_ID) {
      params.push(ONLY_LISTING_ID)
      idFilter = ` AND l.id = $${params.length}::uuid`
    }
    const result = await db.query(
      `SELECT l.id::text, l.slug, l.location_name, l.map_lat, l.map_lng,
              coalesce(l.nearby_pois_json, '[]'::jsonb) AS nearby_pois_json
       FROM listings l
       JOIN product_categories pc ON pc.id = l.category_id
       WHERE pc.code = 'holiday_home'
         AND l.status IN ('draft', 'published')
         AND l.map_lat IS NOT NULL
         AND l.map_lng IS NOT NULL
         ${idFilter}
       ORDER BY l.id`,
      params,
    )

    let clusters = clusterListings(result.rows)
    if (MAX_CLUSTERS > 0) clusters = clusters.slice(0, MAX_CLUSTERS)
    console.log(
      `[START] total=${coverage.rows[0]?.total ?? 0} with_coords=${coverage.rows[0]?.with_coords ?? 0} missing_coords=${coverage.rows[0]?.missing_coords ?? 0} selected=${result.rows.length} clusters=${clusters.length} dry_run=${DRY_RUN}`,
    )

    let updated = 0
    let skipped = 0
    let failed = 0
    for (let index = 0; index < clusters.length; index++) {
      const cluster = clusters[index]
      console.log(
        `[CLUSTER ${index + 1}/${clusters.length}] key=${cluster.key} listings=${cluster.listings.length} center=${cluster.lat.toFixed(4)},${cluster.lng.toFixed(4)}`,
      )
      try {
        const [localElements, airportElements] = await Promise.all([
          fetchOverpass(localOverpassQuery(cluster.lat, cluster.lng), `${cluster.key}:local`),
          fetchOverpass(airportOverpassQuery(cluster.lat, cluster.lng), `${cluster.key}:airport`),
        ])
        const pois = dedupePois(
          [...localElements, ...airportElements].map(classifyOsmElement).filter(Boolean),
        )
        console.log(`[POIS] cluster=${cluster.key} found=${pois.length}`)

        for (const listing of cluster.listings) {
          const selected = selectPoisForListing(listing, pois, listing.nearby_pois_json)
          if (selected.length === 0) {
            skipped++
            continue
          }
          if (!DRY_RUN) {
            await db.query(
              `UPDATE listings SET nearby_pois_json = $2::jsonb WHERE id = $1::uuid`,
              [listing.id, JSON.stringify(selected)],
            )
          }
          updated++
        }
      } catch (error) {
        failed += cluster.listings.length
        console.error(`[FAIL] cluster=${cluster.key}: ${error.message}`)
      }
      await sleep(1800)
    }

    console.log(`[DONE] updated=${updated} skipped=${skipped} failed=${failed} clusters=${clusters.length}`)
    if (failed > 0 && updated === 0) process.exitCode = 1
  } finally {
    await db.end()
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error('[FAIL]', error.stack || error.message || error)
    process.exit(1)
  })
}
