#!/usr/bin/env bash
# The Plaza Bodrum (Torba) — Premium Her Şey Dahil.
# Kaynak: resmi site https://theplazabodrum.com/tr/ (+ Etstur/Setur doğrulama).
#
#   cd /var/www/vhosts/rezervasyonyap.tr/httpdocs
#   git fetch origin main && git reset --hard origin/main
#   chmod +x deploy/scripts/import-the-plaza-bodrum.sh
#   ./deploy/scripts/import-the-plaza-bodrum.sh
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
DATA_FILE="$APP_ROOT/deploy/data/tatilbudur/the-plaza-bodrum.json"

cd "$APP_ROOT"

if [[ ! -f "$DATA_FILE" ]]; then
  echo "[FAIL] Feed yok: $DATA_FILE" >&2
  exit 1
fi

TATILBUDUR_LISTING_STATUS="${TATILBUDUR_LISTING_STATUS:-published}" \
  "$APP_ROOT/deploy/scripts/import-tatilbudur-hotels.sh" \
  --file "$DATA_FILE" --reset --limit 1

# shellcheck source=deploy/scripts/lib/psql-env.sh
source "$APP_ROOT/deploy/scripts/lib/psql-env.sh"

# Yerelde /etc yolu yoksa backend.env kullan
if [[ ! -f "${TRAVEL_DB_ENV:-/etc/rezervasyonyap/backend.env}" && -f "$APP_ROOT/backend/backend.env" ]]; then
  export TRAVEL_DB_ENV="$APP_ROOT/backend/backend.env"
fi

psql_travel -v ON_ERROR_STOP=1 <<'SQL'
UPDATE listings l
SET
  location_name = 'Torba, Bodrum, Muğla',
  map_lat = 37.0999224,
  map_lng = 27.4912141,
  updated_at = now()
WHERE l.external_provider_code = 'tatilbudur'
  AND l.external_listing_ref = 'the-plaza-bodrum';

INSERT INTO listing_attributes (listing_id, group_code, key, value_json)
SELECT l.id, 'listing_meta', 'v1', jsonb_build_object(
  'district_label', 'Torba',
  'city', 'Bodrum',
  'province_city', 'Muğla',
  'region_display', 'Torba, Bodrum',
  'address', 'Zeytinlikahve Mevkii, Herodot Bulvarı, 48400 Torba/Bodrum/Muğla',
  'lat', '37.0999224',
  'lng', '27.4912141',
  'source_url', 'https://www.etstur.com/The-Plaza-Bodrum',
  'official_url', 'https://theplazabodrum.com/tr/',
  'phone', '+90 252 530 00 21'
)
FROM listings l
WHERE l.external_provider_code = 'tatilbudur'
  AND l.external_listing_ref = 'the-plaza-bodrum'
ON CONFLICT (listing_id, group_code, key) DO UPDATE SET
  value_json = listing_attributes.value_json || EXCLUDED.value_json;

UPDATE listing_hotel_details d
SET etstur_property_ref = 'https://www.etstur.com/The-Plaza-Bodrum'
WHERE d.listing_id = (
  SELECT l.id FROM listings l
  WHERE l.external_provider_code = 'tatilbudur'
    AND l.external_listing_ref = 'the-plaza-bodrum'
  LIMIT 1
);

INSERT INTO listing_meal_plans (
  listing_id, plan_code, label, label_en, price_per_night, currency_code, is_active
)
SELECT l.id, 'all_inclusive', 'Premium Her Şey Dahil', 'Premium All Inclusive', 12100, 'TRY', true
FROM listings l
WHERE l.external_provider_code = 'tatilbudur'
  AND l.external_listing_ref = 'the-plaza-bodrum'
ON CONFLICT (listing_id, plan_code) DO UPDATE SET
  label = EXCLUDED.label,
  label_en = EXCLUDED.label_en,
  price_per_night = EXCLUDED.price_per_night,
  currency_code = EXCLUDED.currency_code,
  is_active = true;

SELECT refresh_listing_vitrin_prices();

WITH target AS (
  SELECT l.id
  FROM listings l
  WHERE l.external_provider_code = 'tatilbudur'
    AND l.external_listing_ref = 'the-plaza-bodrum'
  LIMIT 1
), queued AS (
  INSERT INTO ai_listing_content_batches
    (listing_id, category_code, phase, status, overwrite)
  SELECT t.id, 'hotel', 'tr_description', 'pending', true
  FROM target t
  WHERE NOT EXISTS (
    SELECT 1
    FROM ai_listing_content_batches b
    WHERE b.listing_id = t.id
      AND b.status IN ('pending', 'running')
  )
  RETURNING listing_id
)
SELECT 'plaza_bodrum_ai_queued' AS result, count(*) AS queued FROM queued;

SELECT
  l.id,
  l.slug,
  l.status,
  l.vitrin_price::text,
  l.location_name,
  l.map_lat::text,
  l.map_lng::text,
  d.etstur_property_ref,
  count(DISTINCT lt.locale_id) AS language_count,
  count(DISTINCT li.id) AS gallery_image_count,
  count(DISTINCT hr.id) AS room_count,
  count(DISTINCT hr.id) FILTER (WHERE nullif(hr.meta_json->>'image', '') IS NOT NULL) AS rooms_with_images
FROM listings l
LEFT JOIN listing_hotel_details d ON d.listing_id = l.id
LEFT JOIN listing_translations lt ON lt.listing_id = l.id
LEFT JOIN listing_images li ON li.listing_id = l.id
LEFT JOIN hotel_rooms hr ON hr.listing_id = l.id
WHERE l.external_provider_code = 'tatilbudur'
  AND l.external_listing_ref = 'the-plaza-bodrum'
GROUP BY l.id, l.slug, l.status, l.vitrin_price, l.location_name, l.map_lat, l.map_lng, d.etstur_property_ref;
SQL

echo "[OK] The Plaza Bodrum eklendi (Premium Her Şey Dahil ≈ 12.100 TL)."
echo "     URL: /otel/the-plaza-bodrum"
echo "[INFO] Çok dilli içerik için: systemctl start --no-block travel-ai-worker.service"
echo "[INFO] veya: ./deploy/scripts/ensure-ai-social-workers.sh"
