#!/usr/bin/env bash
# NG Hotels 5 tesis: Phaselis Bay, Enjoy, Sapanca, Afyon Wellness, Sign Bodrum.
# Görseller aegeanhotels + bookeder; fiyatlar Bookeder USD×40 TRY veya manifest override.
#
#   chmod +x deploy/scripts/import-ng-hotels-5.sh
#   TATILBUDUR_LISTING_STATUS=published ./deploy/scripts/import-ng-hotels-5.sh
#
# Yeniden hasat: node scripts/harvest-ng-hotels.mjs
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
DATA_FILE="$APP_ROOT/deploy/data/tatilbudur/ng-hotels-5.json"

cd "$APP_ROOT"

if [[ ! -f "$DATA_FILE" ]]; then
  echo "[FAIL] Feed yok: $DATA_FILE — önce: node scripts/harvest-ng-hotels.mjs" >&2
  exit 1
fi

TATILBUDUR_LISTING_STATUS="${TATILBUDUR_LISTING_STATUS:-published}" \
  "$APP_ROOT/deploy/scripts/import-tatilbudur-hotels.sh" \
  --file "$DATA_FILE" --reset

# shellcheck source=deploy/scripts/lib/psql-env.sh
source "$APP_ROOT/deploy/scripts/lib/psql-env.sh"

psql_travel -v ON_ERROR_STOP=1 <<'SQL'
WITH feed(ref, location_name, district, city, province, address, lat, lng, source_url, meal_code, meal_label, meal_label_en) AS (
  VALUES
    ('ng-phaselis-bay', 'Göynük, Kemer, Antalya', 'Göynük', 'Kemer', 'Antalya',
      'Göynük / Kemer, Antalya', 36.643093, 30.556439,
      'https://www.etstur.com/NG-Phaselis-Bay', 'all_inclusive', 'Her Şey Dahil', 'All Inclusive'),
    ('ng-enjoy', 'Kırkpınar, Sapanca, Sakarya', 'Kırkpınar', 'Sapanca', 'Sakarya',
      'Tepebaşı Mh. Şehit Cevdet Koç Cd. No:69 Kırkpınar - Sapanca, 54600', 40.689984, 30.216715,
      'https://www.etstur.com/Ng-Enjoy', 'all_inclusive', 'Her Şey Dahil', 'All Inclusive'),
    ('ng-sapanca', 'Kırkpınar, Sapanca, Sakarya', 'Kırkpınar', 'Sapanca', 'Sakarya',
      'Tepebaşı Mah. Şehit Cevdet Koç Cad. No:73, Kırkpınar, Sapanca', 40.690861, 30.215144,
      'https://www.etstur.com/Ng-Sapanca', 'all_inclusive', 'Her Şey Dahil', 'All Inclusive'),
    ('ng-afyon-wellness-convention', 'Merkez, Afyonkarahisar', 'Merkez', 'Afyonkarahisar', 'Afyonkarahisar',
      'İzmir Ankara Karayolu 7. Km, Afyonkarahisar', 38.784728, 30.477748,
      'https://www.etstur.com/NG-Afyon-Wellness-Convention', 'all_inclusive', 'Her Şey Dahil', 'All Inclusive'),
    ('ng-sign-bodrum', 'Ortakent, Bodrum, Muğla', 'Ortakent', 'Bodrum', 'Muğla',
      'Yahşi Koyu, Kargı Cd. No:118 Ortakent, Bodrum, Muğla', 37.009044, 27.326831,
      'https://tr.hotels.com/ho3910122720/ng-sign-bodrum/', 'all_inclusive', 'Her Şey Dahil', 'All Inclusive')
),
targets AS (
  SELECT l.id AS listing_id, f.*
  FROM feed f
  JOIN listings l
    ON l.external_provider_code = 'tatilbudur'
   AND l.external_listing_ref = f.ref
)
UPDATE listings l
SET
  location_name = t.location_name,
  map_lat = t.lat,
  map_lng = t.lng,
  updated_at = now()
FROM targets t
WHERE l.id = t.listing_id;

