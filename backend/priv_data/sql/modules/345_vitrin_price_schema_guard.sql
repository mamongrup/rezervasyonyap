-- MODÜL: vitrin_price şema koruması — migration 341/342 atlanmış ortamlarda katalog 500 olmasın.
-- Sütun + index idempotent; refresh fonksiyonu 342 ile gelir (yoksa apply-sql ile 341→342 çalıştırın).

ALTER TABLE listings ADD COLUMN IF NOT EXISTS vitrin_price numeric;

DROP INDEX IF EXISTS idx_listings_cat_status_vitrin;
CREATE INDEX idx_listings_cat_status_vitrin
  ON listings (category_id, status, vitrin_price);

CREATE INDEX IF NOT EXISTS idx_listings_cat_status_created
  ON listings (category_id, status, created_at DESC);

DROP INDEX IF EXISTS idx_listing_price_rules_listing;
CREATE INDEX IF NOT EXISTS idx_listing_price_rules_listing
  ON listing_price_rules (listing_id);

ANALYZE listings;
ANALYZE listing_price_rules;
