#!/usr/bin/env node
/**
 * Eksik lokasyon koordinatlarını Google Geocoding ile doldurur.
 *
 * Sıra:
 *   1) districts.center_lat/lng (961 ilçe)
 *   2) location_pages.map_* — province/district/destination
 *   3) 302_sync_hierarchy_coords.sql mantığı (script içinde)
 *
 * Sunucu:
 *   set -a && source /etc/rezervasyonyap/backend.env && set +a
 *   node scripts/geocode-location-coords.mjs --dry-run --limit 5
 *   node scripts/geocode-location-coords.mjs --only districts
 *   node scripts/geocode-location-coords.mjs
 *
 * Google anahtarı: GOOGLE_MAPS_API_KEY ortam değişkeni veya site_settings.key = 'maps'
 */
import { createPgClient } from './lib/pg-client.mjs'
import { loadBackendEnvFile } from './lib/load-backend-env.mjs'

const args = process.argv.slice(2)
const dryRun = args.includes('--dry-run')
const force = args.includes('--force')
const onlyArg = args.find((a) => a.startsWith('--only='))?.slice('--only='.length)
  ?? (args.includes('--only') ? args[args.indexOf('--only') + 1] : 'all')
const limitArg = args.find((a) => a.startsWith('--limit='))?.slice('--limit='.length)
  ?? (args.includes('--limit') ? args[args.indexOf('--limit') + 1] : null)
const limit = limitArg ? Math.max(1, parseInt(limitArg, 10) || 0) : 0
const delayMs = Number(process.env.GEOCODE_DELAY_MS || 250)

const TR_BOUNDS = { latMin: 35.5, latMax: 42.5, lngMin: 25.5, lngMax: 45.0 }

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

function inTurkey(lat, lng) {
  return (
    lat >= TR_BOUNDS.latMin &&
    lat <= TR_BOUNDS.latMax &&
    lng >= TR_BOUNDS.lngMin &&
    lng <= TR_BOUNDS.lngMax
  )
}

async function resolveGoogleKey(client) {
  const fromEnv = (process.env.GOOGLE_MAPS_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '').trim()
  if (fromEnv) return fromEnv
  const { rows } = await client.query(
    `SELECT coalesce(value_json::text, '{}') AS j
     FROM site_settings
     WHERE key = 'maps' AND organization_id IS NULL
     ORDER BY id DESC LIMIT 1`,
  )
  if (rows[0]?.j) {
    try {
      const parsed = JSON.parse(rows[0].j)
      const k = typeof parsed.google_maps_api_key === 'string' ? parsed.google_maps_api_key.trim() : ''
      if (k) return k
    } catch {
      /* ignore */
    }
  }
  throw new Error('Google Maps API anahtarı yok. GOOGLE_MAPS_API_KEY veya Yönetim → Ayarlar → Google.')
}

async function geocodeAddress(apiKey, address) {
  const u = new URL('https://maps.googleapis.com/maps/api/geocode/json')
  u.searchParams.set('address', address)
  u.searchParams.set('language', 'tr')
  u.searchParams.set('region', 'tr')
  u.searchParams.set('components', 'country:TR')
  u.searchParams.set('key', apiKey)
  const res = await fetch(u.toString())
  if (!res.ok) throw new Error(`geocode_http_${res.status}`)
  const data = await res.json()
  if (data.status !== 'OK' || !data.results?.length) {
    return { ok: false, status: data.status ?? 'ZERO_RESULTS' }
  }
  const loc = data.results[0]?.geometry?.location
  const lat = Number(loc?.lat)
  const lng = Number(loc?.lng)
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return { ok: false, status: 'no_geometry' }
  }
  return {
    ok: true,
    lat: Math.round(lat * 1e6) / 1e6,
    lng: Math.round(lng * 1e6) / 1e6,
    formatted: data.results[0]?.formatted_address ?? '',
  }
}

