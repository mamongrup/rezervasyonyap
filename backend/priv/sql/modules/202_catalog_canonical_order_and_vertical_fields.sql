-- MODÜL: 15 ana kategori sırası (Otel→…→Restoran), ortak ilan alanları, dikey stub sütunları
-- Özellik matrisinin büyük kısmı listing_attributes (group_code/key/value_json) + mevcut tablolar;
-- burada sık kullanılan ve sorgulanabilir alanlar tutulur.

-- --- Kategori sırası (sort_order 10..150) — panel / hero ile aynı ---
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
UPDATE product_categories SET sort_order = 110 WHERE code = 'hajj';
UPDATE product_categories SET sort_order = 120 WHERE code = 'visa';
UPDATE product_categories SET sort_order = 130 WHERE code = 'beach_lounger';
UPDATE product_categories SET sort_order = 140 WHERE code = 'cinema_ticket';
UPDATE product_categories SET sort_order = 150 WHERE code = 'restaurant_table';

-- Etkinlik (konser, festival, tiyatro): 203 modülünde sıra ve aktiflik ayarlanır.

-- --- Tüm ilanlar: iptal politikası, bakanlık ref, B-transfer, min konaklamadan kısa boşluk satışı ---
ALTER TABLE listings
  ADD COLUMN IF NOT EXISTS cancellation_policy_text TEXT,
  ADD COLUMN IF NOT EXISTS ministry_license_ref TEXT,
  ADD COLUMN IF NOT EXISTS b_transfer_info TEXT,
  ADD COLUMN IF NOT EXISTS allow_sub_min_stay_gap_booking BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS extensions_json JSONB NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN listings.cancellation_policy_text IS 'Free-text or templated cancellation policy for this listing.';
COMMENT ON COLUMN listings.ministry_license_ref IS 'Ministry / tourism registry approval number (e.g. villa license).';
COMMENT ON COLUMN listings.b_transfer_info IS 'B-transfer or handover notes for supplier/operations.';
COMMENT ON COLUMN listings.allow_sub_min_stay_gap_booking IS 'If true, gaps shorter than min_stay_nights may be sold.';
COMMENT ON COLUMN listings.extensions_json IS 'Structured overflow; prefer listing_attributes for discoverable facets.';

-- --- İlan sahibi iletişim: WhatsApp (talep formu kanalı) ---
ALTER TABLE listing_owner_contacts
  ADD COLUMN IF NOT EXISTS contact_whatsapp TEXT;

-- --- Araç kiralama: kara + tekne + uçak + helikopter ---
ALTER TABLE listing_car_rental_details
  ADD COLUMN IF NOT EXISTS vehicle_kind TEXT NOT NULL DEFAULT 'car';

ALTER TABLE listing_car_rental_details DROP CONSTRAINT IF EXISTS listing_car_rental_details_vehicle_kind_check;
ALTER TABLE listing_car_rental_details ADD CONSTRAINT listing_car_rental_details_vehicle_kind_check
  CHECK (vehicle_kind IN ('car', 'boat', 'plane', 'helicopter'));

-- --- Aktivite: program / adımlar / dönemsel fiyat taşması ---
ALTER TABLE listing_activity_details
  ADD COLUMN IF NOT EXISTS meta_json JSONB NOT NULL DEFAULT '{}'::jsonb;

-- --- Tur: günlük / paket / gemi tarzı ayrımı ---
ALTER TABLE listing_tour_details
  ADD COLUMN IF NOT EXISTS tour_format TEXT;

ALTER TABLE listing_tour_details DROP CONSTRAINT IF EXISTS listing_tour_details_tour_format_check;
ALTER TABLE listing_tour_details ADD CONSTRAINT listing_tour_details_tour_format_check
  CHECK (tour_format IS NULL OR tour_format IN ('daily', 'package', 'ocean_cruise'));

-- --- Uçak/otobüs: harici sağlayıcı referansları (Biletall iframe, Paximum, Tatilbudur) ---
ALTER TABLE listing_flight_details
  ADD COLUMN IF NOT EXISTS biletall_iframe_url TEXT,
  ADD COLUMN IF NOT EXISTS paximum_ref TEXT,
  ADD COLUMN IF NOT EXISTS tatilbudur_ref TEXT;

-- --- Otel: Paximum / Tatilbudur property ref (Etstur / Tatil.com mevcut) ---
ALTER TABLE listing_hotel_details
  ADD COLUMN IF NOT EXISTS paximum_property_ref TEXT,
  ADD COLUMN IF NOT EXISTS tatilbudur_property_ref TEXT;

-- --- Transfer: Raintransfer / Transfer24 entegrasyon ref ---
ALTER TABLE listing_transfer_details
  ADD COLUMN IF NOT EXISTS raintransfer_ref TEXT,
  ADD COLUMN IF NOT EXISTS transfer24_ref TEXT;
