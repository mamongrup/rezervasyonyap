import { createPgClient } from './lib/pg-client.mjs'

const pg = createPgClient()
await pg.connect()

const totals = await pg.query(`
  SELECT
    l.external_provider_code AS provider,
    COUNT(*)::int AS total,
    COUNT(*) FILTER (WHERE EXISTS (
      SELECT 1 FROM listing_images li WHERE li.listing_id = l.id
    ))::int AS with_db_images,
    COUNT(*) FILTER (WHERE COALESCE(l.featured_image_url, l.thumbnail_url, '') <> '')::int AS with_cover_url
  FROM listings l
  JOIN product_categories pc ON pc.id = l.category_id AND pc.code = 'yacht_charter'
  GROUP BY l.external_provider_code
  ORDER BY total DESC
`)

console.log('Yat ilanları — sağlayıcı bazında:')
for (const r of totals.rows) {
  console.log(`  ${r.provider || '(yok)'}: ${r.total} ilan, ${r.with_db_images} galeri, ${r.with_cover_url} kapak URL`)
}

const sample = await pg.query(`
  SELECT l.slug, l.external_provider_code, l.featured_image_url,
         (SELECT COUNT(*)::int FROM listing_images li WHERE li.listing_id = l.id) AS imgs,
         (SELECT storage_key FROM listing_images li WHERE li.listing_id = l.id ORDER BY sort_order LIMIT 1) AS first_key
  FROM listings l
  JOIN product_categories pc ON pc.id = l.category_id AND pc.code = 'yacht_charter'
  WHERE EXISTS (SELECT 1 FROM listing_images li WHERE li.listing_id = l.id)
  ORDER BY l.updated_at DESC
  LIMIT 5
`)
console.log('\nGörselli örnekler:')
for (const r of sample.rows) {
  console.log(`  ${r.slug} [${r.external_provider_code}] imgs=${r.imgs} cover=${r.featured_image_url || '-'} key=${r.first_key || '-'}`)
}

const noImg = await pg.query(`
  SELECT COUNT(*)::int AS n FROM listings l
  JOIN product_categories pc ON pc.id = l.category_id AND pc.code = 'yacht_charter'
  WHERE NOT EXISTS (SELECT 1 FROM listing_images li WHERE li.listing_id = l.id)
    AND COALESCE(l.featured_image_url, l.thumbnail_url, '') = ''
`)
console.log('\nTamamen görselsiz yat:', noImg.rows[0].n)

await pg.end()
