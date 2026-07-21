#!/usr/bin/env bash
# Fairy Stone Travel — Kapadokya aktiviteleri (10 tur).
#
#   cd /var/www/vhosts/rezervasyonyap.tr/httpdocs
#   git fetch origin main && git reset --hard origin/main
#   chmod +x deploy/scripts/import-fairystone-kapadokya-activities.sh
#   ./deploy/scripts/import-fairystone-kapadokya-activities.sh
#
# SKIP_HARVEST=1 → repo feed'ini kullan
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
FEED="$APP_ROOT/deploy/data/fairystone/kapadokya-activities.json"
LIMIT="${LIMIT:-0}"

cd "$APP_ROOT"

if [[ "${SKIP_HARVEST:-0}" != "1" ]]; then
  echo "[INFO] Fairy Stone sayfalarından hasat..."
  node "$APP_ROOT/scripts/harvest-fairystone-activities.mjs" --out "$FEED"
fi

if [[ ! -f "$FEED" ]]; then
  echo "[ERR] Feed yok: $FEED" >&2
  exit 1
fi

COUNT="$(node -e "const j=require(process.argv[1]); console.log((j.activities||[]).length)" "$FEED")"
echo "[INFO] Import: $COUNT aktivite"

IMPORT_ARGS=(--file "$FEED")
if [[ "$LIMIT" != "0" ]]; then
  IMPORT_ARGS+=(--limit "$LIMIT")
fi
if [[ "${DOWNLOAD_IMAGES:-0}" == "1" ]]; then
  IMPORT_ARGS+=(--download-images)
fi

FAIRYSTONE_LISTING_STATUS="${FAIRYSTONE_LISTING_STATUS:-published}" \
  node "$APP_ROOT/scripts/import-fairystone-activities.mjs" "${IMPORT_ARGS[@]}"

# shellcheck source=deploy/scripts/lib/psql-env.sh
source "$APP_ROOT/deploy/scripts/lib/psql-env.sh"

psql_travel -v ON_ERROR_STOP=1 <<'SQL'
SELECT refresh_listing_vitrin_prices();

WITH target AS (
  SELECT l.id
  FROM listings l
  WHERE l.external_provider_code = 'fairystone'
),
queued AS (
  INSERT INTO ai_listing_content_batches
    (listing_id, category_code, phase, status, overwrite)
  SELECT t.id, 'activity', 'tr_description', 'pending', true
  FROM target t
  WHERE NOT EXISTS (
    SELECT 1 FROM ai_listing_content_batches b
    WHERE b.listing_id = t.id AND b.status IN ('pending', 'running')
  )
  RETURNING listing_id
)
SELECT 'fairystone_ai_queued' AS result, count(*) AS queued FROM queued;

SELECT
  l.external_listing_ref AS id,
  l.slug,
  l.status,
  l.currency_code,
  l.vitrin_price::text AS vitrin_price,
  count(DISTINCT li.id) AS gallery_images,
  count(DISTINCT s.id) AS sessions
FROM listings l
LEFT JOIN listing_images li ON li.listing_id = l.id
LEFT JOIN listing_activity_sessions s ON s.listing_id = l.id
WHERE l.external_provider_code = 'fairystone'
GROUP BY l.id, l.external_listing_ref, l.slug, l.status, l.currency_code, l.vitrin_price
ORDER BY l.external_listing_ref;
SQL

echo "[OK] Fairy Stone Kapadokya aktiviteleri eklendi ($COUNT)."
echo "[INFO] AI: systemctl start --no-block travel-ai-worker.service"
echo "[INFO] Frontend görseller için next.config fairystonetravel.com — travel-web rebuild gerekebilir."
