#!/usr/bin/env bash
# Tatilsepeti / Gezinomi gap — eksik kruvaziyer ilan import
#
#   chmod +x deploy/scripts/import-missing-gezinomi-cruises.sh
#   ./deploy/scripts/import-missing-gezinomi-cruises.sh --dry-run
#   ./deploy/scripts/import-missing-gezinomi-cruises.sh --published --tatilsepeti-gap
#   ./deploy/scripts/import-missing-gezinomi-cruises.sh --published
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

export GEIZINOMI_CRUISE_STATUS="${GEIZINOMI_CRUISE_STATUS:-published}"

echo "→ git $(git -C "$APP_ROOT" rev-parse --short HEAD 2>/dev/null || echo '?')"
echo "→ PostgreSQL bağlantı testi…"
node scripts/test-pg-env.mjs || exit 1

echo "→ Eksik Gezinomi cruise import…"
if [[ " $* " == *" --tatilsepeti-gap "* ]]; then
  echo "→ Tatilsepeti audit (cache yoksa çekilir)…"
  node scripts/audit-tatilsepeti-cruises.mjs || true
  node scripts/compare-tatilsepeti-cruises-cache.mjs || true
fi
node scripts/import-missing-gezinomi-cruises.mjs "$@"

if [[ " $* " != *" --dry-run "* ]]; then
  echo "→ vitrin_price tazeleme…"
  if [[ -x deploy/scripts/refresh-vitrin-prices.sh ]]; then
    ./deploy/scripts/refresh-vitrin-prices.sh || true
  fi
fi
