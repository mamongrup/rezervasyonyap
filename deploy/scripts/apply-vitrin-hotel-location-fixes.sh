#!/usr/bin/env bash
# Kart + detay konumları ve Silence Villas villa dönüşümü.
# DB düzeltmesi + Next önbellek temizliği + travel-web restart.
#
#   cd /var/www/vhosts/rezervasyonyap.tr/httpdocs
#   git fetch origin main && git reset --hard origin/main
#   chmod +x deploy/scripts/apply-vitrin-hotel-location-fixes.sh
#   ./deploy/scripts/apply-vitrin-hotel-location-fixes.sh
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
FRONTEND_DIR="${FRONTEND_DIR:-$APP_ROOT/frontend}"
WEB_ORIGIN="${WEB_ORIGIN:-http://127.0.0.1:3000}"
API_ORIGIN="${API_ORIGIN:-http://127.0.0.1:8080}"

cd "$APP_ROOT"

# shellcheck source=deploy/scripts/lib/psql-env.sh
source "$APP_ROOT/deploy/scripts/lib/psql-env.sh"

echo "============================================================"
echo " 1) Konum SQL"
echo "============================================================"
psql_travel -v ON_ERROR_STOP=1 -f "$APP_ROOT/deploy/scripts/sql/fix-imported-hotel-locations.sql"

echo "============================================================"
echo " 2) Silence Villas → villa"
echo "============================================================"
psql_travel -v ON_ERROR_STOP=1 -f "$APP_ROOT/deploy/scripts/sql/fix-silence-villas-to-holiday-home.sql"

echo "============================================================"
echo " 3) DB doğrulama (kartların okuduğu listing_meta)"
echo "============================================================"
psql_travel -v ON_ERROR_STOP=1 <<'SQL'
SELECT
  l.external_listing_ref AS ref,
  pc.code AS kategori,
  l.location_name,
  la.value_json->>'district_label' AS meta_ilce,
  la.value_json->>'city' AS meta_sehir,
  la.value_json->>'property_type' AS meta_tip,
  -- Kartta görünen birleşim (API ile aynı sıra: city, district, province)
  concat_ws(', ',
    nullif(trim(la.value_json->>'city'), ''),
    nullif(trim(la.value_json->>'district_label'), ''),
    nullif(trim(la.value_json->>'province_city'), '')
  ) AS kart_konum
FROM listings l
JOIN product_categories pc ON pc.id = l.category_id
LEFT JOIN listing_attributes la
  ON la.listing_id = l.id AND la.group_code = 'listing_meta' AND la.key = 'v1'
WHERE l.external_provider_code = 'tatilbudur'
  AND l.external_listing_ref IN (
    'silence-villas','liberty-fabay','liberty-signa','akra-fethiye-tui-blue-sensatori',
    'akra-fethiye-the-residence-tui-blue-sensatori','xo-cape-arnna-fethiye',
    'sundia-exclusive-by-liberty-fethiye','lissiya-hotel','exelans-hotel-spa',
    'oyster-residences','ng-sapanca'
  )
ORDER BY l.external_listing_ref;
SQL

echo "============================================================"
echo " 4) Next önbellek temizliği (kart ISR / resilient snapshot)"
echo "============================================================"
rm -rf "$FRONTEND_DIR/.next/cache/travel-public-listings" 2>/dev/null || true
rm -rf "$FRONTEND_DIR/.next/cache/fetch-cache" 2>/dev/null || true
mkdir -p "$FRONTEND_DIR/.next/cache/travel-public-listings"

if systemctl is-active --quiet travel-web.service 2>/dev/null; then
  echo "[INFO] travel-web restart (route cache boşalsın)"
  systemctl restart travel-web.service
  sleep 6
else
  echo "[WARN] travel-web.service aktif değil — restart atlandı"
fi

echo "============================================================"
echo " 5) API smoke (canlı veri)"
echo "============================================================"
# Silence villa kategoride mi?
curl -sS "${API_ORIGIN}/api/v1/catalog/public/listings?category_code=holiday_home&q=silence&limit=5" \
  | head -c 400 || true
echo ""
curl -sS "${API_ORIGIN}/api/v1/catalog/public/listings?category_code=hotel&q=silence&limit=5" \
  | head -c 400 || true
echo ""

if [[ -x "$APP_ROOT/deploy/scripts/warm-cache.sh" ]]; then
  echo "============================================================"
  echo " 6) warm-cache"
  echo "============================================================"
  WEB_ORIGIN="$WEB_ORIGIN" WARM_ROUNDS=1 bash "$APP_ROOT/deploy/scripts/warm-cache.sh" || true
fi

echo ""
echo "[OK] Bitti."
echo "  Silence: kategori=holiday_home, tip=villa, ilçe=Kargı, URL=/tatil-evi/silence-villas"
echo "  Kart konumları listing_meta üzerinden (city, district, province)."
echo "  Tarayıcı: Ctrl+Shift+R (sert yenile)."
