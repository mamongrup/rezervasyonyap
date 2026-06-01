#!/usr/bin/env bash
# Wtatil → yalnızca tur fiyatları (Pexels görselleri + published status korunur).
#
#   chmod +x deploy/scripts/sync-wtatil-tour-prices.sh
#   nohup ./deploy/scripts/sync-wtatil-tour-prices.sh > /tmp/wtatil-prices.log 2>&1 &
#   tail -f /tmp/wtatil-prices.log
set -euo pipefail

APP_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
# shellcheck source=deploy/scripts/lib/load-env-file.sh
source "$APP_ROOT/deploy/scripts/lib/load-env-file.sh"
BACKEND_ENV="${TRAVEL_DB_ENV:-/etc/rezervasyonyap/backend.env}"
WTATIL_ENV="${WTATIL_ENV_FILE:-/etc/rezervasyonyap/wtatil.env}"

load_env_file "$BACKEND_ENV"
load_env_file "$WTATIL_ENV"

for v in WTATIL_APPLICATION_SECRET_KEY WTATIL_USERNAME WTATIL_PASSWORD WTATIL_AGENCY_ID; do
  if [[ -z "${!v:-}" ]]; then
    echo "[FAIL] $v tanımlı değil — $WTATIL_ENV" >&2
    exit 1
  fi
done

cd "$APP_ROOT"

if [[ ! -d "$APP_ROOT/scripts/node_modules/pg" ]]; then
  echo "→ scripts/pg…"
  (cd "$APP_ROOT/scripts" && npm install --no-audit --no-fund)
fi

echo "→ Wtatil ping…"
node scripts/import-wtatil-tours.mjs --ping

echo "→ Fiyat senkronu (görsel/status dokunulmaz)…"
node scripts/sync-wtatil-tour-prices.mjs "$@"

echo "→ Vitrin örneği…"
curl -sS "http://127.0.0.1:8080/api/v1/catalog/public/listings?category_code=tour&per_page=2&locale=tr" | head -c 400
echo
