#!/usr/bin/env node
/**
 * Nominatim ile yakındaki mekanlar + kuş uçuşu mesafe.
 *
 *   node scripts/enrich-location-pois-nominatim.mjs --slug-path=TR/mugla/fethiye
 *   node scripts/enrich-location-pois-nominatim.mjs --all-holiday-districts
 *   node scripts/enrich-location-pois-nominatim.mjs --all-holiday-districts --force
 */
import { createPgClient } from './lib/pg-client.mjs'

const args = process.argv.slice(2)
const slugPathArg = String(args.find((a) => a.startsWith('--slug-path='))?.split('=')[1] ?? '').trim()
const allHoliday = args.includes('--all-holiday-districts')
const force = args.includes('--force')
const skipListings = args.includes('--skip-listings')
const delayMs = Number(process.env.NOMINATIM_DELAY_MS || 1100)
const UA = process.env.NOMINATIM_USER_AGENT || 'rezervasyonyap-local-poi/1.0 (dev@localhost)'

/** Villa yoğunluğu yüksek ilçeler (yanlış LIKE eşleşmelerini ele) */
const HOLIDAY_DISTRICT_SLUGS = [
  'TR/antalya/kas',
  'TR/mugla/fethiye',
  'TR/mugla/bodrum',
  'TR/mugla/seydikemer',
  'TR/antalya/serik',
  'TR/mugla/ortaca',
  'TR/antalya/demre',
  'TR/antalya/alanya',
  'TR/antalya/finike',
  'TR/mugla/marmaris',
  'TR/antalya/kemer',
  'TR/mugla/dalaman',
]

if (!slugPathArg && !allHoliday) {
  console.error('Kullanim: --slug-path=TR/mugla/fethiye  veya  --all-holiday-districts')
  process.exit(1)
}

const SERVICE_QUERIES = [
  { id: 'restaurant', label: 'Restoran', googleType: 'restaurant', category: 'amenity', q: 'restaurant' },
  { id: 'supermarket', label: 'Market', googleType: 'supermarket', category: 'amenity', q: 'supermarket' },
  { id: 'pharmacy', label: 'Eczane', googleType: 'pharmacy', category: 'amenity', q: 'pharmacy' },
  { id: 'airport', label: 'Havalimanı', googleType: 'airport', category: 'transport', q: 'airport' },
  { id: 'bus_station', label: 'Otogar', googleType: 'bus_station', category: 'transport', q: 'bus station' },
]

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms))
}

function haversineKm(lat1, lng1, lat2, lng2) {
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

function round1(n) {
  return Math.round(n * 10) / 10
}

function hasCoords(obj) {
  const lat = Number(obj?.lat)
  const lng = Number(obj?.lng)
  return Number.isFinite(lat) && Number.isFinite(lng)
}

async function nominatimSearch(query, { lat, lng, limit = 5, bounded = false } = {}) {
  const url = new URL('https://nominatim.openstreetmap.org/search')
  url.searchParams.set('q', query)
  url.searchParams.set('format', 'json')
  url.searchParams.set('limit', String(limit))
  url.searchParams.set('addressdetails', '0')
  url.searchParams.set('countrycodes', 'tr')
  if (Number.isFinite(lat) && Number.isFinite(lng)) {
    const d = bounded ? 0.35 : 0.8
    url.searchParams.set('viewbox', `${lng - d},${lat + d},${lng + d},${lat - d}`)
    if (bounded) url.searchParams.set('bounded', '1')
  }
  const res = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'application/json' } })
  if (!res.ok) throw new Error(`nominatim_http_${res.status}`)
  const data = await res.json()
  return Array.isArray(data) ? data : []
}

async function geocodePlace(query, title, page) {
  const attempts = [
    { q: query, bounded: false },
    { q: `${title}, ${page.name}, Türkiye`, bounded: false },
    { q: `${title}, ${page.name}`, bounded: true },
    { q: title, bounded: false },
  ].filter((a) => a.q && String(a.q).trim())

  for (const attempt of attempts) {
    const hits = await nominatimSearch(attempt.q, {
      lat: page.lat,
      lng: page.lng,
      limit: 5,
      bounded: attempt.bounded,
    })
    await sleep(delayMs)
    const hit = hits.find((h) => Number.isFinite(Number(h.lat)) && Number.isFinite(Number(h.lon)))
    if (hit) return hit
  }
  return null
}

