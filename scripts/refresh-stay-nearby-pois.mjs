#!/usr/bin/env node
/**
 * Otel + villa ilanlarında `nearby_pois_json` mesafelerini doldurur.
 * Kaynak: location_pages.travel_ideas_json + en yakın ilçe service_pois_json.
 *
 *   node scripts/refresh-stay-nearby-pois.mjs --dry-run
 *   node scripts/refresh-stay-nearby-pois.mjs
 *   node scripts/refresh-stay-nearby-pois.mjs --force
 *   node scripts/refresh-stay-nearby-pois.mjs --only hotel
 *   node scripts/refresh-stay-nearby-pois.mjs --only holiday_home --slug queens-park-goynuk
 */
import { createPgClient } from './lib/pg-client.mjs'

const args = new Set(process.argv.slice(2))
const DRY_RUN = args.has('--dry-run')
const FORCE = args.has('--force')
const onlyIdx = process.argv.indexOf('--only')
const ONLY = onlyIdx >= 0 ? String(process.argv[onlyIdx + 1] || '').trim() : 'all'
const slugIdx = process.argv.indexOf('--slug')
const SLUG = slugIdx >= 0 ? String(process.argv[slugIdx + 1] || '').trim() : ''

const categoryFilter =
  ONLY === 'hotel'
    ? `pc.code = 'hotel'`
    : ONLY === 'holiday_home' || ONLY === 'villa'
      ? `pc.code = 'holiday_home'`
      : `pc.code IN ('hotel', 'holiday_home')`

async function main() {
  const pg = createPgClient()
  await pg.connect()
  try {
    const params = []
    let slugFilter = ''
    if (SLUG) {
      params.push(SLUG)
      slugFilter = `AND lower(l.slug) = lower($${params.length})`
    }
    const statusFilter = SLUG
      ? `l.status IN ('published', 'draft')`
      : `l.status = 'published'`
    const missingFilter = FORCE
      ? 'TRUE'
      : `(l.nearby_pois_json IS NULL OR jsonb_array_length(coalesce(l.nearby_pois_json, '[]'::jsonb)) = 0)`

    const sql = `
      WITH listing_coords AS (
        SELECT l.id, l.slug, pc.code AS category_code,
               l.map_lat::float8 AS mlat, l.map_lng::float8 AS mlng
        FROM listings l
        JOIN product_categories pc ON pc.id = l.category_id
        WHERE ${statusFilter}
          AND ${categoryFilter}
          AND l.map_lat IS NOT NULL
          AND l.map_lng IS NOT NULL
          AND ${missingFilter}
          ${slugFilter}
      ),
      travel_pois AS (
        SELECT
          lc.id AS listing_id,
          coalesce(NULLIF(trim(elem->>'title'), ''), NULLIF(trim(elem->>'name'), ''), 'Mekân') AS title,
          coalesce(elem->>'summary', '') AS summary,
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
      ),
      service_pois AS (
        SELECT
          lc.id AS listing_id,
          coalesce(NULLIF(trim(elem->>'label'), ''), NULLIF(trim(elem->>'type'), ''), 'Mekân') AS title,
          trim(regexp_replace(concat_ws(' ',
            NULLIF(trim(elem->>'category'), ''),
            NULLIF(trim(elem->>'type'), ''),
            NULLIF(trim(elem->>'googleType'), '')
          ), '[[:space:]]+', ' ', 'g')) AS summary,
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
        WHERE distance_km <= 80
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
      ${DRY_RUN
        ? `SELECT count(*)::int AS n FROM listing_coords`
        : `UPDATE listings l
           SET nearby_pois_json = a.pois_json, updated_at = now()
           FROM aggregated a
           WHERE l.id = a.listing_id
           RETURNING l.id`}
    `

    if (DRY_RUN) {
      const { rows } = await pg.query(sql, params)
      console.log(`[dry-run] hedef=${rows[0]?.n ?? 0} only=${ONLY}${SLUG ? ` slug=${SLUG}` : ''}`)
      return
    }

    const { rowCount } = await pg.query(sql, params)
    const { rows: stats } = await pg.query(
      `SELECT pc.code,
              count(*)::int AS total,
              count(*) FILTER (
                WHERE l.nearby_pois_json IS NOT NULL
                  AND jsonb_array_length(coalesce(l.nearby_pois_json,'[]'::jsonb)) > 0
              )::int AS with_nearby,
              count(*) FILTER (
                WHERE l.map_lat IS NOT NULL AND l.map_lng IS NOT NULL
                  AND (l.nearby_pois_json IS NULL
                       OR jsonb_array_length(coalesce(l.nearby_pois_json,'[]'::jsonb)) = 0)
              )::int AS coords_no_nearby
       FROM listings l
       JOIN product_categories pc ON pc.id = l.category_id
       WHERE l.status = 'published'
         AND ${categoryFilter}
       GROUP BY 1
       ORDER BY 1`,
    )
    console.log(`[OK] refreshed=${rowCount ?? 0} only=${ONLY}${SLUG ? ` slug=${SLUG}` : ''}`)
    console.log('[STATS]', stats)
  } finally {
    await pg.end()
  }
}

main().catch((err) => {
  console.error('[FAIL]', err?.message || err)
  process.exit(1)
})
