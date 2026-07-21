#!/usr/bin/env bash
# Fethiye kuşağı 14 otel (TatilBudur / Etstur / Obilet / Hotels.com kaynaklı).
# Görseller aegeanhotels + bookeder; fiyatlar Bookeder USD taban × 40 TRY veya Obilet TL / manifest override.
#
# Kullanım (üretim httpdocs kökünde):
#   chmod +x deploy/scripts/import-fethiye-belt-14.sh
#   TATILBUDUR_LISTING_STATUS=published ./deploy/scripts/import-fethiye-belt-14.sh
#
# Yeniden hasat (opsiyonel, Cloudflare kapalı kaynaklar için aynalar):
#   node scripts/harvest-fethiye-belt-hotels.mjs
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
DATA_FILE="$APP_ROOT/deploy/data/tatilbudur/fethiye-belt-14.json"

cd "$APP_ROOT"

if [[ ! -f "$DATA_FILE" ]]; then
  echo "[FAIL] Feed yok: $DATA_FILE — önce: node scripts/harvest-fethiye-belt-hotels.mjs" >&2
  exit 1
fi

TATILBUDUR_LISTING_STATUS="${TATILBUDUR_LISTING_STATUS:-published}" \
  "$APP_ROOT/deploy/scripts/import-tatilbudur-hotels.sh" \
  --file "$DATA_FILE" --reset

# shellcheck source=deploy/scripts/lib/psql-env.sh
source "$APP_ROOT/deploy/scripts/lib/psql-env.sh"

