-- Oykun Otel konum: Çalış / Fethiye / Muğla + harita koordinatları
-- Uygula: ./deploy/apply-sql.sh deploy/scripts/sql/update-oykun-otel-location.sql
BEGIN;

UPDATE listings l
SET
  location_name = 'Çalış, Fethiye, Muğla',
  map_lat = 36.6624085,
  map_lng = 29.111434,
  updated_at = now()
WHERE l.external_provider_code = 'tatilbudur'
  AND l.external_listing_ref = 'oykun-otel';

INSERT INTO listing_attributes (listing_id, group_code, key, value_json)
SELECT l.id, 'listing_meta', 'v1', jsonb_build_object(
  'district_label', 'Çalış',
  'city', 'Fethiye',
  'province_city', 'Muğla',
  'address', 'Foça Mahallesi, 1314. Sokak, 48300 Fethiye/Muğla',
  'lat', '36.6624085',
  'lng', '29.111434'
)
FROM listings l
WHERE l.external_provider_code = 'tatilbudur'
  AND l.external_listing_ref = 'oykun-otel'
ON CONFLICT (listing_id, group_code, key) DO UPDATE SET
  value_json = listing_attributes.value_json || EXCLUDED.value_json;

SELECT l.slug, l.location_name, l.map_lat::text, l.map_lng::text,
       la.value_json->>'district_label' AS district_label,
       la.value_json->>'city' AS city,
       la.value_json->>'province_city' AS province_city
FROM listings l
LEFT JOIN listing_attributes la
  ON la.listing_id = l.id AND la.group_code = 'listing_meta' AND la.key = 'v1'
WHERE l.external_provider_code = 'tatilbudur'
  AND l.external_listing_ref = 'oykun-otel';

COMMIT;
