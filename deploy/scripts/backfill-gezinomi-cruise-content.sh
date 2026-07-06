#!/usr/bin/env bash
# Gezinomi cruise — program/açıklama backfill
#
#   chmod +x deploy/scripts/backfill-gezinomi-cruise-content.sh
#   ./deploy/scripts/backfill-gezinomi-cruise-content.sh
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
export GEIZINOMI_DELAY_MS="${GEIZINOMI_DELAY_MS:-400}"

echo "→ git $(git -C "$APP_ROOT" rev-parse --short HEAD 2>/dev/null || echo '?')"
node scripts/test-pg-env.mjs
node scripts/backfill-gezinomi-cruise-content.mjs "$@"
