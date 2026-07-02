#!/usr/bin/env bash
# Tatilsepeti gemi/cruise scrape import
#
#   chmod +x deploy/scripts/import-tatilsepeti-cruises.sh
#   ./deploy/scripts/import-tatilsepeti-cruises.sh --dry-run --limit 3
#   ./deploy/scripts/import-tatilsepeti-cruises.sh --published --only-missing
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

export TATILSEPETI_CRUISE_STATUS="${TATILSEPETI_CRUISE_STATUS:-published}"

echo "→ git $(git -C "$APP_ROOT" rev-parse --short HEAD 2>/dev/null || echo '?')"
echo "→ PostgreSQL bağlantı testi…"
node scripts/test-pg-env.mjs || exit 1

echo "→ Tatilsepeti cruise import…"
node scripts/import-tatilsepeti-cruises.mjs "$@"

if [[ " $* " != *" --dry-run "* ]]; then
  echo "→ vitrin_price tazeleme…"
  if [[ -x deploy/scripts/refresh-vitrin-prices.sh ]]; then
    ./deploy/scripts/refresh-vitrin-prices.sh || true
  fi
fi
