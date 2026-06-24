#!/usr/bin/env bash
# Wtatil turlarını üretim DB'ye aktarır (published).
#
# Önkoşul: /etc/rezervasyonyap/backend.env (DATABASE_URL)
#           WTATIL_* ortam değişkenleri (aşağıdaki dosya veya export)
#
# Kullanım (repo kökü):
#   chmod +x deploy/scripts/import-wtatil-published.sh
#   ./deploy/scripts/import-wtatil-published.sh --limit 50
#   ./deploy/scripts/import-wtatil-published.sh
set -euo pipefail

APP_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
BACKEND_ENV="${TRAVEL_DB_ENV:-/etc/rezervasyonyap/backend.env}"
WTATIL_ENV="${WTATIL_ENV_FILE:-/etc/rezervasyonyap/wtatil.env}"

if [[ -f "$BACKEND_ENV" ]]; then
  set -a
  # shellcheck disable=SC1090
  source "$BACKEND_ENV"
  set +a
fi

if [[ -f "$WTATIL_ENV" ]]; then
  set -a
  # shellcheck disable=SC1090
  source "$WTATIL_ENV"
  set +a
fi

export WTATIL_STATUS="${WTATIL_STATUS:-published}"

for v in WTATIL_APPLICATION_SECRET_KEY WTATIL_USERNAME WTATIL_PASSWORD; do
  if [[ -z "${!v:-}" ]]; then
    echo "[FAIL] $v tanımlı değil. $WTATIL_ENV oluşturun veya export edin." >&2
    exit 1
  fi
done

cd "$APP_ROOT"

if [[ ! -d "$APP_ROOT/scripts/node_modules/pg" ]]; then
  echo "→ scripts/pg bağımlılığı (bir kez)…"
  (cd "$APP_ROOT/scripts" && npm install --no-audit --no-fund)
fi

echo "→ PostgreSQL bağlantı testi…"
node scripts/test-pg-env.mjs || exit 1

echo "→ Wtatil ping…"
node scripts/import-wtatil-tours.mjs --ping

echo "→ Tur import…"
IMPORT_ARGS=("$@")
if [[ " ${IMPORT_ARGS[*]} " != *" --full "* && " ${IMPORT_ARGS[*]} " != *" --enrich "* && " ${IMPORT_ARGS[*]} " != *" --prices "* ]]; then
  IMPORT_ARGS=(--full "${IMPORT_ARGS[@]}")
fi
node scripts/import-wtatil-tours.mjs "${IMPORT_ARGS[@]}"

echo "→ Vitrin fiyat önbelleği tazeleniyor (yeni turlar hemen görünür/sıralanır)…"
"$APP_ROOT/deploy/scripts/refresh-vitrin-prices.sh" || echo "[WARN] vitrin_price tazeleme atlandı"

echo "→ Vitrin kontrolü…"
curl -sS "http://127.0.0.1:8080/api/v1/catalog/public/listings?category_code=tour&limit=1&locale=tr" | head -c 200
echo
