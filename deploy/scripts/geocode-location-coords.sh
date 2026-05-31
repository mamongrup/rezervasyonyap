#!/usr/bin/env bash
# Lokasyon koordinatları — Google Geocoding ile toplu doldurma.
# npm/pg gerekmez — yalnızca psql.
set -euo pipefail

APP_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
# shellcheck disable=SC1091
source "$APP_ROOT/deploy/scripts/lib/psql-env.sh"

command -v psql >/dev/null 2>&1 || { echo "[FAIL] psql bulunamadı"; exit 1; }
command -v node >/dev/null 2>&1 || { echo "[FAIL] node bulunamadı"; exit 1; }

cd "$APP_ROOT"

echo "→ PostgreSQL bağlantı testi…"
DBINFO=$(psql_travel -v ON_ERROR_STOP=1 -t -A -c "SELECT current_database() || ' user=' || current_user")
echo "[OK] PostgreSQL: $DBINFO"

echo "→ Turizm belde koordinatları (301)…"
./deploy/apply-sql.sh backend/priv/sql/modules/301_tourism_destination_coords.sql || true

echo "→ Lokasyon geocode…"
node scripts/geocode-location-coords.mjs "$@"

echo "→ Hiyerarşi senkronu (302)…"
./deploy/apply-sql.sh backend/priv/sql/modules/302_sync_hierarchy_coords.sql

echo "→ Tamam."
