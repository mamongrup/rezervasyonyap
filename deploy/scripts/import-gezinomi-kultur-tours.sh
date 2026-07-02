#!/usr/bin/env bash
# Gezinomi kültür tur ilan import
#
#   chmod +x deploy/scripts/import-gezinomi-kultur-tours.sh
#   ./deploy/scripts/import-gezinomi-kultur-tours.sh --dry-run --limit 5
#   ./deploy/scripts/import-gezinomi-kultur-tours.sh --category kapadokya
#   ./deploy/scripts/import-gezinomi-kultur-tours.sh --published
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

echo "→ git $(git -C "$APP_ROOT" rev-parse --short HEAD 2>/dev/null || echo '?')"
echo "→ PostgreSQL bağlantı testi…"
node scripts/test-pg-env.mjs || exit 1

echo "→ Gezinomi kültür tur import…"
node scripts/import-gezinomi-kultur-tours.mjs "$@"

if [[ " $* " != *" --dry-run "* ]]; then
  echo "→ vitrin_price tazeleme…"
  "$APP_ROOT/deploy/scripts/refresh-vitrin-prices.sh" 2>/dev/null || \
    "$APP_ROOT/deploy/apply-sql.sh" backend/priv/sql/maintenance/refresh_vitrin_prices.sql
fi
