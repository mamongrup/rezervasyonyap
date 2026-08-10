#!/usr/bin/env bash
set -euo pipefail

APP_ROOT="${TRAVEL_ROOT:-$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)}"
BACKEND_ENV="${TRAVEL_DB_ENV:-/etc/rezervasyonyap/backend.env}"

if [[ -f "$BACKEND_ENV" ]]; then
  set -a
  # shellcheck disable=SC1090
  source "$BACKEND_ENV"
  set +a
fi

cd "$APP_ROOT"
node scripts/test-pg-env.mjs
exec node scripts/import-clubmed-hotels.mjs "$@"
