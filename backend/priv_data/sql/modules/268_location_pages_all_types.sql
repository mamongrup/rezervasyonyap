-- location_pages: tüm lokasyon tipleri (ülke, il, ilçe, belde)
-- district_id zaten nullable; region_id ve country_id sütunları ekleniyor.

ALTER TABLE location_pages
  ADD COLUMN IF NOT EXISTS region_id  INT REFERENCES regions   (id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS country_id INT REFERENCES countries (id) ON DELETE SET NULL;

-- region_type için check constraint kaldır / yeniden tanımla (varsa)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'location_pages' AND column_name = 'region_type'
  ) THEN
    ALTER TABLE location_pages ADD COLUMN region_type TEXT NOT NULL DEFAULT 'district';
  END IF;
END $$;

-- 81 il için location_pages kaydı (region_type = 'province')
INSERT INTO location_pages (slug_path, region_id, region_type, is_published)
SELECT
  co.iso2 || '/' || r.slug  AS slug_path,
  r.id                       AS region_id,
  'province'                 AS region_type,
  false                      AS is_published
FROM   regions   r
JOIN   countries co ON co.id = r.country_id
ON CONFLICT (slug_path) DO NOTHING;

-- Ülkeler için location_pages kaydı
INSERT INTO location_pages (slug_path, country_id, region_type, is_published)
SELECT
  co.iso2    AS slug_path,
  co.id      AS country_id,
  'country'  AS region_type,
  false      AS is_published
FROM countries co
ON CONFLICT (slug_path) DO NOTHING;
