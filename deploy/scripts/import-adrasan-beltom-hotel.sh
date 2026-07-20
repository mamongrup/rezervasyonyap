#!/usr/bin/env bash
# Adrasan Beltom Beach Hotel'i doğrulanmış tesis/oda medyasıyla taslak olarak ekler
# ve tüm aktif vitrin dilleri + SEO için AI kalite kuyruğuna alır.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
DATA_FILE="$APP_ROOT/deploy/data/tatilbudur/adrasan-beltom-beach-hotel.json"

cd "$APP_ROOT"

TATILBUDUR_LISTING_STATUS=draft \
  "$APP_ROOT/deploy/scripts/import-tatilbudur-hotels.sh" \
  --file "$DATA_FILE" --reset --limit 1

# shellcheck source=deploy/scripts/lib/psql-env.sh
source "$APP_ROOT/deploy/scripts/lib/psql-env.sh"

psql_travel -v ON_ERROR_STOP=1 <<'SQL'
WITH target AS (
  SELECT l.id
  FROM listings l
  WHERE l.external_provider_code = 'tatilbudur'
    AND l.external_listing_ref = 'adrasan-beltom-beach-hotel'
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
SELECT 'beltom_ai_queued' AS result, count(*) AS queued FROM queued;

SELECT
  l.id,
  l.slug,
  l.status,
  count(DISTINCT lt.locale_id) AS language_count,
  count(DISTINCT li.id) AS gallery_image_count,
  count(DISTINCT hr.id) AS room_count,
  count(DISTINCT hr.id) FILTER (WHERE nullif(hr.meta_json->>'image', '') IS NOT NULL) AS rooms_with_images
FROM listings l
LEFT JOIN listing_translations lt ON lt.listing_id = l.id
LEFT JOIN listing_images li ON li.listing_id = l.id
LEFT JOIN hotel_rooms hr ON hr.listing_id = l.id
WHERE l.external_provider_code = 'tatilbudur'
  AND l.external_listing_ref = 'adrasan-beltom-beach-hotel'
GROUP BY l.id, l.slug, l.status;
SQL

echo "[OK] Beltom oteli taslak eklendi; dil ve SEO kalite kuyruğuna alındı."
echo "[INFO] Worker: systemctl start --no-block travel-ai-worker.service"
