#!/usr/bin/env node
/**
 * Yerelde tüm lokasyonlar için gerçek Google Places POI verisi hazırlar.
 *
 * Doldurulan alanlar:
 * - location_pages.travel_ideas_json  (gezilecek yer/plaj/müze)
 * - location_pages.service_pois_json  (restoran/market/eczane/ulaşım)
 * - listings.nearby_pois_json         (ilan koordinatına göre 30 km içi POI)
 *
 * Örnek:
 *   node scripts/fill-location-pois-local.mjs --dry-run --limit-pages 3
 *   node scripts/fill-location-pois-local.mjs
 */
import { createPgClient } from './lib/pg-client.mjs'

const args = process.argv.slice(2)
const dryRun = args.includes('--dry-run')
const force = args.includes('--force')
const skipTravel = args.includes('--skip-travel')
const skipService = args.includes('--skip-service')
const skipListings = args.includes('--skip-listings')
const limitPages = Number(args.find((a) => a.startsWith('--limit-pages='))?.split('=')[1] ?? 0)
const delayMs = Number(process.env.PLACES_DELAY_MS || 250)

const TRAVEL_TYPES = [
  { id: 'beach', label: 'Plajlar', googleType: 'beach', category: 'sightseeing', radiusM: 50_000, maxCount: 8, useKeyword: true },
  { id: 'tourist_attraction', label: 'Gezilecek yerler', googleType: 'tourist_attraction', category: 'sightseeing', radiusM: 75_000, maxCount: 8 },
  { id: 'museum', label: 'Müzeler', googleType: 'museum', category: 'sightseeing', radiusM: 50_000, maxCount: 6 },
  { id: 'archaeological_site', label: 'Tarihi yerler', googleType: 'archaeological_site', category: 'sightseeing', radiusM: 75_000, maxCount: 6, useKeyword: true },
]

const SERVICE_TYPES = [
  { id: 'restaurant', label: 'Restoranlar', googleType: 'restaurant', category: 'amenity', radiusM: 5_000, maxCount: 5 },
  { id: 'supermarket', label: 'Marketler', googleType: 'supermarket', category: 'amenity', radiusM: 5_000, maxCount: 5 },
  { id: 'pharmacy', label: 'Eczaneler', googleType: 'pharmacy', category: 'amenity', radiusM: 5_000, maxCount: 5 },
  { id: 'airport', label: 'Havalimanları', googleType: 'airport', category: 'transport', radiusM: 150_000, maxCount: 3 },
  { id: 'bus_station', label: 'Otobüs terminalleri', googleType: 'bus_station', category: 'transport', radiusM: 30_000, maxCount: 3 },
]

const EXCLUDED_TYPES = new Set([
  'lodging', 'hotel', 'motel', 'hostel', 'guest_house', 'rv_park',
  'car_rental', 'car_dealer', 'car_repair',
  'real_estate_agency', 'travel_agency', 'insurance_agency',
  'moving_company', 'storage',
])

