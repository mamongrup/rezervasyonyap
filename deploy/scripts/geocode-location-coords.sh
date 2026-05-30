#!/usr/bin/env bash
# Lokasyon koordinatları — Google Geocoding ile toplu doldurma.
#
# Önkoşul: Yönetim → Ayarlar → Google Maps API anahtarı kayıtlı
#   veya GOOGLE_MAPS_API_KEY ortam değişkeni.
#
#   chmod +x deploy/scripts/geocode-location-coords.sh
#   ./deploy/scripts/geocode-location-coords.sh --dry-run --limit 5
#   ./deploy/scripts/geocode-location-coords.sh --only districts
#   ./deploy/scripts/geocode-location-coords.sh
#
# SQL (turizm beldeleri + hiyerarşi senkronu) — geocode öncesi/sonrası:
#   ./deploy/apply-sql.sh backend/priv/sql/modules/301_tourism_destination_coords.sql
#   ./deploy/apply-sql.sh backend/priv/sql/modules/302_sync_hierarchy_coords.sql
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

if [[ ! -d "$APP_ROOT/frontend/node_modules/pg" ]]; then
  echo "→ frontend/node_modules eksik — pg için npm ci (production)…"
  (cd "$APP_ROOT/frontend" && npm ci --omit=dev 2>/dev/null || npm ci)
fi

echo "→ PostgreSQL bağlantı testi…"
node scripts/test-pg-env.mjs || exit 1

echo "→ Turizm belde koordinatları (301)…"
if [[ -f "$BACKEND_ENV" ]] || [[ -n "${DATABASE_URL:-}" ]]; then
  ./deploy/apply-sql.sh backend/priv/sql/modules/301_tourism_destination_coords.sql || true
fi

echo "→ Lokasyon geocode…"
node scripts/geocode-location-coords.mjs "$@"

echo "→ Hiyerarşi senkronu (302)…"
./deploy/apply-sql.sh backend/priv/sql/modules/302_sync_hierarchy_coords.sql

echo "→ Tamam."
