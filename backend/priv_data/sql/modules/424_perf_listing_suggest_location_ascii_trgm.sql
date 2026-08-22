-- Autocomplete konum eşleşmesi: translate(lower(location_name), …) ile aynı ifade
-- (370'deki lower(location_name) index'i suggest SQL ile uyuşmuyordu → seq scan).

CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS idx_listings_published_location_ascii_trgm
  ON listings
  USING gin ((translate(lower(coalesce(location_name, '')), 'üğışöç', 'ugisoc')) gin_trgm_ops)
  WHERE status = 'published' AND coalesce(trim(location_name), '') <> '';

ANALYZE listings;