function districtQueries(name, regionName) {
  return [
    `${name} ilçesi, ${regionName}, Türkiye`,
    `${name}, ${regionName}, Türkiye`,
    `${name} Merkez, ${regionName}, Türkiye`,
  ]
}

function destinationQueries(title, districtName, regionName) {
  return [
    `${title}, ${districtName}, ${regionName}, Türkiye`,
    `${title}, ${districtName}, Türkiye`,
    `${title}, ${regionName}, Türkiye`,
  ]
}

async function geocodeWithFallback(apiKey, queries, regionLat, regionLng) {
  for (const q of queries) {
    const r = await geocodeAddress(apiKey, q)
    await sleep(delayMs)
    if (!r.ok || !inTurkey(r.lat, r.lng)) continue
    if (regionLat != null && regionLng != null) {
      const dist = haversineKm(r.lat, r.lng, regionLat, regionLng)
      if (dist > 180) continue
    }
    return { ...r, query: q }
  }
  return null
}

async function syncHierarchyPages(client) {
  const steps = [
    {
      label: 'province pages ← regions',
      sql: `
        UPDATE location_pages lp
        SET map_lat = r.center_lat, map_lng = r.center_lng, updated_at = now()
        FROM regions r
        WHERE lp.region_type = 'province' AND lp.region_id = r.id
          AND r.center_lat IS NOT NULL AND r.center_lng IS NOT NULL
          AND (lp.map_lat IS NULL OR lp.map_lng IS NULL)
      `,
    },
    {
      label: 'district pages ← districts',
      sql: `
        UPDATE location_pages lp
        SET map_lat = d.center_lat, map_lng = d.center_lng, updated_at = now()
        FROM districts d
        WHERE lp.region_type = 'district' AND lp.district_id = d.id
          AND d.center_lat IS NOT NULL AND d.center_lng IS NOT NULL
          AND (lp.map_lat IS NULL OR lp.map_lng IS NULL)
      `,
    },
  ]
  for (const step of steps) {
    if (dryRun) {
      console.log(`[dry-run] sync: ${step.label}`)
      continue
    }
    const r = await client.query(step.sql)
    console.log(`✓ sync ${step.label}: ${r.rowCount} satır`)
  }
}

async function geocodeDistricts(client, apiKey) {
  const missingClause = force
    ? 'TRUE'
    : '(d.center_lat IS NULL OR d.center_lng IS NULL)'
  const { rows } = await client.query(
    `SELECT d.id, d.name AS district_name, r.name AS region_name,
            r.center_lat::float8 AS region_lat, r.center_lng::float8 AS region_lng,
            d.center_lat, d.center_lng
     FROM districts d
     JOIN regions r ON r.id = d.region_id
     JOIN countries c ON c.id = r.country_id
     WHERE c.iso2 = 'TR' AND ${missingClause}
     ORDER BY r.name, d.name`,
  )
  const todo = limit > 0 ? rows.slice(0, limit) : rows
  console.log(`→ İlçe geocode: ${todo.length}/${rows.length} hedef`)
  let ok = 0
  let fail = 0
  for (const row of todo) {
    const queries = districtQueries(row.district_name, row.region_name)
    const hit = await geocodeWithFallback(
      apiKey,
      queries,
      row.region_lat,
      row.region_lng,
    )
    if (!hit) {
      console.log(`  ✗ ${row.district_name} (${row.region_name}) — sonuç yok`)
      fail++
      continue
    }
    console.log(`  ✓ ${row.district_name} (${row.region_name}) → ${hit.lat}, ${hit.lng}`)
    if (!dryRun) {
      await client.query(
        `UPDATE districts SET center_lat = $2, center_lng = $3 WHERE id = $1`,
        [row.id, hit.lat, hit.lng],
      )
      await client.query(
        `UPDATE location_pages lp
         SET map_lat = $2, map_lng = $3, updated_at = now()
         WHERE lp.district_id = $1 AND lp.region_type = 'district'
           AND (lp.map_lat IS NULL OR lp.map_lng IS NULL OR $4::boolean)`,
        [row.id, hit.lat, hit.lng, force],
      )
    }
    ok++
  }
  console.log(`→ İlçe özeti: ${ok} başarılı, ${fail} başarısız`)
}

