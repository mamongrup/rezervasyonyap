#!/usr/bin/env bash
# Palmeras Beach Hotel (Hotels.com ho3269002816) — Bookeder Ultra Her Şey Dahil (Konaklı).
# Hotels.com Cloudflare kapalı; görseller/fiyat Bookeder aynasından.
#
#   cd /var/www/vhosts/rezervasyonyap.tr/httpdocs
#   git fetch origin main && git reset --hard origin/main
#   chmod +x deploy/scripts/import-palmeras-beach-hotel.sh
#   ./deploy/scripts/import-palmeras-beach-hotel.sh
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
DATA_FILE="$APP_ROOT/deploy/data/tatilbudur/palmeras-beach-hotel.json"
MANIFEST="$APP_ROOT/deploy/data/tatilbudur/palmeras-beach-hotel.manifest.json"

cd "$APP_ROOT"

if [[ ! -f "$DATA_FILE" ]]; then
  echo "[INFO] Feed yok — Bookeder'dan hasat..."
  node "$APP_ROOT/scripts/harvest-ng-hotels.mjs" \
    --manifest "$MANIFEST" \
    --out "$DATA_FILE" \
    --limit 1
fi

TATILBUDUR_LISTING_STATUS="${TATILBUDUR_LISTING_STATUS:-published}" \
  "$APP_ROOT/deploy/scripts/import-tatilbudur-hotels.sh" \
  --file "$DATA_FILE" --reset --limit 1

# shellcheck source=deploy/scripts/lib/psql-env.sh
source "$APP_ROOT/deploy/scripts/lib/psql-env.sh"

psql_travel -v ON_ERROR_STOP=1 <<'SQL'
UPDATE listings l
SET
  location_name = 'Konaklı, Alanya, Antalya',
  map_lat = 36.587147,
  map_lng = 31.864332,
  updated_at = now()
WHERE l.external_provider_code = 'tatilbudur'
  AND l.external_listing_ref = 'palmeras-beach-hotel';

INSERT INTO listing_attributes (listing_id, group_code, key, value_json)
SELECT l.id, 'listing_meta', 'v1', jsonb_build_object(
  'district_label', 'Konaklı',
  'city', 'Alanya',
  'province_city', 'Antalya',
  'region_display', 'Konaklı, Alanya',
  'address', 'Konaklı Mah. İskele Cad. No:7/A, 07490 Alanya/Antalya',
  'lat', '36.587147',
  'lng', '31.864332',
  'source_url', 'https://tr.hotels.com/ho3269002816/palmeras-beach-hotel-antalya-turkiye/',
  'official_url', 'https://www.palmerasbeachhotel.com/'
)
FROM listings l
WHERE l.external_provider_code = 'tatilbudur'
  AND l.external_listing_ref = 'palmeras-beach-hotel'
ON CONFLICT (listing_id, group_code, key) DO UPDATE SET
  value_json = listing_attributes.value_json || EXCLUDED.value_json;

INSERT INTO listing_meal_plans (
  listing_id, plan_code, label, label_en, price_per_night, currency_code, is_active
)
SELECT l.id, 'ultra_all_inclusive', 'Ultra Her Şey Dahil', 'Ultra All Inclusive', 4320, 'TRY', true
FROM listings l
WHERE l.external_provider_code = 'tatilbudur'
  AND l.external_listing_ref = 'palmeras-beach-hotel'
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
    AND l.external_listing_ref = 'palmeras-beach-hotel'
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
SELECT 'palmeras_ai_queued' AS result, count(*) AS queued FROM queued;

SELECT
  l.id,
  l.slug,
  l.status,
  l.vitrin_price::text,
  l.location_name,
  count(DISTINCT li.id) AS gallery_image_count,
  count(DISTINCT hr.id) AS room_count
FROM listings l
LEFT JOIN listing_images li ON li.listing_id = l.id
LEFT JOIN hotel_rooms hr ON hr.listing_id = l.id
WHERE l.external_provider_code = 'tatilbudur'
  AND l.external_listing_ref = 'palmeras-beach-hotel'
GROUP BY l.id, l.slug, l.status, l.vitrin_price, l.location_name;
SQL

echo "[OK] Palmeras Beach Hotel eklendi (Ultra Her Şey Dahil ≈ 4.320 TL)."
echo "     URL: /otel/palmeras-beach-hotel"
echo "[INFO] AI: systemctl start --no-block travel-ai-worker.service"
echo "[INFO] veya: ./deploy/scripts/ensure-ai-social-workers.sh"