const EXCLUDED_NAME_PATTERNS = [
  /\bvilla(s|r)?\b/i, /\botel\b/i, /\bhotel\b/i, /\bpansion/i, /\bpansiyon/i,
  /\bapart(man)?\b/i, /\bkiral[aı]/i, /\brent[\s-]?a[\s-]?car/i,
  /\bresort\b/i, /\bsuites?\b/i, /\boutique\b/i,
]

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function haversineKm(lat1, lng1, lat2, lng2) {
  const r = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLng = ((lng2 - lng1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2
  return r * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function round1(n) {
  return Math.round(n * 10) / 10
}

function popularityScore(place) {
  return ((place.rating ?? 3.5) * 2 + Math.min(place.userRatingsTotal ?? 0, 200) / 100) / Math.log(place.distanceKm + 2)
}

function isCompetitor(place) {
  const types = place.types ?? []
  if (types.some((t) => EXCLUDED_TYPES.has(t))) return true
  return EXCLUDED_NAME_PATTERNS.some((re) => re.test(place.name ?? ''))
}

function placesUrl({ lat, lng, type, apiKey }) {
  const useText = type.radiusM > 50_000
  const url = new URL(
    useText
      ? 'https://maps.googleapis.com/maps/api/place/textsearch/json'
      : 'https://maps.googleapis.com/maps/api/place/nearbysearch/json',
  )
  if (useText) {
    url.searchParams.set('query', type.googleType)
  } else if (type.useKeyword) {
    url.searchParams.set('keyword', type.googleType)
  } else {
    url.searchParams.set('type', type.googleType)
  }
  url.searchParams.set('location', `${lat},${lng}`)
  url.searchParams.set('radius', String(type.radiusM))
  url.searchParams.set('language', 'tr')
  url.searchParams.set('key', apiKey)
  return url
}

async function fetchPlacesForType({ lat, lng, type, apiKey }) {
  const res = await fetch(placesUrl({ lat, lng, type, apiKey }))
  if (!res.ok) throw new Error(`google_http_${res.status}`)
  const data = await res.json()
  if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
    throw new Error(`google_${data.status}_${data.error_message ?? ''}`)
  }
  return (data.results ?? [])
    .filter((p) => !isCompetitor(p))
    .map((p) => {
      const plat = Number(p.geometry?.location?.lat)
      const plng = Number(p.geometry?.location?.lng)
      const distanceKm = Number.isFinite(plat) && Number.isFinite(plng) ? haversineKm(lat, lng, plat, plng) : Infinity
      return {
        placeId: p.place_id,
        name: p.name,
        address: p.vicinity ?? p.formatted_address ?? '',
        distanceKm,
        lat: plat,
        lng: plng,
        rating: p.rating,
        userRatingsTotal: p.user_ratings_total,
        types: p.types ?? [],
      }
    })
    .filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lng) && p.distanceKm <= type.radiusM / 1000)
    .sort((a, b) => popularityScore(b) - popularityScore(a))
    .slice(0, type.maxCount)
}

function dedupeByPlaceId(rows) {
  const seen = new Set()
  const out = []
  for (const row of rows) {
    const key = row.place_id || row.placeId || `${row.name}:${round1(row.lat)}:${round1(row.lng)}`
    if (seen.has(key)) continue
    seen.add(key)
    out.push(row)
  }
  return out
}

async function resolveGoogleKey(pg) {
  const fromEnv = (process.env.GOOGLE_MAPS_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '').trim()
  if (fromEnv) return fromEnv
  const { rows } = await pg.query(
    `SELECT coalesce(value_json::text, '{}') AS raw
     FROM site_settings
     WHERE key = 'maps' AND organization_id IS NULL
     ORDER BY id DESC LIMIT 1`,
  )
  if (rows[0]?.raw) {
    const parsed = JSON.parse(rows[0].raw)
    const key = String(parsed.google_maps_api_key ?? '').trim()
    if (key) return key
  }
  throw new Error('Google Maps API anahtarı yok. GOOGLE_MAPS_API_KEY veya site_settings maps.google_maps_api_key gerekli.')
}

