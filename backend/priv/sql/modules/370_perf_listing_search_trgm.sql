-- MODÜL: public q arama — pg_trgm ile slug/konum ILIKE hızlandırma.
-- Autocomplete ve /ara?q= leading-wildcard aramalarını index'e yaklaştırır.

CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS idx_listings_published_slug_trgm
  ON listings USING gin ((lower(replace(slug, '-', ' '))) gin_trgm_ops)
  WHERE status = 'published';

CREATE INDEX IF NOT EXISTS idx_listings_published_location_trgm
  ON listings USING gin (lower(coalesce(location_name, '')) gin_trgm_ops)
  WHERE status = 'published' AND coalesce(trim(location_name), '') <> '';

ANALYZE listings;
