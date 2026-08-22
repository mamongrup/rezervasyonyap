-- Tatil evi yatak odaları (yapılandırılmış kartlar — vitrin + panel)
CREATE TABLE IF NOT EXISTS listing_bedrooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID NOT NULL REFERENCES listings (id) ON DELETE CASCADE,
  sort_order SMALLINT NOT NULL DEFAULT 0,
  name TEXT NOT NULL DEFAULT '',
  floor_label TEXT,
  beds_description TEXT NOT NULL DEFAULT '',
  ensuite BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_listing_bedrooms_listing_sort
  ON listing_bedrooms (listing_id, sort_order);
