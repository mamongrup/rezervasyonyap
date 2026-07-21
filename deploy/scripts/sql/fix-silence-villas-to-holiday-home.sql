-- Silence Villas: otel → tatil evi (villa) + bölge Kayaköy → Kargı
-- CTE yerine TEMP TABLE (psql -f çoklu ifade kapsamı).

BEGIN;

CREATE TEMP TABLE tmp_silence_target ON COMMIT DROP AS
SELECT l.id
FROM listings l
WHERE (
    (l.external_provider_code = 'tatilbudur' AND l.external_listing_ref = 'silence-villas')
    OR l.slug = 'silence-villas'
  )
LIMIT 1;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM tmp_silence_target) THEN
    RAISE EXCEPTION 'silence_villas listing not found';
  END IF;
END $$;

UPDATE listings l
SET
  category_id = (SELECT id FROM product_categories WHERE code = 'holiday_home' LIMIT 1),
  category_contract_id = COALESCE(
    l.category_contract_id,
    (
      SELECT cc.id
      FROM category_contracts cc
      JOIN product_categories pc ON pc.id = cc.category_id
      WHERE pc.code = 'holiday_home'
        AND cc.code = 'default'
        AND cc.is_active = true
        AND cc.contract_scope = 'category'
        AND cc.organization_id IS NULL
      ORDER BY cc.version DESC, cc.sort_order, cc.updated_at DESC
      LIMIT 1
    )
  ),
  location_name = 'Kargı, Fethiye, Muğla',
  map_lat = COALESCE(l.map_lat, 36.685849),
  map_lng = COALESCE(l.map_lng, 29.081465),
  status = 'published',
  updated_at = now()
FROM tmp_silence_target t
WHERE l.id = t.id;

INSERT INTO listing_holiday_home_details (listing_id, theme_codes, rule_codes, ical_managed)
SELECT t.id, '{}'::text[], '{}'::text[], false
FROM tmp_silence_target t
ON CONFLICT (listing_id) DO NOTHING;

INSERT INTO listing_attributes (listing_id, group_code, key, value_json)
SELECT
  t.id,
  'listing_meta',
  'v1',
  jsonb_build_object(
    'district_label', 'Kargı',
    'city', 'Fethiye',
    'province_city', 'Muğla',
    'region_display', 'Kargı, Fethiye',
    'address', 'Kargı Mahallesi Zafer Sokak No:39/A, Fethiye/Muğla',
    'lat', '36.685849',
    'lng', '29.081465',
    'property_type', 'villa',
    'check_in_time', '16:00',
    'check_out_time', '08:00',
    'pool_type', 'Özel yüzme havuzu'
  )
FROM tmp_silence_target t
ON CONFLICT (listing_id, group_code, key) DO UPDATE SET
  value_json = listing_attributes.value_json || EXCLUDED.value_json
    || jsonb_build_object(
      'district_label', 'Kargı',
      'region_display', 'Kargı, Fethiye',
      'address', 'Kargı Mahallesi Zafer Sokak No:39/A, Fethiye/Muğla',
      'property_type', 'villa'
    );

UPDATE listing_translations lt
SET
  description = replace(
    replace(replace(lt.description, 'Kayaköy', 'Kargı'), 'Kayakoy', 'Kargı'),
    'Kargi',
    'Kargı'
  )
FROM tmp_silence_target t
WHERE lt.listing_id = t.id
  AND (
    lt.description ILIKE '%Kayaköy%'
    OR lt.description ILIKE '%Kayakoy%'
    OR lt.description ~ 'Kargi'
  );

WITH queued AS (
  INSERT INTO ai_listing_content_batches
    (listing_id, category_code, phase, status, overwrite)
  SELECT t.id, 'holiday_home', 'tr_description', 'pending', true
  FROM tmp_silence_target t
  WHERE NOT EXISTS (
    SELECT 1
    FROM ai_listing_content_batches b
    WHERE b.listing_id = t.id
      AND b.status IN ('pending', 'running')
  )
  RETURNING listing_id
)
SELECT 'silence_villas_ai_queued' AS result, count(*) AS queued FROM queued;

SELECT refresh_listing_vitrin_prices();

SELECT
  l.id,
  l.slug,
  pc.code AS category,
  l.status,
  l.location_name,
  l.vitrin_price::text AS vitrin,
  la.value_json->>'district_label' AS district,
  la.value_json->>'property_type' AS property_type,
  EXISTS (SELECT 1 FROM listing_holiday_home_details h WHERE h.listing_id = l.id) AS hh_details
FROM listings l
JOIN product_categories pc ON pc.id = l.category_id
LEFT JOIN listing_attributes la
  ON la.listing_id = l.id AND la.group_code = 'listing_meta' AND la.key = 'v1'
WHERE l.slug = 'silence-villas'
   OR (l.external_provider_code = 'tatilbudur' AND l.external_listing_ref = 'silence-villas');

COMMIT;
