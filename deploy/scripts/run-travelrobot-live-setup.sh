#!/usr/bin/env bash
# Canlı Travelrobot ilk kurulum + tur/uçuş import + zamanlayıcı.
#
#   chmod +x deploy/scripts/run-travelrobot-live-setup.sh
#   ./deploy/scripts/run-travelrobot-live-setup.sh
#   ./deploy/scripts/run-travelrobot-live-setup.sh --skip-import
set -euo pipefail

APP_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
# shellcheck source=deploy/scripts/lib/load-env-file.sh
source "$APP_ROOT/deploy/scripts/lib/load-env-file.sh"
BACKEND_ENV="${TRAVEL_DB_ENV:-/etc/rezervasyonyap/backend.env}"

load_env_file "$BACKEND_ENV"
export INTERNAL_API_ORIGIN="${INTERNAL_API_ORIGIN:-http://127.0.0.1:8080}"

SKIP_IMPORT=0
for arg in "$@"; do
  [[ "$arg" == "--skip-import" ]] && SKIP_IMPORT=1
done

cd "$APP_ROOT"

if [[ ! -d "$APP_ROOT/scripts/node_modules/pg" ]]; then
  (cd "$APP_ROOT/scripts" && npm install --no-audit --no-fund)
fi

echo "══ 1/5 Config (booking + statik + import bayrakları) ══"
node scripts/apply-travelrobot-live-config.mjs

echo "══ 2/5 Import zamanlayıcı (UTC saatler) ══"
node scripts/apply-import-schedule.mjs

echo "══ 3/5 Bağlantı testi ══"
node scripts/ping-travelrobot-live.mjs

if [[ "$SKIP_IMPORT" -eq 1 ]]; then
  echo "══ Import atlandı (--skip-import) ══"
  exit 0
fi

echo "══ 4/5 Tur import ══"
node scripts/import-travelrobot-tours.mjs

echo "══ 5/5 Uçuş import (rota listesi) ══"
node scripts/import-travelrobot-flights.mjs

echo ""
echo "Tamam. Otel zaten import edildiyse enrich gerekmez."
echo "Günlük senkron: ./deploy/scripts/sync-travelrobot-auto.sh"
echo "Zamanlayıcı: sudo cp deploy/systemd/travel-travelrobot-sync.* /etc/systemd/system/ && sudo systemctl enable --now travel-travelrobot-sync.timer"