async function enrichPage(pg, page) {
  const travelIn = Array.isArray(page.travel) ? page.travel : JSON.parse(page.travel || '[]')
  const serviceIn = Array.isArray(page.service) ? page.service : JSON.parse(page.service || '[]')

  const travelReady = travelIn.filter(hasCoords).length
  const serviceReady = serviceIn.filter(hasCoords).length
  if (!force && travelReady >= 3 && serviceReady >= 3) {
    console.log(`[SKIP] ${page.slug_path} already enriched (travel=${travelReady} service=${serviceReady})`)
    return { skipped: true, travel: travelReady, service: serviceReady, listings: 0 }
  }

  console.log(`[INFO] ${page.name} (${page.slug_path}) @ ${page.lat},${page.lng}`)

  const travelOut = []
  for (const [i, idea] of travelIn.entries()) {
    const title = String(idea.title || '').trim()
    const query = String(idea.place_query || title || '').trim()
    let lat = Number(idea.lat)
    let lng = Number(idea.lng)
    let placeId = String(idea.place_id || '').trim()

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      if (!query && !title) {
        travelOut.push(idea)
        continue
      }
      console.log(`  geocode travel ${i + 1}/${travelIn.length}: ${query || title}`)
      const hit = await geocodePlace(query, title, page)
      if (hit) {
        lat = Number(hit.lat)
        lng = Number(hit.lon)
        placeId = `osm:${hit.osm_type || 'n'}:${hit.osm_id}`
      }
    }

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      travelOut.push(idea)
      continue
    }
    const distanceKm = round1(haversineKm(page.lat, page.lng, lat, lng))
    travelOut.push({
      ...idea,
      title: title || idea.title,
      place_query: query || idea.place_query,
      place_id: placeId || `travel_idea:${i}:${title}`,
      lat,
      lng,
      distance_km: distanceKm,
      distance_km_from_district: distanceKm,
      category: idea.category || 'sightseeing',
    })
    console.log(`    -> ${distanceKm} km`)
  }

  let serviceOut = serviceIn.filter(hasCoords)
  if (force || serviceOut.length < 3) {
    serviceOut = []
    for (const type of SERVICE_QUERIES) {
      const q = `${type.q} ${page.name} ${page.region_name}`.trim()
      console.log(`  search service: ${q}`)
      const hits = await nominatimSearch(q, { lat: page.lat, lng: page.lng, limit: 5 })
      await sleep(delayMs)
      for (const hit of hits.slice(0, 3)) {
        const lat = Number(hit.lat)
        const lng = Number(hit.lon)
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue
        const name = String(hit.display_name || '').split(',')[0]?.trim() || type.label
        serviceOut.push({
          type: type.id,
          label: name,
          googleType: type.googleType,
          lat,
          lng,
          category: type.category,
          source: 'nominatim_vitrin',
          place_id: `osm:${hit.osm_type || 'n'}:${hit.osm_id}`,
          distance_km: round1(haversineKm(page.lat, page.lng, lat, lng)),
        })
      }
    }
  }

  await pg.query(
    `UPDATE location_pages
     SET travel_ideas_json = $2::jsonb,
         service_pois_json = $3::jsonb,
         updated_at = now()
     WHERE id = $1::uuid`,
    [page.id, JSON.stringify(travelOut), JSON.stringify(serviceOut)],
  )

  let listings = 0
  if (!skipListings) {
    const { rowCount } = await pg.query(
      `WITH listing_coords AS (
         SELECT l.id, l.map_lat::float8 AS mlat, l.map_lng::float8 AS mlng
         FROM listings l
         JOIN product_categories c ON c.id = l.category_id
         WHERE c.code = 'holiday_home'
           AND l.status = 'published'
           AND l.map_lat IS NOT NULL AND l.map_lng IS NOT NULL
           AND lower(coalesce(l.location_name,'')) LIKE '%' || lower($2) || '%'
       ),
       travel_pois AS (
         SELECT lc.id AS listing_id,
           coalesce(nullif(trim(elem->>'title'),''), 'Mekan') AS title,
           elem->>'summary' AS summary,
           coalesce(elem->>'place_id','') AS place_id,
           (elem->>'lat')::float8 AS poi_lat,
           (elem->>'lng')::float8 AS poi_lng,
           ROUND((6371.0 * acos(GREATEST(-1.0, LEAST(1.0,
             cos(radians(lc.mlat)) * cos(radians((elem->>'lat')::float8))
             * cos(radians((elem->>'lng')::float8) - radians(lc.mlng))
             + sin(radians(lc.mlat)) * sin(radians((elem->>'lat')::float8))
           ))))::numeric, 1) AS distance_km
         FROM listing_coords lc
         CROSS JOIN location_pages lp
         CROSS JOIN LATERAL jsonb_array_elements(coalesce(lp.travel_ideas_json,'[]'::jsonb)) elem
         WHERE lp.id = $1::uuid
           AND nullif(trim(elem->>'lat'),'') IS NOT NULL
           AND nullif(trim(elem->>'lng'),'') IS NOT NULL
       ),
       service_pois AS (
         SELECT lc.id AS listing_id,
           coalesce(nullif(trim(elem->>'label'),''), 'Mekan') AS title,
           coalesce(elem->>'category','') AS summary,
           coalesce(elem->>'place_id','') AS place_id,
           (elem->>'lat')::float8 AS poi_lat,
           (elem->>'lng')::float8 AS poi_lng,
           ROUND((6371.0 * acos(GREATEST(-1.0, LEAST(1.0,
             cos(radians(lc.mlat)) * cos(radians((elem->>'lat')::float8))
             * cos(radians((elem->>'lng')::float8) - radians(lc.mlng))
             + sin(radians(lc.mlat)) * sin(radians((elem->>'lat')::float8))
           ))))::numeric, 1) AS distance_km
         FROM listing_coords lc
         CROSS JOIN location_pages lp
         CROSS JOIN LATERAL jsonb_array_elements(coalesce(lp.service_pois_json,'[]'::jsonb)) elem
         WHERE lp.id = $1::uuid
           AND nullif(trim(elem->>'lat'),'') IS NOT NULL
           AND nullif(trim(elem->>'lng'),'') IS NOT NULL
       ),
       pois AS (
         SELECT * FROM travel_pois WHERE distance_km <= 80
         UNION ALL
         SELECT * FROM service_pois WHERE distance_km <= 80
       ),
       topn AS (
         SELECT *, ROW_NUMBER() OVER (PARTITION BY listing_id ORDER BY distance_km) AS rn
         FROM pois
       ),
       aggregated AS (
         SELECT listing_id,
           jsonb_agg(
             jsonb_build_object(
               'title', title,
               'summary', summary,
               'place_id', nullif(place_id,''),
               'lat', poi_lat,
               'lng', poi_lng,
               'distance_km', distance_km,
               'distance_km_from_listing', distance_km
             ) ORDER BY distance_km
           ) AS pois_json
         FROM topn WHERE rn <= 18
         GROUP BY listing_id
       )
       UPDATE listings l
       SET nearby_pois_json = a.pois_json
       FROM aggregated a
       WHERE l.id = a.listing_id`,
      [page.id, page.name],
    )
    listings = rowCount ?? 0
  }

  const travelCount = travelOut.filter(hasCoords).length
  console.log(`[OK] ${page.slug_path} travel=${travelCount} service=${serviceOut.length} listings=${listings}`)
  return { skipped: false, travel: travelCount, service: serviceOut.length, listings }
}