psql_travel -v ON_ERROR_STOP=1 <<'SQL'
-- Konum + listing_meta + kaynak URL + pansiyon + AI kuyruğu (14 otel)
WITH feed(ref, location_name, district, city, province, address, lat, lng, source_url, meal_code, meal_label, meal_label_en) AS (
  VALUES
    ('oyster-residences', 'Çalış, Fethiye, Muğla', 'Çalış', 'Fethiye', 'Muğla',
      'Ölüdeniz / Çalış, Fethiye', 36.546885, 29.122292,
      'https://www.tatilbudur.com/oyster-residences', 'all_inclusive', 'Her Şey Dahil', 'All Inclusive'),
    ('jade-residence', 'Ölüdeniz, Fethiye, Muğla', 'Ölüdeniz', 'Fethiye', 'Muğla',
      'Ölüdeniz, Fethiye', 36.547251, 29.122074,
      'https://www.tatilbudur.com/jade-residence-14', 'all_inclusive', 'Her Şey Dahil', 'All Inclusive'),
    ('lissiya-hotel', 'Ölüdeniz, Fethiye, Muğla', 'Ölüdeniz', 'Fethiye', 'Muğla',
      'Ölüdeniz, Fethiye', 36.470342, 29.128278,
      'https://www.tatilbudur.com/lissiya-hotel', 'all_inclusive', 'Her Şey Dahil', 'All Inclusive'),
    ('jiva-beach-resort', 'Çalış, Fethiye, Muğla', 'Çalış', 'Fethiye', 'Muğla',
      'Çalış, Fethiye', 36.673877, 29.101852,
      'https://www.etstur.com/Jiva-Beach-Resort', 'all_inclusive', 'Her Şey Dahil', 'All Inclusive'),
    ('liberty-fabay', 'Ölüdeniz, Fethiye, Muğla', 'Ölüdeniz', 'Fethiye', 'Muğla',
      'Ölüdeniz, Fethiye', 36.6822, 29.078262,
      'https://www.etstur.com/Liberty-Fabay', 'all_inclusive', 'Her Şey Dahil', 'All Inclusive'),
    ('sundia-exclusive-by-liberty-fethiye', 'Ölüdeniz, Fethiye, Muğla', 'Ölüdeniz', 'Fethiye', 'Muğla',
      'Ölüdeniz, Fethiye', 36.665517, 29.107713,
      'https://www.etstur.com/Sundia-Exclusive-By-Liberty-Fethiye-Adults-Only--16', 'all_inclusive', 'Her Şey Dahil', 'All Inclusive'),
    ('lykia-botanika-beach-fun-club', 'Yanıklar, Fethiye, Muğla', 'Yanıklar', 'Fethiye', 'Muğla',
      'Yanıklar, Fethiye', 36.690653, 29.049906,
      'https://www.obilet.com/otel/lykia-botanika-beach-fun-club', 'all_inclusive', 'Her Şey Dahil', 'All Inclusive'),
    ('liberty-signa', 'Ölüdeniz, Fethiye, Muğla', 'Ölüdeniz', 'Fethiye', 'Muğla',
      'Ölüdeniz, Fethiye', 36.682583, 29.080148,
      'https://www.etstur.com/Liberty-Signa', 'all_inclusive', 'Her Şey Dahil', 'All Inclusive'),
    ('akra-fethiye-tui-blue-sensatori', 'Karaçulha, Fethiye, Muğla', 'Karaçulha', 'Fethiye', 'Muğla',
      'Karaçulha, Fethiye', 36.683679, 29.075203,
      'https://www.etstur.com/Akra-Fethiye-Tui-Blue-Sensatori', 'all_inclusive', 'Her Şey Dahil', 'All Inclusive'),
    ('orka-cove-hotel-penthouse-suites', 'Ölüdeniz, Fethiye, Muğla', 'Ölüdeniz', 'Fethiye', 'Muğla',
      'Ölüdeniz, Fethiye', 36.590401, 29.146622,
      'https://www.etstur.com/Orka-Cove-Hotel-Penthouse-Suites', 'all_inclusive', 'Her Şey Dahil', 'All Inclusive'),
    ('exelans-hotel-spa', 'Ölüdeniz, Fethiye, Muğla', 'Ölüdeniz', 'Fethiye', 'Muğla',
      'Taşyaka Mah. 246. Sok. No:6, Ölüdeniz/Fethiye', 36.623793, 29.129629,
      'https://tr.hotels.com/ho618697920/exelans-hotel-spa-fethiye-turkiye/', 'all_inclusive', 'Her Şey Dahil', 'All Inclusive'),
    ('xo-cape-arnna-fethiye', 'Ölüdeniz, Fethiye, Muğla', 'Ölüdeniz', 'Fethiye', 'Muğla',
      'Ölüdeniz, Fethiye', 36.682095, 29.081783,
      'https://www.etstur.com/XO-Cape-Arnna-Fethiye', 'all_inclusive', 'Her Şey Dahil', 'All Inclusive'),
    ('akra-fethiye-the-residence-tui-blue-sensatori', 'Karaçulha, Fethiye, Muğla', 'Karaçulha', 'Fethiye', 'Muğla',
      'Karaçulha, Fethiye', 36.68335, 29.07366,
      'https://www.etstur.com/Akra-Fethiye-The-Residence-Tui-Blue-Sensatori---Adults-Only', 'all_inclusive', 'Her Şey Dahil', 'All Inclusive'),
    ('silence-villas', 'Kargı, Fethiye, Muğla', 'Kargı', 'Fethiye', 'Muğla',
      'Kargı Mahallesi Zafer Sokak No:39/A, Fethiye/Muğla', 36.685849, 29.081465,
      'https://www.etstur.com/Silence-Villas', 'bed_breakfast', 'Oda Kahvaltı', 'Bed & Breakfast')
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

-- Kaynak URL: Etstur → etstur_property_ref; diğerleri tatilcom_property_ref alanına yazılır (genel dış ref).
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

-- Meal plan fiyatı = listing_price_rules min (vitrin ile hizalı)
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
SELECT 'fethiye_belt_ai_queued' AS result, count(*) AS queued FROM queued;

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

echo "[OK] Fethiye kuşağı 14 otel içe aktarıldı."
echo "[INFO] Silence Villas villa olmalı — sonra çalıştırın:"
echo "       ./deploy/scripts/fix-silence-villas-to-villa.sh"
echo "[INFO] Çok dilli içerik: systemctl start --no-block travel-ai-worker.service"
echo "[INFO] veya: ./deploy/scripts/ensure-ai-social-workers.sh"
