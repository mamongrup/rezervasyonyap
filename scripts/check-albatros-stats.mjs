import { createPgClient } from './lib/pg-client.mjs'

const pg = createPgClient()
await pg.connect()

const counts = await pg.query(`
  SELECT
    COUNT(*)::int AS total,
    COUNT(*) FILTER (WHERE la.value_json->>'bath_count' NOT IN ('', '0') AND la.value_json->>'bath_count' IS NOT NULL)::int AS with_bath,
    COUNT(*) FILTER (WHERE EXISTS (SELECT 1 FROM listing_price_rules pr WHERE pr.listing_id = l.id))::int AS with_prices,
    COUNT(*) FILTER (WHERE EXISTS (SELECT 1 FROM listing_images li WHERE li.listing_id = l.id))::int AS with_images
  FROM listings l
  LEFT JOIN listing_attributes la ON la.listing_id = l.id AND la.group_code = 'listing_meta' AND la.key = 'v1'
  WHERE l.external_provider_code = 'albatros'
`)
console.log('Albatros istatistik:', counts.rows[0])

const sample = await pg.query(`
  SELECT l.slug, la.value_json->>'bath_count' AS bath,
         la.value_json->>'room_count' AS cabin,
         la.value_json->>'max_guests' AS pax,
         (SELECT COUNT(*)::int FROM listing_images li WHERE li.listing_id = l.id) AS imgs,
         (SELECT COUNT(*)::int FROM listing_price_rules pr WHERE pr.listing_id = l.id) AS rates
  FROM listings l
  JOIN listing_attributes la ON la.listing_id = l.id AND la.group_code = 'listing_meta' AND la.key = 'v1'
  WHERE l.external_provider_code = 'albatros'
  ORDER BY l.updated_at DESC LIMIT 8
`)
for (const row of sample.rows) {
  console.log(`  ${row.slug} | ${row.pax}p ${row.cabin}k ${row.bath}b | ${row.rates} fiyat | ${row.imgs} görsel`)
}

const bar = await pg.query(`
  SELECT COUNT(*)::int AS n FROM listings l
  JOIN product_categories pc ON pc.id = l.category_id AND pc.code = 'yacht_charter'
  WHERE l.external_provider_code = 'baransen'
    AND NOT EXISTS (SELECT 1 FROM listing_images li WHERE li.listing_id = l.id)
`)
console.log('Baransen görselsiz:', bar.rows[0].n)

await pg.end()
