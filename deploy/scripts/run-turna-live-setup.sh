#!/usr/bin/env bash
# Turna canlı kurulum: config + ping + uçuş rota import
#
#   chmod +x deploy/scripts/run-turna-live-setup.sh
#   ./deploy/scripts/run-turna-live-setup.sh
#   ./deploy/scripts/run-turna-live-setup.sh --skip-import
set -euo pipefail

APP_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
# shellcheck source=deploy/scripts/lib/load-env-file.sh
source "$APP_ROOT/deploy/scripts/lib/load-env-file.sh"
BACKEND_ENV="${TRAVEL_DB_ENV:-/etc/rezervasyonyap/backend.env}"
TURNA_ENV="${TURNA_ENV_FILE:-/etc/rezervasyonyap/turna.env}"

load_env_file "$BACKEND_ENV"
if [[ -f "$TURNA_ENV" ]]; then
  load_env_file "$TURNA_ENV"
fi

export INTERNAL_API_ORIGIN="${INTERNAL_API_ORIGIN:-http://127.0.0.1:8080}"

SKIP_IMPORT=0
for arg in "$@"; do
  [[ "$arg" == "--skip-import" ]] && SKIP_IMPORT=1
done

cd "$APP_ROOT"

if [[ ! -d "$APP_ROOT/scripts/node_modules/pg" ]]; then
  (cd "$APP_ROOT/scripts" && npm install --no-audit --no-fund)
fi

echo "══ 1/4 Config ══"
node scripts/apply-turna-live-config.mjs

echo "══ 2/4 Import zamanlayıcı (UTC saatler) ══"
node scripts/apply-import-schedule.mjs

echo "══ 3/4 Ping ══"
node scripts/ping-turna.mjs

if [[ "$SKIP_IMPORT" -eq 1 ]]; then
  echo "══ Import atlandı (--skip-import) ══"
  exit 0
fi

echo "══ 4/4 Uçuş rota import (246 rota, ~birkaç dk) ══"
node scripts/import-turna-flights.mjs

echo ""
echo "Tamam. Günlük: ./deploy/scripts/import-turna-flights.sh"
echo "Zamanlayıcı: travel-import-scheduler.timer (IMPORT_SCHEDULE_TURNA, varsayılan UTC 04:00)"