async function geocodeDestinations(client, apiKey) {
  const missingFilter = force ? 'TRUE' : '(lp.map_lat IS NULL OR lp.map_lng IS NULL)'
  const { rows } = await client.query(
    `SELECT lp.id::text, lp.slug_path, coalesce(nullif(lp.title, ''), lp.slug_path) AS title,
            d.name AS district_name, r.name AS region_name,
            r.center_lat::float8 AS region_lat, r.center_lng::float8 AS region_lng
     FROM location_pages lp
     LEFT JOIN districts d ON d.id = lp.district_id
     LEFT JOIN regions r ON r.id = coalesce(lp.region_id, d.region_id)
     WHERE lp.region_type = 'destination'
       AND lp.slug_path LIKE 'tr/%'
       AND ${missingFilter}
     ORDER BY lp.slug_path`,
  )
  const todo = limit > 0 ? rows.slice(0, limit) : rows
  console.log(`→ Belde geocode: ${todo.length}/${rows.length} hedef`)
  let ok = 0
  let fail = 0
  for (const row of todo) {
    const queries = destinationQueries(row.title, row.district_name ?? '', row.region_name ?? '')
    const hit = await geocodeWithFallback(
      apiKey,
      queries,
      row.region_lat,
      row.region_lng,
    )
    if (!hit) {
      console.log(`  ✗ ${row.slug_path} — sonuç yok`)
      fail++
      continue
    }
    console.log(`  ✓ ${row.slug_path} → ${hit.lat}, ${hit.lng}`)
    if (!dryRun) {
      await client.query(
        `UPDATE location_pages SET map_lat = $2, map_lng = $3, updated_at = now() WHERE id = $1::uuid`,
        [row.id, hit.lat, hit.lng],
      )
    }
    ok++
  }
  console.log(`→ Belde özeti: ${ok} başarılı, ${fail} başarısız`)
}

async function printStats(client) {
  const d = await client.query(`
    SELECT count(*)::int AS n FROM districts d
    JOIN regions r ON r.id = d.region_id
    JOIN countries c ON c.id = r.country_id
    WHERE c.iso2 = 'TR' AND (d.center_lat IS NULL OR d.center_lng IS NULL)
  `)
  const p = await client.query(`
    SELECT count(*)::int AS n FROM location_pages lp
    WHERE lp.region_type IN ('province', 'district', 'destination')
      AND lp.slug_path LIKE 'tr/%'
      AND (lp.map_lat IS NULL OR lp.map_lng IS NULL)
  `)
  console.log(`→ Eksik: ${d.rows[0].n} ilçe merkezi, ${p.rows[0].n} sayfa pini`)
}

async function main() {
  console.log('→ geocode-location-coords başlıyor…')
  loadBackendEnvFile()
  const client = createPgClient()
  await client.connect()
  try {
    await printStats(client)
    const apiKey = await resolveGoogleKey(client)
    console.log(`→ Google API anahtarı: ${apiKey.slice(0, 8)}…`)
    if (dryRun) console.log('[dry-run] Veritabanı yazılmayacak.')

    const runDistricts = onlyArg === 'all' || onlyArg === 'districts'
    const runDestinations = onlyArg === 'all' || onlyArg === 'destinations'
    const runSync = onlyArg === 'all' || onlyArg === 'sync'

    if (runDistricts) await geocodeDistricts(client, apiKey)
    if (runSync || onlyArg === 'all') await syncHierarchyPages(client)
    if (runDestinations) await geocodeDestinations(client, apiKey)
    if (onlyArg === 'sync') await syncHierarchyPages(client)

    await printStats(client)
  } finally {
    await client.end()
  }
}

main().catch((e) => {
  console.error('[FAIL]', e.message || e)
  process.exit(1)
})
