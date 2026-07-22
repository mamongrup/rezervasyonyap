-- MODÜL: autocomplete başlık eşleşmesi için listing_translations trgm.
-- collections_http suggest yolu: translate(lower(title), …) ILIKE '%tok%'

CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS idx_listing_translations_title_trgm
  ON listing_translations
  USING gin ((translate(lower(title), 'üğışöç', 'ugisoc')) gin_trgm_ops);

ANALYZE listing_translations;
