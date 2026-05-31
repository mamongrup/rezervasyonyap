#!/usr/bin/env node
/**
 * Eksik lokasyon koordinatlarını Google Geocoding ile doldurur.
 * npm/pg modülü gerekmez — yalnızca psql CLI.
 *
 *   set -a && source /etc/rezervasyonyap/backend.env && set +a
 *   node scripts/geocode-location-coords.mjs --dry-run --limit 5
 *   node scripts/geocode-location-coords.mjs --only districts
 *   node scripts/geocode-location-coords.mjs
 */
import {
  execSql,
  queryRows,
  queryScalar,
  sqlLiteral,
} from './lib/psql-exec.mjs'
import { loadBackendEnvFile } from './lib/load-backend-env.mjs'

const SCRIPT_VERSION = 'psql-v1'

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

function resolveGoogleKey() {
  const fromEnv = (process.env.GOOGLE_MAPS_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '').trim()
  if (fromEnv) return fromEnv
  const rows = queryRows(
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

function updateRowCount(out) {
  const m = String(out || '').match(/UPDATE\s+(\d+)/i)
  return m ? Number(m[1]) : 0
}

function syncHierarchyPages() {
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
    const n = updateRowCount(execSql(step.sql))
    console.log(`✓ sync ${step.label}: ${n} satır`)
  }
}

async function geocodeDistricts(apiKey) {
  const missingClause = force
    ? 'TRUE'
    : '(d.center_lat IS NULL OR d.center_lng IS NULL)'
  const rows = queryRows(
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
      execSql(
        `UPDATE districts SET center_lat = ${hit.lat}, center_lng = ${hit.lng} WHERE id = ${Number(row.id)}`,
      )
      execSql(
        `UPDATE location_pages lp
         SET map_lat = ${hit.lat}, map_lng = ${hit.lng}, updated_at = now()
         WHERE lp.district_id = ${Number(row.id)} AND lp.region_type = 'district'
           AND (lp.map_lat IS NULL OR lp.map_lng IS NULL OR ${force ? 'TRUE' : 'FALSE'})`,
      )
    }
    ok++
  }
  console.log(`→ İlçe özeti: ${ok} başarılı, ${fail} başarısız`)
}

async function geocodeDestinations(apiKey) {
  const missingFilter = force ? 'TRUE' : '(lp.map_lat IS NULL OR lp.map_lng IS NULL)'
  const rows = queryRows(
    `SELECT lp.id::text AS id, lp.slug_path, coalesce(nullif(lp.title, ''), lp.slug_path) AS title,
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
      execSql(
        `UPDATE location_pages SET map_lat = ${hit.lat}, map_lng = ${hit.lng}, updated_at = now()
         WHERE id = ${sqlLiteral(row.id)}::uuid`,
      )
    }
    ok++
  }
  console.log(`→ Belde özeti: ${ok} başarılı, ${fail} başarısız`)
}

function printStats() {
  const d = queryScalar(`
    SELECT count(*)::text FROM districts d
    JOIN regions r ON r.id = d.region_id
    JOIN countries c ON c.id = r.country_id
    WHERE c.iso2 = 'TR' AND (d.center_lat IS NULL OR d.center_lng IS NULL)
  `)
  const p = queryScalar(`
    SELECT count(*)::text FROM location_pages lp
    WHERE lp.region_type IN ('province', 'district', 'destination')
      AND lp.slug_path LIKE 'tr/%'
      AND (lp.map_lat IS NULL OR lp.map_lng IS NULL)
  `)
  console.log(`→ Eksik: ${d} ilçe merkezi, ${p} sayfa pini`)
}

async function main() {
  console.log(`→ geocode-location-coords (${SCRIPT_VERSION}) başlıyor…`)
  loadBackendEnvFile()
  printStats()
  const apiKey = resolveGoogleKey()
  console.log(`→ Google API anahtarı: ${apiKey.slice(0, 8)}…`)
  if (dryRun) console.log('[dry-run] Veritabanı yazılmayacak.')

  const runDistricts = onlyArg === 'all' || onlyArg === 'districts'
  const runDestinations = onlyArg === 'all' || onlyArg === 'destinations'
  const runSync = onlyArg === 'all' || onlyArg === 'sync'

  if (runDistricts) await geocodeDistricts(apiKey)
  if (runSync || onlyArg === 'all') syncHierarchyPages()
  if (runDestinations) await geocodeDestinations(apiKey)
  if (onlyArg === 'sync') syncHierarchyPages()

  printStats()
}

main().catch((e) => {
  console.error('[FAIL]', e.message || e)
  process.exit(1)
})
