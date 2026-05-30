#!/usr/bin/env bash
# Pexels → location_pages (kapak + gallery_json). npm/pg gerekmez — yalnızca psql.
#
#   chmod +x deploy/scripts/pexels-fill-location-covers.sh
#   ./deploy/scripts/pexels-fill-location-covers.sh --dry-run --limit 3
#   ./deploy/scripts/pexels-fill-location-covers.sh --limit 100
#   ./deploy/scripts/pexels-fill-location-covers.sh
set -euo pipefail

APP_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
BACKEND_ENV="${TRAVEL_DB_ENV:-/etc/rezervasyonyap/backend.env}"

command -v psql >/dev/null 2>&1 || { echo "[FAIL] psql bulunamadı"; exit 1; }
command -v node >/dev/null 2>&1 || { echo "[FAIL] node bulunamadı"; exit 1; }

if [[ -f "$BACKEND_ENV" ]]; then
  set -a
  # shellcheck disable=SC1090
  source "$BACKEND_ENV"
  set +a
fi

cd "$APP_ROOT"

echo "→ PostgreSQL bağlantı testi…"
DBINFO=$(psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -t -A -c "SELECT current_database() || ' user=' || current_user")
echo "[OK] PostgreSQL: $DBINFO"

node scripts/pexels-fill-location-covers.mjs "$@"
