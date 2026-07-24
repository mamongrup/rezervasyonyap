#!/usr/bin/env bash
# Fethiye kuşağı + NG otelleri konum düzeltmesi (Bookeder mahalle adresleri).
#
# Örnek düzeltmeler:
#   Liberty/Akra/XO/Signa: Ölüdeniz/Karaçulha → Kargı
#   Sundia: Ölüdeniz → Çalış (Foça Mah.)
#   Lissiya: Ölüdeniz → Faralya
#   Exelans: Ölüdeniz → Taşyaka
#   Oyster: Çalış → Ölüdeniz
#   NG Sapanca: Sapanca → Kırkpınar
#
#   ./deploy/scripts/fix-imported-hotel-locations.sh
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
SQL_FILE="$APP_ROOT/deploy/scripts/sql/fix-imported-hotel-locations.sql"
FRONTEND_DIR="${FRONTEND_DIR:-$APP_ROOT/frontend}"

echo "============================================================"
echo " İmport otelleri konum düzeltmesi (19 ilan)"
echo "============================================================"

# shellcheck source=deploy/scripts/lib/psql-env.sh
source "$APP_ROOT/deploy/scripts/lib/psql-env.sh"

psql_travel -v ON_ERROR_STOP=1 -f "$SQL_FILE"

# Silence villa kategorisi de bu turda konum alır; kategori ayrı scriptte
if [[ -x "$APP_ROOT/deploy/scripts/fix-silence-villas-to-villa.sh" ]]; then
  echo "[INFO] Silence Villas villa kategorisi için:"
  echo "       ./deploy/scripts/fix-silence-villas-to-villa.sh"
fi

rm -f "$FRONTEND_DIR"/.next/cache/travel-public-listings/* 2>/dev/null || true
if [[ -x "$APP_ROOT/deploy/scripts/warm-cache.sh" ]]; then
  WEB_ORIGIN="${WEB_ORIGIN:-http://127.0.0.1:3000}" WARM_ROUNDS=1 \
    bash "$APP_ROOT/deploy/scripts/warm-cache.sh" || true
fi

echo "[OK] Konumlar güncellendi. Tarayıcıda Ctrl+F5."
