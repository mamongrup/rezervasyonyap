-- MODÜL: kategori-özel genişletmeler (her ürün tipine ayrı tablolar)
CREATE TABLE listing_holiday_home_details (
  listing_id UUID PRIMARY KEY REFERENCES listings (id) ON DELETE CASCADE,
  theme_codes TEXT[] DEFAULT '{}',
  rule_codes TEXT[] DEFAULT '{}',
  ical_managed BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE listing_yacht_details (
  listing_id UUID PRIMARY KEY REFERENCES listings (id) ON DELETE CASCADE,
  length_meters NUMERIC(6, 2),
  cabin_count SMALLINT,
  port_lat NUMERIC(9, 6),
  port_lng NUMERIC(9, 6)
);

CREATE TABLE listing_car_rental_details (
  listing_id UUID PRIMARY KEY REFERENCES listings (id) ON DELETE CASCADE,
  vehicle_class TEXT,
  transmission TEXT,
  fuel_type TEXT,
  yolcu360_product_ref TEXT
);

CREATE TABLE listing_transfer_details (
  listing_id UUID PRIMARY KEY REFERENCES listings (id) ON DELETE CASCADE
);

CREATE TABLE transfer_zones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID NOT NULL REFERENCES listings (id) ON DELETE CASCADE,
  zone_role TEXT NOT NULL CHECK (zone_role IN ('pickup', 'dropoff')),
  location_label TEXT NOT NULL,
  center_lat NUMERIC(9, 6),
  center_lng NUMERIC(9, 6),
  price_per_vehicle_class JSONB NOT NULL DEFAULT '{}'
);

CREATE TABLE listing_hotel_details (
  listing_id UUID PRIMARY KEY REFERENCES listings (id) ON DELETE CASCADE,
  star_rating NUMERIC(2, 1),
  etstur_property_ref TEXT,
  tatilcom_property_ref TEXT
);

CREATE TABLE hotel_rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID NOT NULL REFERENCES listings (id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  capacity SMALLINT,
  board_type TEXT,
  meta_json JSONB NOT NULL DEFAULT '{}'
);

CREATE TABLE listing_flight_details (
  listing_id UUID PRIMARY KEY REFERENCES listings (id) ON DELETE CASCADE,
  turna_route_ref TEXT
);

CREATE TABLE flight_legs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID NOT NULL REFERENCES listings (id) ON DELETE CASCADE,
  mode TEXT NOT NULL CHECK (mode IN ('flight', 'bus')),
  from_stop TEXT NOT NULL,
  to_stop TEXT NOT NULL
);

CREATE TABLE listing_tour_details (
  listing_id UUID PRIMARY KEY REFERENCES listings (id) ON DELETE CASCADE,
  wtatil_package_ref TEXT,
  is_manual BOOLEAN NOT NULL DEFAULT TRUE,
  program_days_json JSONB
);

CREATE TABLE listing_activity_details (
  listing_id UUID PRIMARY KEY REFERENCES listings (id) ON DELETE CASCADE,
  session_based BOOLEAN NOT NULL DEFAULT FALSE,
  full_day BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE listing_ferry_details (
  listing_id UUID PRIMARY KEY REFERENCES listings (id) ON DELETE CASCADE,
  route_code TEXT,
  timetable_url TEXT
);

CREATE TABLE listing_visa_details (
  listing_id UUID PRIMARY KEY REFERENCES listings (id) ON DELETE CASCADE,
  destination_country CHAR(2) NOT NULL
);

CREATE TABLE listing_cinema_details (
  listing_id UUID PRIMARY KEY REFERENCES listings (id) ON DELETE CASCADE,
  cinema_chain TEXT,
  showtimes_json JSONB
);

CREATE TABLE listing_beach_lounger_details (
  listing_id UUID PRIMARY KEY REFERENCES listings (id) ON DELETE CASCADE,
  beach_name TEXT NOT NULL,
  grid_json JSONB
);

CREATE TABLE related_listings_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID NOT NULL REFERENCES listings (id) ON DELETE CASCADE,
  relation_type TEXT NOT NULL CHECK (relation_type IN ('related', 'nearby', 'same_category')),
  target_listing_id UUID REFERENCES listings (id) ON DELETE CASCADE,
  auto_radius_meters INT,
  UNIQUE (listing_id, relation_type, target_listing_id)
);

-- Gemi turları (kategori: cruise)
CREATE TABLE listing_cruise_details (
  listing_id UUID PRIMARY KEY REFERENCES listings (id) ON DELETE CASCADE,
  cruise_line TEXT,
  ship_name TEXT,
  route_summary TEXT,
  cabin_category TEXT,
  external_cruise_ref TEXT,
  meta_json JSONB NOT NULL DEFAULT '{}'
);

-- Hac / Umre paketleri (kategori: hajj)
CREATE TABLE listing_hajj_details (
  listing_id UUID PRIMARY KEY REFERENCES listings (id) ON DELETE CASCADE,
  package_type TEXT,
  departure_city TEXT,
  duration_days SMALLINT,
  meta_json JSONB NOT NULL DEFAULT '{}'
);

-- Etkinlik / biletli etkinlik (kategori: event — aktiviteden ayrı yaprak)
CREATE TABLE listing_event_details (
  listing_id UUID PRIMARY KEY REFERENCES listings (id) ON DELETE CASCADE,
  venue_name TEXT,
  venue_address TEXT,
  starts_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ,
  ticket_tiers_json JSONB,
  meta_json JSONB NOT NULL DEFAULT '{}'
);

-- Restoran masa rezervasyonu (harici POS / harita uygulaması ref’leri)
CREATE TABLE listing_restaurant_table_details (
  listing_id UUID PRIMARY KEY REFERENCES listings (id) ON DELETE CASCADE,
  restaurant_name TEXT,
  external_pos_venue_ref TEXT,
  party_size_min SMALLINT,
  party_size_max SMALLINT,
  slot_duration_minutes SMALLINT,
  meta_json JSONB NOT NULL DEFAULT '{}'
);
