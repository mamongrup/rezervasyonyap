#!/usr/bin/env bash
# Üretim travel PostgreSQL dump (travel-api ile aynı backend.env).
#
# Sunucuda:
#   chmod +x deploy/scripts/export-travel-db.sh
#   ./deploy/scripts/export-travel-db.sh
#   ./deploy/scripts/export-travel-db.sh /tmp/travel-prod.dump
#
set -euo pipefail

OUT="${1:-/tmp/travel-prod-$(date +%Y%m%d-%H%M%S).dump}"
ENV_FILE="${TRAVEL_DB_ENV:-/etc/rezervasyonyap/backend.env}"

fail() { echo "[FAIL] $*" >&2; exit 1; }

command -v pg_dump >/dev/null 2>&1 || fail "pg_dump yok"

if [[ ! -f "$ENV_FILE" ]]; then
  fail "Ortam dosyası yok: $ENV_FILE"
fi

set -a
# shellcheck disable=SC1090
source "$ENV_FILE"
set +a

echo "[export] hedef: $OUT"

if [[ -n "${DATABASE_URL:-}" ]]; then
  pg_dump "$DATABASE_URL" -Fc --no-owner --no-acl -f "$OUT"
else
  export PGHOST="${PGHOST:-127.0.0.1}"
  export PGPORT="${PGPORT:-5432}"
  export PGUSER="${PGUSER:-postgres}"
  export PGDATABASE="${PGDATABASE:-travel}"
  pg_dump -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d "$PGDATABASE" -Fc --no-owner --no-acl -f "$OUT"
fi

bytes="$(wc -c < "$OUT" | tr -d ' ')"
echo "[OK] dump hazır: $OUT ($bytes byte)"
