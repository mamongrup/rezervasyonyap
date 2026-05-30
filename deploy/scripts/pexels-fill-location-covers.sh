#!/usr/bin/env bash
# Pexels → location_pages (kapak + gallery_json). Panel alternatifi.
#
#   chmod +x deploy/scripts/pexels-fill-location-covers.sh
#   ./deploy/scripts/pexels-fill-location-covers.sh --dry-run --limit 3
#   ./deploy/scripts/pexels-fill-location-covers.sh --limit 100
#   ./deploy/scripts/pexels-fill-location-covers.sh
set -euo pipefail

APP_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
BACKEND_ENV="${TRAVEL_DB_ENV:-/etc/rezervasyonyap/backend.env}"

if [[ -f "$BACKEND_ENV" ]]; then
  set -a
  # shellcheck disable=SC1090
  source "$BACKEND_ENV"
  set +a
fi

cd "$APP_ROOT"

if [[ ! -d "$APP_ROOT/scripts/node_modules/pg" ]]; then
  echo "→ scripts/node_modules/pg yok — npm install (scripts/)…"
  (cd "$APP_ROOT/scripts" && npm install --omit=dev)
fi

node scripts/test-pg-env.mjs
node scripts/pexels-fill-location-covers.mjs "$@"
