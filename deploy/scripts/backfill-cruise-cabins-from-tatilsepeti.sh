#!/usr/bin/env bash
# Gezinomi cruise ilanlarına Tatilsepeti eşleşmesiyle kabin/fiyat/detay doldurur.
#
#   chmod +x deploy/scripts/backfill-cruise-cabins-from-tatilsepeti.sh
#   ./deploy/scripts/backfill-cruise-cabins-from-tatilsepeti.sh --all
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
export TATILSEPETI_DELAY_MS="${TATILSEPETI_DELAY_MS:-500}"

echo "→ git $(git -C "$APP_ROOT" rev-parse --short HEAD 2>/dev/null || echo '?')"
node scripts/test-pg-env.mjs
node scripts/backfill-cruise-cabins-from-tatilsepeti.mjs "$@"
