-- MODÜL: bölge hiyerarşisi + Google Maps POI mesafeleri + iCal
CREATE TABLE IF NOT EXISTS countries (
  id SMALLSERIAL PRIMARY KEY,
  iso2 CHAR(2) NOT NULL UNIQUE,
  name TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS regions (
  id SERIAL PRIMARY KEY,
  country_id SMALLINT NOT NULL REFERENCES countries (id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  center_lat NUMERIC(9, 6),
  center_lng NUMERIC(9, 6),
  UNIQUE (country_id, slug)
);

CREATE TABLE IF NOT EXISTS districts (
  id SERIAL PRIMARY KEY,
  region_id INT NOT NULL REFERENCES regions (id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  center_lat NUMERIC(9, 6),
  center_lng NUMERIC(9, 6),
  UNIQUE (region_id, slug)
);

CREATE TABLE IF NOT EXISTS location_pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  district_id INT REFERENCES districts (id) ON DELETE SET NULL,
  slug_path TEXT NOT NULL UNIQUE,
  hero_image_key TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS location_poi_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_page_id UUID NOT NULL REFERENCES location_pages (id) ON DELETE CASCADE,
  poi_types TEXT[] NOT NULL DEFAULT '{}',
  max_per_type INT NOT NULL DEFAULT 5,
  radius_meters INT NOT NULL DEFAULT 2000
);

CREATE TABLE IF NOT EXISTS location_poi_cache (
  id BIGSERIAL PRIMARY KEY,
  location_page_id UUID NOT NULL REFERENCES location_pages (id) ON DELETE CASCADE,
  place_id TEXT,
  name TEXT NOT NULL,
  poi_type TEXT NOT NULL,
  distance_meters INT,
  lat NUMERIC(9, 6),
  lng NUMERIC(9, 6),
  raw_json JSONB,
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ical_feeds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID NOT NULL REFERENCES listings (id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  day_offset_plus INT NOT NULL DEFAULT 0,
  day_offset_minus INT NOT NULL DEFAULT 0,
  last_sync_at TIMESTAMPTZ,
  last_hash TEXT
);
