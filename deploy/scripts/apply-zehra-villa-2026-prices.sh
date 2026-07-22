#!/usr/bin/env bash
# Zehra Villa 2026 fiyat listesini üretim/yerel DB'ye uygular.
#
#   cd /var/www/vhosts/rezervasyonyap.tr/httpdocs
#   chmod +x deploy/scripts/apply-zehra-villa-2026-prices.sh
#   ./deploy/scripts/apply-zehra-villa-2026-prices.sh
#   ./deploy/scripts/apply-zehra-villa-2026-prices.sh --dry-run
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
# shellcheck source=deploy/scripts/lib/psql-env.sh
source "$APP_ROOT/deploy/scripts/lib/psql-env.sh"
load_travel_db_env

cd "$APP_ROOT"
chmod +x scripts/apply-zehra-villa-2026-prices.mjs 2>/dev/null || true

echo "[INFO] Zehra Villa 2026 fiyat uygulaması…"
node scripts/apply-zehra-villa-2026-prices.mjs "$@"

if [[ "${1:-}" != "--dry-run" ]]; then
  if [[ -x "$APP_ROOT/deploy/scripts/refresh-vitrin-prices.sh" ]]; then
    echo "[INFO] vitrin_price tazeleme…"
    "$APP_ROOT/deploy/scripts/refresh-vitrin-prices.sh" || echo "[WARN] refresh-vitrin-prices başarısız"
  fi
fi

echo "[OK] Bitti."
