#!/usr/bin/env bash
# Wtatil ↔ site otomatik senkron (dönem replace + fiyat + sınırlı yeni tur).
#
#   chmod +x deploy/scripts/sync-wtatil-auto.sh
#   ./deploy/scripts/sync-wtatil-auto.sh
#
# Günlük zamanlayıcı:
#   sudo cp deploy/systemd/travel-wtatil-sync.{service,timer} /etc/systemd/system/
#   sudo systemctl daemon-reload
#   sudo systemctl enable --now travel-wtatil-sync.timer
set -euo pipefail

APP_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
# shellcheck source=deploy/scripts/lib/load-env-file.sh
source "$APP_ROOT/deploy/scripts/lib/load-env-file.sh"
BACKEND_ENV="${TRAVEL_DB_ENV:-/etc/rezervasyonyap/backend.env}"
WTATIL_ENV="${WTATIL_ENV_FILE:-/etc/rezervasyonyap/wtatil.env}"

load_env_file "$BACKEND_ENV"
load_env_file "$WTATIL_ENV"

export WTATIL_STATUS="${WTATIL_STATUS:-published}"

for v in WTATIL_APPLICATION_SECRET_KEY WTATIL_USERNAME WTATIL_PASSWORD; do
  if [[ -z "${!v:-}" ]]; then
    echo "[FAIL] $v tanımlı değil — $WTATIL_ENV" >&2
    exit 1
  fi
done

if [[ -z "${WTATIL_AGENCY_ID:-}" ]]; then
  echo "[WARN] WTATIL_AGENCY_ID yok — search-tour / ek dönemler sınırlı kalır." >&2
fi

cd "$APP_ROOT"

if [[ ! -d "$APP_ROOT/scripts/node_modules/pg" ]]; then
  echo "→ scripts/pg…"
  (cd "$APP_ROOT/scripts" && npm install --no-audit --no-fund)
fi

echo "→ Wtatil ping…"
node scripts/sync-wtatil-auto.mjs --ping

echo "→ Otomatik senkron (dönem+fiyat+yeni tur)…"
node scripts/sync-wtatil-auto.mjs "$@"

echo "→ Vitrin fiyat önbelleği tazeleniyor (yeni turlar hemen görünür/sıralanır)…"
"$APP_ROOT/deploy/scripts/refresh-vitrin-prices.sh" || echo "[WARN] vitrin_price tazeleme atlandı"

echo "→ Vitrin örneği…"
curl -sS "http://127.0.0.1:8080/api/v1/catalog/public/listings?category_code=tour&limit=2&locale=tr" | head -c 400
echo
