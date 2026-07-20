#!/usr/bin/env bash
# Oykun Otel (Etstur: /Oykun-Otel) — oda + kahvaltı 5.000 TL ile ekler.
# Görseller aegeanhotels kaynağından; Etstur HTML Cloudflare ile kapalıdır.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
DATA_FILE="$APP_ROOT/deploy/data/tatilbudur/oykun-otel.json"

cd "$APP_ROOT"

TATILBUDUR_LISTING_STATUS="${TATILBUDUR_LISTING_STATUS:-published}" \
  "$APP_ROOT/deploy/scripts/import-tatilbudur-hotels.sh" \
  --file "$DATA_FILE" --reset --limit 1

# shellcheck source=deploy/scripts/lib/psql-env.sh
source "$APP_ROOT/deploy/scripts/lib/psql-env.sh"

psql_travel -v ON_ERROR_STOP=1 <<'SQL'
UPDATE listing_hotel_details d
SET etstur_property_ref = 'https://www.etstur.com/Oykun-Otel'
WHERE d.listing_id = (
  SELECT l.id FROM listings l
  WHERE l.external_provider_code = 'tatilbudur'
    AND l.external_listing_ref = 'oykun-otel'
  LIMIT 1
);

INSERT INTO listing_meal_plans (
  listing_id, plan_code, label, label_en, price_per_night, currency_code, is_active
)
SELECT l.id, 'bed_breakfast', 'Oda Kahvaltı', 'Bed & Breakfast', 5000, 'TRY', true
FROM listings l
WHERE l.external_provider_code = 'tatilbudur'
  AND l.external_listing_ref = 'oykun-otel'
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
    AND l.external_listing_ref = 'oykun-otel'
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
SELECT 'oykun_ai_queued' AS result, count(*) AS queued FROM queued;

SELECT
  l.id,
  l.slug,
  l.status,
  l.vitrin_price::text,
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
  AND l.external_listing_ref = 'oykun-otel'
GROUP BY l.id, l.slug, l.status, l.vitrin_price, d.etstur_property_ref;
SQL

echo "[OK] Oykun Otel eklendi (oda + kahvaltı 5.000 TL)."
echo "[INFO] Çok dilli içerik için: systemctl start --no-block travel-ai-worker.service"
