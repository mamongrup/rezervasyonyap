/**
 * Villa / yat ilanlarında harita koordinatı özeti.
 *   node scripts/audit-stay-map-coords.mjs
 */
import { createPgClient } from './lib/pg-client.mjs'

const client = createPgClient()
await client.connect()
try {
  const { rows } = await client.query(`
    SELECT
      pc.code,
      count(*)::int AS total,
      count(*) FILTER (
        WHERE l.map_lat IS NOT NULL AND l.map_lng IS NOT NULL
      )::int AS with_listing_map,
      count(*) FILTER (
        WHERE y.port_lat IS NOT NULL AND y.port_lng IS NOT NULL
      )::int AS with_port_coords,
      count(*) FILTER (
        WHERE lm.value_json->>'lat' IS NOT NULL AND lm.value_json->>'lng' IS NOT NULL
      )::int AS with_meta_latlng
    FROM listings l
    JOIN product_categories pc ON pc.id = l.category_id
    LEFT JOIN listing_yacht_details y ON y.listing_id = l.id
    LEFT JOIN listing_attributes lm ON lm.listing_id = l.id
      AND lm.group_code = 'listing_meta' AND lm.key = 'v1'
    WHERE l.status = 'published'
      AND pc.code IN ('holiday_home', 'yacht_charter')
    GROUP BY pc.code
    ORDER BY pc.code
  `)
  console.table(rows)

  const sample = await client.query(`
    SELECT l.slug, l.location_name,
           lm.value_json->>'district_label' AS district,
           lm.value_json->>'base_port' AS base_port
    FROM listings l
    JOIN product_categories pc ON pc.id = l.category_id
    LEFT JOIN listing_attributes lm ON lm.listing_id = l.id
      AND lm.group_code = 'listing_meta' AND lm.key = 'v1'
    WHERE pc.code = 'yacht_charter' AND l.status = 'published'
      AND (l.map_lat IS NULL OR l.map_lng IS NULL)
    LIMIT 5
  `)
  console.log('Örnek koordinatsız yat:', sample.rows)
} finally {
  await client.end()
}
