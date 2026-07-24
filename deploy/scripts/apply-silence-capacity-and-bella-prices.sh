#!/usr/bin/env bash
# Silence Villas kapasite (misafir/oda/banyo) + Villa Bella 1–5 fiyat/takvim.
#
#   cd /var/www/vhosts/rezervasyonyap.tr/httpdocs
#   git fetch origin main && git reset --hard origin/main
#   chmod +x deploy/scripts/apply-silence-capacity-and-bella-prices.sh
#   ./deploy/scripts/apply-silence-capacity-and-bella-prices.sh
#
# Bella için canlı scrape (Node) tercih edilir; ağ yoksa: --sql-only
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
FRONTEND_DIR="${FRONTEND_DIR:-$APP_ROOT/frontend}"
SQL_ONLY=0
[[ "${1:-}" == "--sql-only" ]] && SQL_ONLY=1

cd "$APP_ROOT"
# shellcheck source=deploy/scripts/lib/psql-env.sh
source "$APP_ROOT/deploy/scripts/lib/psql-env.sh"
require_travel_db_env

echo "============================================================"
echo " 1) Silence Villas → kapasite meta (6 misafir / 2 oda / 2 banyo)"
echo "============================================================"
psql_travel -v ON_ERROR_STOP=1 -f "$APP_ROOT/deploy/scripts/sql/fix-silence-villas-to-holiday-home.sql"

echo ""
echo "============================================================"
echo " 2) Villa Bella 1–5 → fiyat + takvim (Birvillas)"
echo "============================================================"
if [[ "$SQL_ONLY" -eq 1 ]]; then
  "$APP_ROOT/deploy/apply-sql.sh" "$APP_ROOT/deploy/scripts/sql/update-villa-bella-live.sql"
else
  # Canlı scrape + DB yaz + refresh_listing_vitrin_prices
  bash "$APP_ROOT/deploy/scripts/update-villa-bella-collection.sh"
fi

echo ""
echo "============================================================"
echo " 3) Doğrulama"
echo "============================================================"
psql_travel -v ON_ERROR_STOP=1 <<'SQL'
SELECT 'silence' AS grp,
  l.slug,
  la.value_json->>'max_guests' AS max_guests,
  la.value_json->>'room_count' AS room_count,
  la.value_json->>'bath_count' AS bath_count,
  l.vitrin_price::text AS vitrin
FROM listings l
LEFT JOIN listing_attributes la
  ON la.listing_id = l.id AND la.group_code = 'listing_meta' AND la.key = 'v1'
WHERE l.slug = 'silence-villas'
UNION ALL
SELECT 'bella',
  l.slug,
  la.value_json->>'max_guests',
  la.value_json->>'room_count',
  la.value_json->>'bath_count',
  l.vitrin_price::text
FROM listings l
LEFT JOIN listing_attributes la
  ON la.listing_id = l.id AND la.group_code = 'listing_meta' AND la.key = 'v1'
WHERE l.slug LIKE 'villa-bella-%islamlar'
ORDER BY 1, 2;
SQL

echo ""
echo "[4/4] Next fetch-cache (tatil evleri kartları)..."
rm -rf "$FRONTEND_DIR/.next/cache/fetch-cache" 2>/dev/null || true
if systemctl is-active --quiet travel-web.service 2>/dev/null; then
  systemctl restart travel-web.service || true
  sleep 4
fi
curl -sS -o /dev/null -w "tatil-evleri:%{http_code}\n" \
  "${WEB_ORIGIN:-http://127.0.0.1:3000}/tatil-evleri/all" || true

echo ""
echo "[OK] Silence kapasite + Bella fiyat/takvim uygulandı."
echo "     Tarayıcıda Ctrl+Shift+R ile /tatil-evleri/all yenileyin."
