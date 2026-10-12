// Imported text must pass editorial, all active languages and media checks.
export async function queueProviderEditorial(pg, listingId) {
  await pg.query(`INSERT INTO listing_attributes (listing_id, group_code, key, value_json)
    VALUES ($1::uuid, 'publication_quality', 'requested', '{"requested":true,"source":"provider_import"}'::jsonb)
    ON CONFLICT (listing_id, group_code, key) DO NOTHING`, [listingId])
  await pg.query(`INSERT INTO ai_listing_content_batches
    (listing_id, category_code, phase, status, overwrite)
    SELECT l.id, pc.code, 'tr_description', 'pending', false
    FROM listings l JOIN product_categories pc ON pc.id = l.category_id
    WHERE l.id = $1::uuid AND NOT EXISTS (
      SELECT 1 FROM ai_listing_content_batches b
      WHERE b.listing_id = l.id AND b.status IN ('pending','running'))`, [listingId])
}
