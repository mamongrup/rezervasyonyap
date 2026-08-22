-- İlçe koordinatları + ilan yakın mekan mesafe cache'i

-- 1. İlçelere koordinat sütunları ekle
ALTER TABLE districts
  ADD COLUMN IF NOT EXISTS center_lat  NUMERIC(9, 6),
  ADD COLUMN IF NOT EXISTS center_lng  NUMERIC(9, 6);

-- 2. İlanlara yakın mekan JSON'u ekle
--    Format: [{id, title, summary, lat, lng, place_id, link, image,
--              distance_km_from_district, distance_km_from_listing}]
ALTER TABLE listings
  ADD COLUMN IF NOT EXISTS nearby_pois_json JSONB NOT NULL DEFAULT '[]';

-- 3. TravelIdea'nın lat/lng/place_id içereceğini belgelemek için yorum
COMMENT ON COLUMN listings.nearby_pois_json IS
  'Google Places POI listesi. Her kayıt: {id, title, summary, lat, lng, place_id, link, image, distance_km}';

COMMENT ON COLUMN districts.center_lat IS
  'Google Geocoding veya admin panelinden doldurulur.';
