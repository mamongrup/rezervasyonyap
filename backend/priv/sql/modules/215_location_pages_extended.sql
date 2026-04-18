-- location_pages: region_type, görsel alanları, gezi fikirleri, çoklu dil, manuel mekanlar
ALTER TABLE location_pages ADD COLUMN IF NOT EXISTS region_type TEXT NOT NULL DEFAULT 'district' CHECK (region_type IN ('country','province','district'));
ALTER TABLE location_pages ADD COLUMN IF NOT EXISTS featured_image_url TEXT;
ALTER TABLE location_pages ADD COLUMN IF NOT EXISTS hero_image_url TEXT;
ALTER TABLE location_pages ADD COLUMN IF NOT EXISTS travel_ideas_image_url TEXT;
ALTER TABLE location_pages ADD COLUMN IF NOT EXISTS travel_ideas_json JSONB NOT NULL DEFAULT '[]';
ALTER TABLE location_pages ADD COLUMN IF NOT EXISTS translations_json JSONB NOT NULL DEFAULT '{}';
ALTER TABLE location_pages ADD COLUMN IF NOT EXISTS poi_manual_json JSONB NOT NULL DEFAULT '[]';
