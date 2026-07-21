#!/usr/bin/env bash
# Silence Villas: otel → villa (holiday_home) + bölge Kargı.
#
# DİKKAT: deploy.sh / reconcile-core-listings.sh BUNU YAPMAZ.
# Yalnızca bu script kategoriyi ve konumu düzeltir.
#
#   cd /var/www/vhosts/rezervasyonyap.tr/httpdocs
#   git fetch origin main && git reset --hard origin/main
#   chmod +x deploy/scripts/fix-silence-villas-to-villa.sh
#   ./deploy/scripts/fix-silence-villas-to-villa.sh
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
SQL_FILE="$APP_ROOT/deploy/scripts/sql/fix-silence-villas-to-holiday-home.sql"
FRONTEND_DIR="${FRONTEND_DIR:-$APP_ROOT/frontend}"

echo "============================================================"
echo " Silence Villas düzeltmesi (otel → villa, Kayaköy → Kargı)"
echo "============================================================"

if [[ ! -f "$SQL_FILE" ]]; then
  echo "[FAIL] SQL yok: $SQL_FILE — önce: git fetch origin main && git reset --hard origin/main" >&2
  exit 1
fi

# shellcheck source=deploy/scripts/lib/psql-env.sh
source "$APP_ROOT/deploy/scripts/lib/psql-env.sh"

echo "[1/3] DB güncelleniyor..."
psql_travel -v ON_ERROR_STOP=1 -f "$SQL_FILE"

echo "[2/3] Doğrulama..."
psql_travel -v ON_ERROR_STOP=1 <<'SQL'
SELECT
  pc.code AS kategori,
  l.status,
  l.location_name AS konum,
  la.value_json->>'district_label' AS ilce,
  la.value_json->>'property_type' AS tip,
  l.slug
FROM listings l
JOIN product_categories pc ON pc.id = l.category_id
LEFT JOIN listing_attributes la
  ON la.listing_id = l.id AND la.group_code = 'listing_meta' AND la.key = 'v1'
WHERE l.slug = 'silence-villas'
   OR (l.external_provider_code = 'tatilbudur' AND l.external_listing_ref = 'silence-villas');
SQL

echo "[3/3] Vitrin önbelleği (eski /otel/silence-villas kartı kalmasın)..."
# ISR/fetch snapshot — agresif değil, yalnız silence + ana sayfa ısıtması
rm -f "$FRONTEND_DIR"/.next/cache/travel-public-listings/*silence* 2>/dev/null || true
if [[ -x "$APP_ROOT/deploy/scripts/warm-cache.sh" ]]; then
  WEB_ORIGIN="${WEB_ORIGIN:-http://127.0.0.1:3000}" \
    WARM_ROUNDS=1 \
    bash "$APP_ROOT/deploy/scripts/warm-cache.sh" || true
fi
# Detay URL'lerini de ısıt (yeni path)
curl -sS -o /dev/null -w "tatil-evi:%{http_code}\n" \
  "${WEB_ORIGIN:-http://127.0.0.1:3000}/tatil-evi/silence-villas" || true
curl -sS -o /dev/null -w "otel-eski:%{http_code}\n" \
  "${WEB_ORIGIN:-http://127.0.0.1:3000}/otel/silence-villas" || true

echo ""
echo "[OK] Silence Villas → Villa + Kargı."
echo "     Kart: Villa | Konum: Kargı, Fethiye | URL: /tatil-evi/silence-villas"
echo "     Tarayıcıda Ctrl+F5 ile yenileyin."
echo "[INFO] AI: ./deploy/scripts/ensure-ai-social-workers.sh"
