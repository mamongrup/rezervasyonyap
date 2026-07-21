#!/usr/bin/env bash
# Villa Bella 1–5: Birvillas canlı fiyat / müsaitlik / sistem özellikleri güncellemesi.
#
# Tercih: Node import (ic_mekan/dis_mekan def eşlemesi dahil)
#   ./deploy/scripts/update-villa-bella-collection.sh
# Hızlı SQL (anlık snapshot; apply-sql ile):
#   ./deploy/apply-sql.sh deploy/scripts/sql/update-villa-bella-live.sql
#   ./deploy/scripts/update-villa-bella-collection.sh --sql-only
# Snapshot yenileme (repo):
#   node scripts/generate-villa-bella-live-sql.mjs
# Silence + Bella birlikte:
#   ./deploy/scripts/apply-silence-capacity-and-bella-prices.sh
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
cd "$APP_ROOT"

# shellcheck source=deploy/scripts/lib/psql-env.sh
source "$APP_ROOT/deploy/scripts/lib/psql-env.sh"
require_travel_db_env

if [[ "${1:-}" == "--sql-only" ]]; then
  "$APP_ROOT/deploy/apply-sql.sh" "$APP_ROOT/deploy/scripts/sql/update-villa-bella-live.sql"
  exit 0
fi

node "$APP_ROOT/scripts/update-villa-bella-collection.mjs" "$@"

psql_travel -v ON_ERROR_STOP=1 <<'SQL'
SELECT refresh_listing_vitrin_prices();

SELECT l.slug,
       l.status,
       l.vitrin_price::text AS vitrin_price,
       l.min_stay_nights,
       l.currency_code,
       coalesce(array_to_string(h.theme_codes, ','), '') AS theme_codes,
       (SELECT count(*) FROM listing_price_rules pr WHERE pr.listing_id = l.id) AS price_bands,
       (SELECT count(*) FROM listing_availability_calendar c WHERE c.listing_id = l.id) AS calendar_days,
       (SELECT count(*) FROM listing_availability_calendar c WHERE c.listing_id = l.id AND c.is_available = false) AS blocked_days,
       (SELECT count(*) FROM listing_attributes a
         WHERE a.listing_id = l.id
           AND a.group_code IN ('imported_amenity', 'ic_mekan', 'dis_mekan')) AS amenity_attrs
FROM listings l
LEFT JOIN listing_holiday_home_details h ON h.listing_id = l.id
WHERE l.external_provider_code = 'birvillas'
  AND l.external_listing_ref IN (
    'tc97shkNcDvOfEPCKSVs', '40N1KtxyzUcj1AjNmo8e', 'Ohr7zRG8TXYfaJm2sBIg',
    'p32t5PQB7oycOmJ6jEXW', 'pfosunWEj7iQaf36WVbT'
  )
ORDER BY l.slug;
SQL

echo "[OK] Villa Bella 1–5 fiyat / müsaitlik / özellikler güncellendi."