INSERT INTO listing_attributes (listing_id, group_code, key, value_json)
SELECT
  t.listing_id,
  'listing_meta',
  'v1',
  jsonb_build_object(
    'district_label', t.district,
    'city', t.city,
    'province_city', t.province,
    'address', t.address,
    'lat', t.lat::text,
    'lng', t.lng::text
  )
FROM targets t
ON CONFLICT (listing_id, group_code, key) DO UPDATE SET
  value_json = listing_attributes.value_json || EXCLUDED.value_json;

UPDATE listing_hotel_details d
SET etstur_property_ref = CASE
  WHEN t.source_url LIKE '%etstur.com%' THEN t.source_url
  ELSE d.etstur_property_ref
END,
tatilcom_property_ref = CASE
  WHEN t.source_url NOT LIKE '%etstur.com%' THEN t.source_url
  ELSE d.tatilcom_property_ref
END
FROM targets t
WHERE d.listing_id = t.listing_id;

INSERT INTO listing_hotel_details (listing_id, etstur_property_ref, tatilcom_property_ref)
SELECT
  t.listing_id,
  CASE WHEN t.source_url LIKE '%etstur.com%' THEN t.source_url ELSE NULL END,
  CASE WHEN t.source_url NOT LIKE '%etstur.com%' THEN t.source_url ELSE NULL END
FROM targets t
WHERE NOT EXISTS (
  SELECT 1 FROM listing_hotel_details d WHERE d.listing_id = t.listing_id
);

INSERT INTO listing_meal_plans (
  listing_id, plan_code, label, label_en, price_per_night, currency_code, is_active
)
SELECT
  t.listing_id,
  t.meal_code,
  t.meal_label,
  t.meal_label_en,
  COALESCE(
    (
      SELECT MIN((r.rule_json->>'base_nightly')::numeric)
      FROM listing_price_rules r
      WHERE r.listing_id = t.listing_id
        AND nullif(r.rule_json->>'base_nightly', '') IS NOT NULL
    ),
    0
  ),
  'TRY',
  true
FROM targets t
WHERE COALESCE(
  (
    SELECT MIN((r.rule_json->>'base_nightly')::numeric)
    FROM listing_price_rules r
    WHERE r.listing_id = t.listing_id
      AND nullif(r.rule_json->>'base_nightly', '') IS NOT NULL
  ),
  0
) > 0
ON CONFLICT (listing_id, plan_code) DO UPDATE SET
  label = EXCLUDED.label,
  label_en = EXCLUDED.label_en,
  price_per_night = EXCLUDED.price_per_night,
  currency_code = EXCLUDED.currency_code,
  is_active = true;

SELECT refresh_listing_vitrin_prices();

WITH queued AS (
  INSERT INTO ai_listing_content_batches
    (listing_id, category_code, phase, status, overwrite)
  SELECT t.listing_id, 'hotel', 'tr_description', 'pending', true
  FROM targets t
  WHERE NOT EXISTS (
    SELECT 1
    FROM ai_listing_content_batches b
    WHERE b.listing_id = t.listing_id
      AND b.status IN ('pending', 'running')
  )
  RETURNING listing_id
)
SELECT 'ng_hotels_ai_queued' AS result, count(*) AS queued FROM queued;

SELECT
  l.external_listing_ref AS ref,
  l.slug,
  l.status,
  l.vitrin_price::text AS vitrin,
  l.location_name,
  count(DISTINCT li.id) AS images,
  count(DISTINCT hr.id) AS rooms,
  count(DISTINCT hr.id) FILTER (WHERE nullif(hr.meta_json->>'image', '') IS NOT NULL) AS rooms_with_images
FROM targets t
JOIN listings l ON l.id = t.listing_id
LEFT JOIN listing_images li ON li.listing_id = l.id
LEFT JOIN hotel_rooms hr ON hr.listing_id = l.id
GROUP BY l.id, l.external_listing_ref, l.slug, l.status, l.vitrin_price, l.location_name
ORDER BY l.external_listing_ref;
SQL

echo "[OK] NG Hotels 5 tesis içe aktarıldı."
echo "[INFO] Çok dilli içerik: ./deploy/scripts/ensure-ai-social-workers.sh"
