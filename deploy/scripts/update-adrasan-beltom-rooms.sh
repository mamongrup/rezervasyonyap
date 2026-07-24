#!/usr/bin/env bash
# Adrasan Beltom Beach Hotel oda görselleri + doğrulanmış oda fiyatı güncellemesi.
#
#   ./deploy/scripts/update-adrasan-beltom-rooms.sh
#   ./deploy/scripts/update-adrasan-beltom-rooms.sh --sql-only
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
cd "$APP_ROOT"

# shellcheck source=deploy/scripts/lib/psql-env.sh
source "$APP_ROOT/deploy/scripts/lib/psql-env.sh"
require_travel_db_env

if [[ "${1:-}" == "--sql-only" ]]; then
  "$APP_ROOT/deploy/apply-sql.sh" "$APP_ROOT/deploy/scripts/sql/update-adrasan-beltom-rooms.sql"
  exit 0
fi

node "$APP_ROOT/scripts/update-adrasan-beltom-rooms.mjs" "$@"

psql_travel -v ON_ERROR_STOP=1 <<'SQL'
SELECT refresh_listing_vitrin_prices();

SELECT l.slug, l.status, l.vitrin_price::text,
       count(DISTINCT hr.id) AS rooms,
       count(DISTINCT hr.id) FILTER (WHERE nullif(hr.meta_json->>'image','') IS NOT NULL) AS rooms_with_images,
       (SELECT count(*) FROM listing_price_rules pr WHERE pr.listing_id = l.id AND pr.rule_json->>'source' = 'tatilbudur') AS tb_price_rules
FROM listings l
LEFT JOIN hotel_rooms hr ON hr.listing_id = l.id
WHERE l.external_provider_code = 'tatilbudur'
  AND l.external_listing_ref = 'adrasan-beltom-beach-hotel'
GROUP BY l.id, l.slug, l.status, l.vitrin_price;
SQL

echo "[OK] Beltom oda görselleri / fiyatları güncellendi."