async function fetchLocationPages(pg) {
  const limitSql = limitPages > 0 ? 'limit $1' : ''
  const params = limitPages > 0 ? [limitPages] : []
  const { rows } = await pg.query(
    `SELECT
       lp.id::text,
       lp.slug_path,
       lp.region_type,
       CASE WHEN lp.region_type = 'destination' THEN coalesce(nullif(lp.title, ''), lp.slug_path) ELSE d.name END AS name,
       coalesce(r.name, '') AS region_name,
       coalesce(
         lp.map_lat::text,
         d.center_lat::text,
         listing_anchor.lat::text,
         ''
       ) AS lat,
       coalesce(
         lp.map_lng::text,
         d.center_lng::text,
         listing_anchor.lng::text,
         ''
       ) AS lng,
       coalesce(jsonb_array_length(lp.travel_ideas_json), 0) AS travel_count,
       coalesce(jsonb_array_length(lp.service_pois_json), 0) AS service_count,
       EXISTS (
         SELECT 1 FROM jsonb_array_elements(coalesce(lp.travel_ideas_json, '[]'::jsonb)) elem
         WHERE NULLIF(elem->>'place_id', '') IS NOT NULL
           AND NULLIF(elem->>'lat', '') IS NOT NULL
           AND NULLIF(elem->>'lng', '') IS NOT NULL
       ) AS has_real_travel,
       EXISTS (
         SELECT 1 FROM jsonb_array_elements(coalesce(lp.service_pois_json, '[]'::jsonb)) elem
         WHERE NULLIF(elem->>'place_id', '') IS NOT NULL
           AND NULLIF(elem->>'lat', '') IS NOT NULL
           AND NULLIF(elem->>'lng', '') IS NOT NULL
       ) AS has_real_service
     FROM location_pages lp
     LEFT JOIN districts d ON d.id = lp.district_id
     LEFT JOIN regions r ON r.id = coalesce(lp.region_id, d.region_id)
     LEFT JOIN LATERAL (
       SELECT avg(l.map_lat::float8) AS lat, avg(l.map_lng::float8) AS lng
       FROM listings l
       LEFT JOIN LATERAL (
         SELECT la.value_json AS meta
         FROM listing_attributes la
         WHERE la.listing_id = l.id
           AND la.group_code = 'listing_meta'
           AND la.key = 'v1'
         LIMIT 1
       ) lm ON TRUE
       WHERE l.status = 'published'
         AND l.map_lat IS NOT NULL
         AND l.map_lng IS NOT NULL
         AND (
           lower(concat_ws(' ', coalesce(l.location_name, ''), coalesce(lm.meta->>'address', ''), coalesce(lm.meta->>'city', ''), coalesce(lm.meta->>'district_label', ''), coalesce(lm.meta->>'province_city', ''), coalesce(lm.meta->>'region_display', ''))) LIKE '%' || lower(CASE WHEN lp.region_type = 'destination' THEN coalesce(nullif(lp.title, ''), lp.slug_path) ELSE d.name END) || '%'
           OR lower(concat_ws(' ', coalesce(l.location_name, ''), coalesce(lm.meta->>'address', ''), coalesce(lm.meta->>'city', ''), coalesce(lm.meta->>'district_label', ''), coalesce(lm.meta->>'province_city', ''), coalesce(lm.meta->>'region_display', ''))) LIKE '%' || lower(coalesce(r.name, '')) || '%'
         )
     ) listing_anchor ON TRUE
     WHERE lp.region_type IN ('district', 'destination')
       AND coalesce(lp.map_lat::text, d.center_lat::text, listing_anchor.lat::text, '') <> ''
       AND coalesce(lp.map_lng::text, d.center_lng::text, listing_anchor.lng::text, '') <> ''
     ORDER BY r.name, name, lp.slug_path
     ${limitSql}`,
    params,
  )
  return rows
}

function travelIdeaFromPlace(place, type, page) {
  return {
    title: place.name,
    summary: `${place.name}, ${page.name} çevresinde ${type.label.toLocaleLowerCase('tr-TR')} için öne çıkan noktalardan biridir.`,
    place_query: `${place.name}, ${page.name}, ${page.region_name}`,
    place_id: place.placeId,
    lat: place.lat,
    lng: place.lng,
    distance_km: round1(place.distanceKm),
    distance_km_from_district: round1(place.distanceKm),
    google_type: type.googleType,
    category: type.category,
  }
}

function servicePoiFromPlace(place, type) {
  return {
    type: type.id,
    label: place.name,
    googleType: type.googleType,
    lat: place.lat,
    lng: place.lng,
    category: type.category,
    source: 'google_vitrin',
    place_id: place.placeId,
  }
}

async function fillPage(pg, apiKey, page) {
  const lat = Number(String(page.lat).replace(',', '.'))
  const lng = Number(String(page.lng).replace(',', '.'))
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return { travel: 0, service: 0, skipped: true }

  let travel = []
  let service = []

  if (!skipTravel && (force || Number(page.travel_count) === 0 || !page.has_real_travel)) {
    for (const type of TRAVEL_TYPES) {
      const places = await fetchPlacesForType({ lat, lng, type, apiKey })
      travel.push(...places.map((place) => travelIdeaFromPlace(place, type, page)))
      await sleep(delayMs)
    }
    travel = dedupeByPlaceId(travel).slice(0, 18)
    if (!dryRun) {
      await pg.query('UPDATE location_pages SET travel_ideas_json = $2::jsonb WHERE id = $1::uuid', [
        page.id,
        JSON.stringify(travel),
      ])
    }
  }

  if (!skipService && (force || Number(page.service_count) === 0 || !page.has_real_service)) {
    for (const type of SERVICE_TYPES) {
      const places = await fetchPlacesForType({ lat, lng, type, apiKey })
      service.push(...places.map((place) => servicePoiFromPlace(place, type)))
      await sleep(delayMs)
    }
    service = dedupeByPlaceId(service).slice(0, 24)
    if (!dryRun) {
      await pg.query('UPDATE location_pages SET service_pois_json = $2::jsonb WHERE id = $1::uuid', [
        page.id,
        JSON.stringify(service),
      ])
    }
  }

  return { travel: travel.length, service: service.length, skipped: false }
}