async function main() {
  const pg = createPgClient()
  await pg.connect()
  try {
    const slugs = allHoliday ? HOLIDAY_DISTRICT_SLUGS : [slugPathArg]
    const { rows: pages } = await pg.query(
      `SELECT lp.id::text, lp.slug_path,
              coalesce(nullif(lp.title,''), d.name, lp.slug_path) AS name,
              coalesce(r.name,'') AS region_name,
              coalesce(lp.map_lat, d.center_lat)::float8 AS lat,
              coalesce(lp.map_lng, d.center_lng)::float8 AS lng,
              coalesce(lp.travel_ideas_json, '[]'::jsonb) AS travel,
              coalesce(lp.service_pois_json, '[]'::jsonb) AS service
       FROM location_pages lp
       LEFT JOIN districts d ON d.id = lp.district_id
       LEFT JOIN regions r ON r.id = coalesce(lp.region_id, d.region_id)
       WHERE lp.slug_path = ANY($1::text[])
       ORDER BY lp.slug_path`,
      [slugs],
    )

    console.log(`[INFO] pages=${pages.length} force=${force} allHoliday=${allHoliday}`)
    let totalListings = 0
    for (const page of pages) {
      if (!Number.isFinite(page.lat) || !Number.isFinite(page.lng)) {
        console.log(`[SKIP] no coords: ${page.slug_path}`)
        continue
      }
      const res = await enrichPage(pg, page)
      totalListings += res.listings || 0
    }

    // Tum holiday_home icin en yakin district page POI'lerinden mesafe yenile
    if (!skipListings && allHoliday) {
      const { rowCount } = await pg.query(
        `WITH holiday AS (
           SELECT l.id, l.map_lat::float8 AS mlat, l.map_lng::float8 AS mlng,
                  lower(coalesce(l.location_name,'')) AS loc_raw,
                  lower(translate(coalesce(l.location_name,''), 'İIıŞşĞğÜüÖöÇç', 'iiissgguuooocc')) AS loc
           FROM listings l
           JOIN product_categories c ON c.id = l.category_id
           WHERE c.code = 'holiday_home' AND l.status = 'published'
             AND l.map_lat IS NOT NULL AND l.map_lng IS NOT NULL
         ),
         page AS (
           SELECT lp.id,
                  lower(translate(d.name, 'İIıŞşĞğÜüÖöÇç', 'iiissgguuooocc')) AS dname,
                  coalesce(lp.travel_ideas_json,'[]'::jsonb) AS travel,
                  coalesce(lp.service_pois_json,'[]'::jsonb) AS service
           FROM location_pages lp
           JOIN districts d ON d.id = lp.district_id
           WHERE lp.slug_path = ANY($1::text[])
         ),
         matched AS (
           SELECT h.id AS listing_id, p.travel, p.service
           FROM holiday h
           JOIN LATERAL (
             SELECT * FROM page p
             WHERE h.loc LIKE '%' || p.dname || '%'
                OR (p.dname = 'kas' AND (h.loc_raw LIKE '%ka?%' OR h.loc LIKE '%kalkan%'))
             ORDER BY length(p.dname) DESC
             LIMIT 1
           ) p ON TRUE
         ),
         pois AS (
           SELECT m.listing_id,
             coalesce(nullif(trim(elem->>'title'),''), nullif(trim(elem->>'label'),''), 'Mekan') AS title,
             coalesce(elem->>'summary', elem->>'category', '') AS summary,
             coalesce(elem->>'place_id','') AS place_id,
             (elem->>'lat')::float8 AS poi_lat,
             (elem->>'lng')::float8 AS poi_lng,
             ROUND((6371.0 * acos(GREATEST(-1.0, LEAST(1.0,
               cos(radians(h.mlat)) * cos(radians((elem->>'lat')::float8))
               * cos(radians((elem->>'lng')::float8) - radians(h.mlng))
               + sin(radians(h.mlat)) * sin(radians((elem->>'lat')::float8))
             ))))::numeric, 1) AS distance_km
           FROM matched m
           JOIN holiday h ON h.id = m.listing_id
           CROSS JOIN LATERAL (
             SELECT value AS elem FROM jsonb_array_elements(m.travel)
             UNION ALL
             SELECT value FROM jsonb_array_elements(m.service)
           ) x(elem)
           WHERE nullif(trim(elem->>'lat'),'') IS NOT NULL
             AND nullif(trim(elem->>'lng'),'') IS NOT NULL
         ),
         topn AS (
           SELECT *, ROW_NUMBER() OVER (PARTITION BY listing_id ORDER BY distance_km) AS rn
           FROM pois WHERE distance_km <= 80
         ),
         aggregated AS (
           SELECT listing_id,
             jsonb_agg(
               jsonb_build_object(
                 'title', title,
                 'summary', summary,
                 'place_id', nullif(place_id,''),
                 'lat', poi_lat,
                 'lng', poi_lng,
                 'distance_km', distance_km,
                 'distance_km_from_listing', distance_km
               ) ORDER BY distance_km
             ) AS pois_json
           FROM topn WHERE rn <= 18
           GROUP BY listing_id
         )
         UPDATE listings l
         SET nearby_pois_json = a.pois_json
         FROM aggregated a
         WHERE l.id = a.listing_id`,
        [HOLIDAY_DISTRICT_SLUGS],
      )
      console.log(`[OK] final_holiday_nearby_refresh=${rowCount ?? 0} (page_loop_listings=${totalListings})`)
    }
  } finally {
    await pg.end()
  }
}

main().catch((err) => {
  console.error('[FAIL]', err.message || err)
  process.exit(1)
})
