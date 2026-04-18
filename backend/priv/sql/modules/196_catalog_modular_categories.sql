-- MODÜL: kategori modülleri (aç/kapa), manuel+API kaynak, sıralama, eksik yapraklar ve vertical tabloları
-- Mevcut kurulumlarda 180 sonrası çalıştırın. Yeni vertical tabloları IF NOT EXISTS (eski DB uyumu).

ALTER TABLE product_categories
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS allows_manual_source BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS allows_api_source BOOLEAN NOT NULL DEFAULT TRUE;

ALTER TABLE listings
  ADD COLUMN IF NOT EXISTS listing_source TEXT,
  ADD COLUMN IF NOT EXISTS external_provider_code TEXT,
  ADD COLUMN IF NOT EXISTS external_listing_ref TEXT,
  ADD COLUMN IF NOT EXISTS last_synced_at TIMESTAMPTZ;

UPDATE listings SET listing_source = 'manual' WHERE listing_source IS NULL;
ALTER TABLE listings ALTER COLUMN listing_source SET DEFAULT 'manual';
ALTER TABLE listings ALTER COLUMN listing_source SET NOT NULL;

ALTER TABLE listings DROP CONSTRAINT IF EXISTS listings_listing_source_check;
ALTER TABLE listings ADD CONSTRAINT listings_listing_source_check
  CHECK (listing_source IN ('manual', 'api', 'hybrid'));

CREATE UNIQUE INDEX IF NOT EXISTS idx_listings_org_provider_ext_ref
  ON listings (organization_id, external_provider_code, external_listing_ref)
  WHERE external_listing_ref IS NOT NULL AND external_provider_code IS NOT NULL;

-- Eski kurulumlarda 196 öncesi bu tablolar yoksa oluştur (180’e sonradan eklendi)
CREATE TABLE IF NOT EXISTS listing_cruise_details (
  listing_id UUID PRIMARY KEY REFERENCES listings (id) ON DELETE CASCADE,
  cruise_line TEXT,
  ship_name TEXT,
  route_summary TEXT,
  cabin_category TEXT,
  external_cruise_ref TEXT,
  meta_json JSONB NOT NULL DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS listing_hajj_details (
  listing_id UUID PRIMARY KEY REFERENCES listings (id) ON DELETE CASCADE,
  package_type TEXT,
  departure_city TEXT,
  duration_days SMALLINT,
  meta_json JSONB NOT NULL DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS listing_event_details (
  listing_id UUID PRIMARY KEY REFERENCES listings (id) ON DELETE CASCADE,
  venue_name TEXT,
  venue_address TEXT,
  starts_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ,
  ticket_tiers_json JSONB,
  meta_json JSONB NOT NULL DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS listing_restaurant_table_details (
  listing_id UUID PRIMARY KEY REFERENCES listings (id) ON DELETE CASCADE,
  restaurant_name TEXT,
  external_pos_venue_ref TEXT,
  party_size_min SMALLINT,
  party_size_max SMALLINT,
  slot_duration_minutes SMALLINT,
  meta_json JSONB NOT NULL DEFAULT '{}'
);

-- Sıra: Otel, Villa, Yat, Tur, Uçak, Aktivite, Transfer, Feribot, Araç, Gemi, Hac, Vize, Etkinlik, Plaj, Sinema, Restoran
UPDATE product_categories SET sort_order = 10 WHERE code = 'hotel';
UPDATE product_categories SET sort_order = 20 WHERE code = 'holiday_home';
UPDATE product_categories SET sort_order = 30 WHERE code = 'yacht_charter';
UPDATE product_categories SET sort_order = 40 WHERE code = 'tour';
UPDATE product_categories SET sort_order = 50 WHERE code = 'flight';
UPDATE product_categories SET sort_order = 60 WHERE code = 'activity';
UPDATE product_categories SET sort_order = 70 WHERE code = 'transfer';
UPDATE product_categories SET sort_order = 80 WHERE code = 'ferry';
UPDATE product_categories SET sort_order = 90 WHERE code = 'car_rental';
UPDATE product_categories SET sort_order = 100 WHERE code = 'cruise';
UPDATE product_categories SET sort_order = 120 WHERE code = 'visa';
UPDATE product_categories SET sort_order = 140 WHERE code = 'beach_lounger';
UPDATE product_categories SET sort_order = 150 WHERE code = 'cinema_ticket';

INSERT INTO product_categories (code, name_key, parent_id, sort_order, is_active, allows_manual_source, allows_api_source)
VALUES
  ('hajj', 'cat.hajj', NULL, 110, TRUE, TRUE, TRUE),
  ('event', 'cat.event', NULL, 145, TRUE, TRUE, TRUE),
  ('restaurant_table', 'cat.restaurant_table', NULL, 160, TRUE, TRUE, TRUE)
ON CONFLICT (code) DO UPDATE SET
  name_key = EXCLUDED.name_key,
  sort_order = EXCLUDED.sort_order,
  is_active = EXCLUDED.is_active,
  allows_manual_source = EXCLUDED.allows_manual_source,
  allows_api_source = EXCLUDED.allows_api_source;
