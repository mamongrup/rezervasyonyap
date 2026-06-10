#!/usr/bin/env bash
# Yolcu360 araç kiralama import
#
#   chmod +x deploy/scripts/import-yolcu360-cars.sh
#   ./deploy/scripts/import-yolcu360-cars.sh --ping
#   ./deploy/scripts/import-yolcu360-cars.sh --dry-run --limit 2
#   ./deploy/scripts/import-yolcu360-cars.sh
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

node scripts/import-yolcu360-cars.mjs "$@"
