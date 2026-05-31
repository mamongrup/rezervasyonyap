#!/usr/bin/env bash
# Lokasyon koordinatları — Google Geocoding ile toplu doldurma.
# npm/pg gerekmez — yalnızca psql.
#
# Önkoşul: Yönetim → Ayarlar → Google Maps API anahtarı
#   veya GOOGLE_MAPS_API_KEY ortam değişkeni.
#
#   chmod +x deploy/scripts/geocode-location-coords.sh
#   ./deploy/scripts/geocode-location-coords.sh --dry-run --limit 5
#   ./deploy/scripts/geocode-location-coords.sh --only districts
#   ./deploy/scripts/geocode-location-coords.sh
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

echo "→ Turizm belde koordinatları (301)…"
./deploy/apply-sql.sh backend/priv/sql/modules/301_tourism_destination_coords.sql || true

echo "→ Lokasyon geocode…"
node scripts/geocode-location-coords.mjs "$@"

echo "→ Hiyerarşi senkronu (302)…"
./deploy/apply-sql.sh backend/priv/sql/modules/302_sync_hierarchy_coords.sql

echo "→ Tamam."
