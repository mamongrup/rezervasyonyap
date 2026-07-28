#!/usr/bin/env bash
# Tatilbudur izinli partner feed'i -> otel, oda, fiyat ve özellik aktarımı.
set -euo pipefail

APP_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
BACKEND_ENV="${TRAVEL_DB_ENV:-/etc/rezervasyonyap/backend.env}"

# Caller'ın verdiği listing status'ü env source ezmesin
_PRESERVE_TB_STATUS="${TATILBUDUR_LISTING_STATUS-}"
if [[ -f "$BACKEND_ENV" ]]; then
  set -a
  # shellcheck disable=SC1090
  source "$BACKEND_ENV"
  set +a
fi
if [[ -n "${_PRESERVE_TB_STATUS}" ]]; then
  export TATILBUDUR_LISTING_STATUS="${_PRESERVE_TB_STATUS}"
fi

cd "$APP_ROOT"
mkdir -p backups
node scripts/test-pg-env.mjs
node scripts/import-tatilbudur-hotels.mjs "$@"
"$APP_ROOT/deploy/scripts/refresh-vitrin-prices.sh" 2>/dev/null \
  || echo "[WARN] vitrin_price yenilemesi atlandı"
