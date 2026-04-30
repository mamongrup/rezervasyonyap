-- 961 ilçe için location_pages kaydı (cover_image için)
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
