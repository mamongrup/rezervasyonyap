-- 287: İlçe/bölge bazlı servis mekan koordinatları
-- Her ilçe için Google Places API 1 kez çağrılır, koordinatlar burada saklanır.
-- İlan sayfasında Haversine ile ücretsiz mesafe hesabı yapılır.

ALTER TABLE location_pages
  ADD COLUMN IF NOT EXISTS service_pois_json JSONB;

COMMENT ON COLUMN location_pages.service_pois_json IS
  'İlçe/bölge servis mekanları [{type,label,googleType,lat,lng,category}]. '
  'Google Places 1 kez çağrılır; ilan mesafesi Haversine ile hesaplanır.';
