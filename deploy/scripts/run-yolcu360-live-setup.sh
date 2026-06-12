#!/usr/bin/env bash
# Yolcu360 canlı kurulum: config + ping + araç import
#
#   chmod +x deploy/scripts/run-yolcu360-live-setup.sh
#   ./deploy/scripts/run-yolcu360-live-setup.sh
set -euo pipefail

APP_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
# shellcheck source=deploy/scripts/lib/load-env-file.sh
source "$APP_ROOT/deploy/scripts/lib/load-env-file.sh"
BACKEND_ENV="${TRAVEL_DB_ENV:-/etc/rezervasyonyap/backend.env}"

load_env_file "$BACKEND_ENV"
export INTERNAL_API_ORIGIN="${INTERNAL_API_ORIGIN:-http://127.0.0.1:8080}"

cd "$APP_ROOT"

if [[ ! -d "$APP_ROOT/scripts/node_modules/pg" ]]; then
  (cd "$APP_ROOT/scripts" && npm install --no-audit --no-fund)
fi

echo "══ 1/4 Config ══"
node scripts/apply-yolcu360-live-config.mjs

echo "══ 2/4 Zamanlayıcı (tüm provider'lar) ══"
node scripts/apply-import-schedule.mjs

echo "══ 3/4 Ping ══"
node scripts/ping-yolcu360.mjs

echo "══ 4/4 Araç import ══"
node scripts/import-yolcu360-cars.mjs

echo ""
echo "Tamam. Günlük: ./deploy/scripts/import-yolcu360-cars.sh"
echo "Timer: deploy/systemd/travel-yolcu360-sync.timer"
