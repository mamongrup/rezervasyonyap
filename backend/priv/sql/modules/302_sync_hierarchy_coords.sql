-- Hiyerarşi tablolarındaki merkez koordinatları → location_pages.map_lat/map_lng
-- İl ve ilçe sayfaları için; beldeler (destination) ayrı geocode/SQL ile doldurulur.

-- 1) İl (province) sayfaları ← regions.center_*
UPDATE location_pages lp
SET map_lat = r.center_lat,
    map_lng = r.center_lng,
    updated_at = now()
FROM regions r
WHERE lp.region_type = 'province'
  AND lp.region_id = r.id
  AND r.center_lat IS NOT NULL
  AND r.center_lng IS NOT NULL
  AND (
    lp.map_lat IS NULL
    OR lp.map_lng IS NULL
  );

-- 2) İlçe (district) sayfaları ← districts.center_*
UPDATE location_pages lp
SET map_lat = d.center_lat,
    map_lng = d.center_lng,
    updated_at = now()
FROM districts d
WHERE lp.region_type = 'district'
  AND lp.district_id = d.id
  AND d.center_lat IS NOT NULL
  AND d.center_lng IS NOT NULL
  AND (
    lp.map_lat IS NULL
    OR lp.map_lng IS NULL
  );

-- 3) Belde/destination: parent ilçe merkezi yalnızca geçici yedek (gerçek pin yoksa)
--    Mesafe hesabı için beldeye özel koordinat tercih edilir; ilçe merkezi son çare.
UPDATE location_pages lp
SET map_lat = d.center_lat,
    map_lng = d.center_lng,
    updated_at = now()
FROM districts d
WHERE lp.region_type = 'destination'
  AND lp.district_id = d.id
  AND d.center_lat IS NOT NULL
  AND d.center_lng IS NOT NULL
  AND lp.map_lat IS NULL
  AND lp.map_lng IS NULL;

-- 4) Ülke sayfası (Türkiye) — yaklaşık coğrafi merkez
UPDATE location_pages lp
SET map_lat = 39.000000,
    map_lng = 35.000000,
    updated_at = now()
FROM countries c
WHERE lp.region_type = 'country'
  AND lp.country_id = c.id
  AND c.iso2 = 'TR'
  AND (lp.map_lat IS NULL OR lp.map_lng IS NULL);
