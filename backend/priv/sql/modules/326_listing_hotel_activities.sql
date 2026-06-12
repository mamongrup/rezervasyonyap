-- MODÜL: otel vitrininde kampanya altı etkinlik kartları (tarih + kişi başı ücret)
CREATE TABLE IF NOT EXISTS listing_hotel_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID NOT NULL REFERENCES listings (id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  title_en TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  description_en TEXT NOT NULL DEFAULT '',
  image_url TEXT NOT NULL DEFAULT '',
  activity_date DATE NOT NULL,
  price_per_person NUMERIC(12, 2) NOT NULL DEFAULT 0,
  currency_code TEXT NOT NULL DEFAULT 'TRY',
  sort_order INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_listing_hotel_activities_listing
  ON listing_hotel_activities (listing_id, activity_date, sort_order, created_at);
