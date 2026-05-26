#!/usr/bin/env bash
# Turna uçak rota ilanları — backend.env + turna.env
#
# turna.env örneği:
#   TURNA_BASE_URL=https://api.turna.com
#   TURNA_API_KEY=...
#   TURNA_STATUS=published
#
#   chmod +x deploy/scripts/import-turna-flights.sh
#   ./deploy/scripts/import-turna-flights.sh --ping
#   ./deploy/scripts/import-turna-flights.sh --limit 3
set -euo pipefail

APP_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
BACKEND_ENV="${TRAVEL_DB_ENV:-/etc/rezervasyonyap/backend.env}"
TURNA_ENV="${TURNA_ENV_FILE:-/etc/rezervasyonyap/turna.env}"

if [[ -f "$BACKEND_ENV" ]]; then
  set -a
  # shellcheck disable=SC1090
  source "$BACKEND_ENV"
  set +a
fi

if [[ -f "$TURNA_ENV" ]]; then
  set -a
  # shellcheck disable=SC1090
  source "$TURNA_ENV"
  set +a
else
  echo "[FAIL] $TURNA_ENV bulunamadı (TURNA_API_KEY, TURNA_BASE_URL)." >&2
  exit 1
fi

if [[ -z "${TURNA_API_KEY:-}" ]]; then
  echo "[FAIL] TURNA_API_KEY tanımlı değil ($TURNA_ENV)." >&2
  exit 1
fi

export TURNA_BASE_URL="${TURNA_BASE_URL:-https://api.turna.com}"
export TURNA_STATUS="${TURNA_STATUS:-published}"

cd "$APP_ROOT"

echo "→ PostgreSQL bağlantı testi…"
node scripts/test-pg-env.mjs || exit 1

echo "→ Turna import (base=$TURNA_BASE_URL)…"
node scripts/import-turna-flights.mjs "$@"
