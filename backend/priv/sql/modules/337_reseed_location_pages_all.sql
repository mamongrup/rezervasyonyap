-- location_pages eksik kayıtları tamamla (idempotent).
-- 264/268/269 migration'ları bölge/ilçe seed'inden önce çalışmış olabilir;
-- bu migration tüm eksik satırları tamamlar.

-- İlçeler (961 adet)
INSERT INTO location_pages (slug_path, district_id, region_type, is_published)
SELECT
  co.iso2 || '/' || r.slug || '/' || d.slug AS slug_path,
  d.id       AS district_id,
  'district' AS region_type,
  false      AS is_published
FROM   districts d
JOIN   regions   r  ON r.id  = d.region_id
JOIN   countries co ON co.id = r.country_id
ON CONFLICT (slug_path) DO NOTHING;

-- İller (province)
INSERT INTO location_pages (slug_path, region_id, region_type, is_published)
SELECT
  co.iso2 || '/' || r.slug AS slug_path,
  r.id                      AS region_id,
  'province'                AS region_type,
  false                     AS is_published
FROM   regions   r
JOIN   countries co ON co.id = r.country_id
ON CONFLICT (slug_path) DO NOTHING;

-- Ülkeler
INSERT INTO location_pages (slug_path, country_id, region_type, is_published)
SELECT
  co.iso2   AS slug_path,
  co.id     AS country_id,
  'country' AS region_type,
  false     AS is_published
FROM countries co
ON CONFLICT (slug_path) DO NOTHING;

-- Mevcut district_id bağlantıları düzelt (slug_path üzerinden eşleştir)
UPDATE location_pages lp
SET district_id = d.id
FROM districts d
JOIN regions r   ON r.id  = d.region_id
JOIN countries co ON co.id = r.country_id
WHERE lp.slug_path = co.iso2 || '/' || r.slug || '/' || d.slug
  AND lp.region_type = 'district'
  AND lp.district_id IS NULL;

-- Mevcut region_id bağlantıları düzelt
UPDATE location_pages lp
SET region_id = r.id
FROM regions r
JOIN countries co ON co.id = r.country_id
WHERE lp.slug_path = co.iso2 || '/' || r.slug
  AND lp.region_type = 'province'
  AND lp.region_id IS NULL;
