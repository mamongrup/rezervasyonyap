-- Google Merchant: ilan başına tek kayıt + upsert desteği
DELETE FROM google_merchant_products g
WHERE g.id NOT IN (
  SELECT DISTINCT ON (listing_id) id
  FROM google_merchant_products
  ORDER BY listing_id, coalesce(last_push_at, 'epoch'::timestamptz) DESC, id
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_google_merchant_products_listing
  ON google_merchant_products (listing_id);

COMMENT ON INDEX uq_google_merchant_products_listing IS
  'Merchant API push — ilan başına tek google_merchant_products satırı';
