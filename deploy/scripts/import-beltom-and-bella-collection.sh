#!/usr/bin/env bash
# Adrasan Beltom Beach Hotel + Villa Bella 1-5 tek seferlik kalite kontrollü aktarım.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
cd "$APP_ROOT"

"$APP_ROOT/deploy/scripts/import-adrasan-beltom-hotel.sh"
node "$APP_ROOT/scripts/import-villa-bella-collection.mjs" "$@"
"$APP_ROOT/deploy/scripts/migrate-villa-cleaning-fees-to-short-stay.sh"

# shellcheck source=deploy/scripts/lib/psql-env.sh
source "$APP_ROOT/deploy/scripts/lib/psql-env.sh"
psql_travel -v ON_ERROR_STOP=1 <<'SQL'
WITH targets AS (
  SELECT l.id
  FROM listings l
  WHERE (l.external_provider_code = 'tatilbudur' AND l.external_listing_ref = 'adrasan-beltom-beach-hotel')
     OR (l.external_provider_code = 'birvillas' AND l.external_listing_ref IN (
       'tc97shkNcDvOfEPCKSVs', '40N1KtxyzUcj1AjNmo8e', 'Ohr7zRG8TXYfaJm2sBIg',
       'p32t5PQB7oycOmJ6jEXW', 'pfosunWEj7iQaf36WVbT'
     ))
), queued AS (
  INSERT INTO ai_listing_content_batches (listing_id, category_code, phase, status, overwrite)
  SELECT t.id, pc.code, 'tr_description', 'pending', false
  FROM targets t
  JOIN listings l ON l.id = t.id
  JOIN product_categories pc ON pc.id = l.category_id
  WHERE NOT EXISTS (
    SELECT 1 FROM ai_listing_content_batches b
    WHERE b.listing_id = t.id AND b.status IN ('pending', 'running', 'done')
  )
  RETURNING listing_id
)
SELECT 'collection_ai_queued' AS result, count(*) AS queued FROM queued;

SELECT l.slug, l.status, count(DISTINCT lt.locale_id) AS languages,
       count(DISTINCT li.id) AS gallery_images,
       coalesce((a.value_json->>'provider_gallery_count')::int, 0) AS provider_gallery_images,
       coalesce((a.value_json->>'media_incomplete')::boolean, false) AS media_incomplete
FROM listings l
LEFT JOIN listing_translations lt ON lt.listing_id = l.id
LEFT JOIN listing_images li ON li.listing_id = l.id
LEFT JOIN listing_attributes a ON a.listing_id = l.id
  AND a.group_code = l.external_provider_code AND a.key = 'snapshot'
WHERE (l.external_provider_code = 'tatilbudur' AND l.external_listing_ref = 'adrasan-beltom-beach-hotel')
   OR (l.external_provider_code = 'birvillas' AND l.external_listing_ref IN (
     'tc97shkNcDvOfEPCKSVs', '40N1KtxyzUcj1AjNmo8e', 'Ohr7zRG8TXYfaJm2sBIg',
     'p32t5PQB7oycOmJ6jEXW', 'pfosunWEj7iQaf36WVbT'
   ))
GROUP BY l.slug, l.status, a.value_json
ORDER BY l.slug;
SQL

echo "[OK] Altı tesis taslak olarak aktarıldı ve dil/SEO kuyruğuna alındı."
echo "[INFO] Worker: systemctl start --no-block travel-ai-worker.service"
