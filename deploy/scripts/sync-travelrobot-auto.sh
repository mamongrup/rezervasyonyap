#!/usr/bin/env bash
# Travelrobot günlük senkron — tur + otel (incremental) + uçuş rotaları.
#
#   chmod +x deploy/scripts/sync-travelrobot-auto.sh
#   ./deploy/scripts/sync-travelrobot-auto.sh
#   ./deploy/scripts/sync-travelrobot-auto.sh --only tours
set -euo pipefail

APP_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
# shellcheck source=deploy/scripts/lib/load-env-file.sh
source "$APP_ROOT/deploy/scripts/lib/load-env-file.sh"
BACKEND_ENV="${TRAVEL_DB_ENV:-/etc/rezervasyonyap/backend.env}"

load_env_file "$BACKEND_ENV"
export INTERNAL_API_ORIGIN="${INTERNAL_API_ORIGIN:-http://127.0.0.1:8080}"

cd "$APP_ROOT"

if [[ ! -d "$APP_ROOT/scripts/node_modules/pg" ]]; then
  echo "→ scripts/npm install…"
  (cd "$APP_ROOT/scripts" && npm install --no-audit --no-fund)
fi

echo "→ Travelrobot ping…"
node scripts/sync-travelrobot-auto.mjs --ping

echo "→ Otomatik senkron…"
node scripts/sync-travelrobot-auto.mjs "$@"
