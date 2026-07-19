#!/usr/bin/env bash
# Villa kayıtlarındaki eski temizlik ücretini kısa konaklama ücretine taşır.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

# shellcheck source=deploy/scripts/lib/psql-env.sh
source "$APP_ROOT/deploy/scripts/lib/psql-env.sh"

psql_travel -v ON_ERROR_STOP=1 <<'SQL'
BEGIN;

WITH candidates AS (
  SELECT l.id, l.cleaning_fee_amount
  FROM listings l
  JOIN product_categories pc ON pc.id = l.category_id
  WHERE pc.code = 'holiday_home'
    AND l.cleaning_fee_amount IS NOT NULL
    AND l.cleaning_fee_amount > 0
)
INSERT INTO listing_attributes (listing_id, group_code, key, value_json)
SELECT c.id, 'listing_meta', 'v1',
       jsonb_build_object('short_stay_fee', c.cleaning_fee_amount::text)
FROM candidates c
ON CONFLICT (listing_id, group_code, key) DO UPDATE SET
  value_json = COALESCE(listing_attributes.value_json, '{}'::jsonb) || EXCLUDED.value_json;

WITH moved AS (
  UPDATE listings l
  SET cleaning_fee_amount = NULL, updated_at = now()
  FROM product_categories pc
  WHERE pc.id = l.category_id
    AND pc.code = 'holiday_home'
    AND l.cleaning_fee_amount IS NOT NULL
    AND l.cleaning_fee_amount > 0
  RETURNING l.id
)
SELECT 'villa_cleaning_fee_migrated' AS result, count(*) AS listing_count FROM moved;

COMMIT;
SQL

echo "[OK] Villa temizlik ücretleri kısa konaklama ücretine taşındı."