async function refreshListingPois(pg) {
  const sql = `
    WITH listing_coords AS (
      SELECT id, map_lat::float8 AS mlat, map_lng::float8 AS mlng
      FROM listings
      WHERE status = 'published'
        AND map_lat IS NOT NULL
        AND map_lng IS NOT NULL
    ),
    travel_pois AS (
      SELECT
        lc.id AS listing_id,
        coalesce(NULLIF(trim(elem->>'title'), ''), NULLIF(trim(elem->>'name'), ''), 'Mekân') AS title,
        elem->>'summary' AS summary,
        coalesce(elem->>'image', '') AS image,
        coalesce(elem->>'link', '') AS link,
        coalesce(elem->>'place_id', '') AS place_id,
        (elem->>'lat')::float8 AS poi_lat,
        (elem->>'lng')::float8 AS poi_lng,
        CASE
          WHEN trim(coalesce(elem->>'distance_km_from_district', '')) ~ '^-?[0-9]+(\\.[0-9]+)?$'
          THEN (elem->>'distance_km_from_district')::numeric
          ELSE NULL::numeric
        END AS district_distance_km,
        ROUND((6371.0 * acos(GREATEST(-1.0, LEAST(1.0,
          cos(radians(lc.mlat)) * cos(radians((elem->>'lat')::float8))
          * cos(radians((elem->>'lng')::float8) - radians(lc.mlng))
          + sin(radians(lc.mlat)) * sin(radians((elem->>'lat')::float8))
        ))))::numeric, 1) AS distance_km
      FROM listing_coords lc
      CROSS JOIN location_pages lp
      CROSS JOIN LATERAL jsonb_array_elements(coalesce(lp.travel_ideas_json, '[]'::jsonb)) elem
      WHERE lp.region_type IN ('district', 'destination')
        AND trim(coalesce(elem->>'lat', '')) ~ '^-?[0-9]+(\\.[0-9]+)?$'
        AND trim(coalesce(elem->>'lng', '')) ~ '^-?[0-9]+(\\.[0-9]+)?$'
        AND NULLIF(trim(elem->>'place_id'), '') IS NOT NULL
    ),
    service_pois AS (
      SELECT
        lc.id AS listing_id,
        coalesce(NULLIF(trim(elem->>'label'), ''), NULLIF(trim(elem->>'type'), ''), 'Mekân') AS title,
        trim(regexp_replace(concat_ws(' ', NULLIF(trim(elem->>'category'), ''), NULLIF(trim(elem->>'type'), ''), NULLIF(trim(elem->>'googleType'), '')), '[[:space:]]+', ' ', 'g')) AS summary,
        '' AS image,
        '' AS link,
        trim(coalesce(elem->>'place_id', '')) AS place_id,
        (elem->>'lat')::float8 AS poi_lat,
        (elem->>'lng')::float8 AS poi_lng,
        NULL::numeric AS district_distance_km,
        ROUND((6371.0 * acos(GREATEST(-1.0, LEAST(1.0,
          cos(radians(lc.mlat)) * cos(radians((elem->>'lat')::float8))
          * cos(radians((elem->>'lng')::float8) - radians(lc.mlng))
          + sin(radians(lc.mlat)) * sin(radians((elem->>'lat')::float8))
        ))))::numeric, 1) AS distance_km
      FROM listing_coords lc
      JOIN LATERAL (
        SELECT lp.service_pois_json
        FROM location_pages lp
        LEFT JOIN districts d ON d.id = lp.district_id
        WHERE lp.region_type IN ('district', 'destination')
          AND coalesce(lp.map_lat, d.center_lat) IS NOT NULL
          AND coalesce(lp.map_lng, d.center_lng) IS NOT NULL
          AND lp.service_pois_json IS NOT NULL
          AND jsonb_array_length(lp.service_pois_json) > 0
        ORDER BY (6371.0 * acos(GREATEST(-1.0, LEAST(1.0,
          cos(radians(lc.mlat)) * cos(radians(coalesce(lp.map_lat, d.center_lat)::float8))
          * cos(radians(coalesce(lp.map_lng, d.center_lng)::float8) - radians(lc.mlng))
          + sin(radians(lc.mlat)) * sin(radians(coalesce(lp.map_lat, d.center_lat)::float8))
        ))))
        LIMIT 1
      ) ns ON TRUE
      CROSS JOIN LATERAL jsonb_array_elements(coalesce(ns.service_pois_json, '[]'::jsonb)) elem
      WHERE trim(coalesce(elem->>'lat', '')) ~ '^-?[0-9]+(\\.[0-9]+)?$'
        AND trim(coalesce(elem->>'lng', '')) ~ '^-?[0-9]+(\\.[0-9]+)?$'
        AND NULLIF(trim(elem->>'place_id'), '') IS NOT NULL
    ),
    pois AS (
      SELECT * FROM travel_pois
      UNION ALL
      SELECT * FROM service_pois
    ),
    ranked AS (
      SELECT *,
        ROW_NUMBER() OVER (
          PARTITION BY listing_id, ROUND(poi_lat::numeric, 4), ROUND(poi_lng::numeric, 4)
          ORDER BY distance_km
        ) AS dedupe_rn
      FROM pois
      WHERE distance_km <= 30
    ),
    topn AS (
      SELECT *, ROW_NUMBER() OVER (PARTITION BY listing_id ORDER BY distance_km) AS rn
      FROM ranked
      WHERE dedupe_rn = 1
    ),
    aggregated AS (
      SELECT listing_id,
        jsonb_agg(
          jsonb_build_object(
            'title', title,
            'summary', summary,
            'image', NULLIF(image, ''),
            'link', NULLIF(link, ''),
            'place_id', NULLIF(place_id, ''),
            'lat', poi_lat,
            'lng', poi_lng,
            'distance_km', distance_km,
            'distance_km_from_listing', distance_km,
            'distance_km_from_district', district_distance_km
          )
          ORDER BY distance_km
        ) AS pois_json
      FROM topn
      WHERE rn <= 18
      GROUP BY listing_id
    )
    UPDATE listings l
    SET nearby_pois_json = coalesce(a.pois_json, '[]'::jsonb)
    FROM aggregated a
    WHERE l.id = a.listing_id
    RETURNING l.id
  `
  if (dryRun) {
    const { rows } = await pg.query("SELECT count(*)::int AS n FROM listings WHERE status = 'published' AND map_lat IS NOT NULL AND map_lng IS NOT NULL")
    return Number(rows[0]?.n ?? 0)
  }
  const { rowCount } = await pg.query(sql)
  return rowCount ?? 0
}

async function main() {
  const pg = createPgClient()
  await pg.connect()
  try {
    const apiKey = await resolveGoogleKey(pg)
    const pages = await fetchLocationPages(pg)
    console.log(`[INFO] location_pages=${pages.length} dryRun=${dryRun} force=${force}`)
    let updatedTravel = 0
    let updatedService = 0
    let skipped = 0
    for (const [index, page] of pages.entries()) {
      const res = await fillPage(pg, apiKey, page)
      updatedTravel += res.travel > 0 ? 1 : 0
      updatedService += res.service > 0 ? 1 : 0
      skipped += res.skipped ? 1 : 0
      console.log(`[${index + 1}/${pages.length}] ${page.name} (${page.region_name}) travel=${res.travel} service=${res.service}`)
    }
    const listingCount = skipListings ? 0 : await refreshListingPois(pg)
    console.log(`[OK] travel_pages=${updatedTravel} service_pages=${updatedService} skipped=${skipped} listing_nearby_refreshed=${listingCount}`)
  } finally {
    await pg.end()
  }
}

main().catch((err) => {
  console.error('[FAIL]', err?.message || err)
  process.exit(1)
})
