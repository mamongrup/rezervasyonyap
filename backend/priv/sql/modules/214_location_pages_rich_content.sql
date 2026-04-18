-- location_pages tablosuna zengin içerik alanları eklendi
ALTER TABLE location_pages ADD COLUMN IF NOT EXISTS title TEXT;
ALTER TABLE location_pages ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE location_pages ADD COLUMN IF NOT EXISTS meta_title TEXT;
ALTER TABLE location_pages ADD COLUMN IF NOT EXISTS meta_description TEXT;
ALTER TABLE location_pages ADD COLUMN IF NOT EXISTS gallery_json JSONB NOT NULL DEFAULT '[]';
ALTER TABLE location_pages ADD COLUMN IF NOT EXISTS map_lat NUMERIC(9,6);
ALTER TABLE location_pages ADD COLUMN IF NOT EXISTS map_lng NUMERIC(9,6);
ALTER TABLE location_pages ADD COLUMN IF NOT EXISTS map_zoom SMALLINT NOT NULL DEFAULT 12;
ALTER TABLE location_pages ADD COLUMN IF NOT EXISTS is_published BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE location_pages ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();
