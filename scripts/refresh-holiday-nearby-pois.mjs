#!/usr/bin/env node
/**
 * Tüm holiday_home ilanlarında nearby_pois_json mesafelerini
 * en yakın villa ilçesi location_page POI'lerinden yeniden hesaplar.
 *
 *   node scripts/refresh-holiday-nearby-pois.mjs
 */
import { createPgClient } from './lib/pg-client.mjs'

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

async function main() {
  const pg = createPgClient()
  await pg.connect()
  try {
    // Antalya Kemer merkezi (Seydikemer ile karışmış eski backfill'i düzelt)
    await pg.query(
      `UPDATE districts d
       SET center_lat = 36.5978, center_lng = 30.5606
       FROM location_pages lp
       WHERE lp.district_id = d.id AND lp.slug_path = 'TR/antalya/kemer'
         AND (d.center_lng IS NULL OR d.center_lng < 30.2)`,
    )
    await pg.query(
      `UPDATE location_pages
       SET map_lat = 36.5978, map_lng = 30.5606, updated_at = now()
       WHERE slug_path = 'TR/antalya/kemer'
         AND (map_lng IS NULL OR map_lng < 30.2)`,
    )

    const { rowCount } = await pg.query(
      `WITH        holiday AS (
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
         SELECT h.id AS listing_id, p.travel, p.service, p.dname
         FROM holiday h
         JOIN LATERAL (
           SELECT * FROM page p
           WHERE h.loc LIKE '%' || p.dname || '%'
              -- encoding: Kaş -> "Ka?"
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

    const { rows: stats } = await pg.query(
      `SELECT
         count(*) FILTER (WHERE nearby_pois_json IS NOT NULL AND jsonb_array_length(nearby_pois_json) > 0) AS with_nearby,
         count(*) FILTER (WHERE map_lat IS NOT NULL AND map_lng IS NOT NULL) AS with_coords,
         count(*) AS total_published
       FROM listings l
       JOIN product_categories c ON c.id = l.category_id
       WHERE c.code = 'holiday_home' AND l.status = 'published'`,
    )

    const { rows: missing } = await pg.query(
      `SELECT coalesce(nullif(trim(location_name),''),'(empty)') AS loc, count(*)::int AS n
       FROM listings l
       JOIN product_categories c ON c.id = l.category_id
       WHERE c.code = 'holiday_home' AND l.status = 'published'
         AND l.map_lat IS NOT NULL
         AND (l.nearby_pois_json IS NULL OR jsonb_array_length(l.nearby_pois_json) = 0)
       GROUP BY 1 ORDER BY 2 DESC LIMIT 15`,
    )

    console.log(`[OK] refreshed=${rowCount ?? 0}`)
    console.log('[STATS]', stats[0])
    console.log('[MISSING]', missing)
  } finally {
    await pg.end()
  }
}

main().catch((err) => {
  console.error('[FAIL]', err.message || err)
  process.exit(1)
})
