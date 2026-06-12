-- MODÜL: otel vitrininde galeri altı kampanya kartları (Setur tarzı)
CREATE TABLE IF NOT EXISTS listing_hotel_promotions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID NOT NULL REFERENCES listings (id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  title_en TEXT NOT NULL DEFAULT '',
  image_url TEXT NOT NULL DEFAULT '',
  link_url TEXT NOT NULL DEFAULT '',
  sort_order INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_listing_hotel_promotions_listing
  ON listing_hotel_promotions (listing_id, sort_order, created_at);
