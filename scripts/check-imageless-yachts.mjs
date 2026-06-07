import { createPgClient } from './lib/pg-client.mjs'

const pg = createPgClient()
await pg.connect()

const byProvider = await pg.query(`
  SELECT COALESCE(l.external_provider_code, 'yok') AS provider, COUNT(*)::int AS n
  FROM listings l
  JOIN product_categories pc ON pc.id = l.category_id AND pc.code = 'yacht_charter'
  WHERE NOT EXISTS (SELECT 1 FROM listing_images li WHERE li.listing_id = l.id)
    AND COALESCE(l.featured_image_url, l.thumbnail_url, '') = ''
  GROUP BY l.external_provider_code
  ORDER BY n DESC
`)
console.log('Görselsiz yat — sağlayıcı:')
for (const r of byProvider.rows) console.log(`  ${r.provider}: ${r.n}`)

const albatrosMergedIntoBaransen = await pg.query(`
  SELECT COUNT(*)::int AS n
  FROM listings l
  JOIN product_categories pc ON pc.id = l.category_id AND pc.code = 'yacht_charter'
  JOIN listing_attributes la ON la.listing_id = l.id AND la.group_code = 'listing_meta' AND la.key = 'v1'
  WHERE l.external_provider_code = 'baransen'
    AND la.value_json->'enrichment_sources'->'albatros' IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM listing_images li WHERE li.listing_id = l.id)
`)
console.log('Baransen slug + Albatros meta, görselsiz:', albatrosMergedIntoBaransen.rows[0].n)

await pg.end()
