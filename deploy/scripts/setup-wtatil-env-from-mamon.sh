#!/usr/bin/env bash
# Eski mamon.com.tr (Booking Core) MySQL → /etc/rezervasyonyap/wtatil.env
# Yalnızca Wtatil API giriş bilgileri; tur içeriği Wtatil API'den çekilir.
#
# Önkoşul — Plesk MySQL bilgileri (mamon DB):
#   export MAMON_DB_HOST=127.0.0.1
#   export MAMON_DB_USER=...
#   export MAMON_DB_PASSWORD=...
#   export MAMON_DB_NAME=...
#
#   chmod +x deploy/scripts/setup-wtatil-env-from-mamon.sh
#   ./deploy/scripts/setup-wtatil-env-from-mamon.sh
set -euo pipefail

APP_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
OUT="${WTATIL_ENV_OUT:-/etc/rezervasyonyap/wtatil.env}"
TMP="$(mktemp /tmp/wtatil.env.XXXXXX)"

cd "$APP_ROOT"

if [[ ! -d "$APP_ROOT/scripts/node_modules/pg" ]]; then
  echo "→ scripts/pg kurulumu…"
  (cd "$APP_ROOT/scripts" && npm install --no-audit --no-fund)
fi

node scripts/read-wtatil-creds-from-mamon-db.mjs --write-env "$TMP"

if [[ ! -s "$TMP" ]]; then
  echo "[FAIL] wtatil.env üretilemedi — MAMON_DB_* ve core_settings kontrol edin." >&2
  exit 1
fi

# Yalnızca KEY=value satırları (yanlışlıkla yapıştırılmış chmod/cp satırları gitmesin)
grep -E '^[A-Za-z_][A-Za-z0-9_]*=' "$TMP" | grep -v '^#' > "${TMP}.clean" || true
if [[ ! -s "${TMP}.clean" ]]; then
  echo "[FAIL] Temiz env satırı yok." >&2
  exit 1
fi
grep -q '^WTATIL_STATUS=' "${TMP}.clean" || echo 'WTATIL_STATUS=published' >> "${TMP}.clean"

install -m 600 "${TMP}.clean" "$OUT"
rm -f "$TMP" "${TMP}.clean"

echo "[OK] $OUT yazıldı (600). Test:"
echo "    set -a && source /etc/rezervasyonyap/backend.env && source $OUT && set +a"
echo "    node scripts/import-wtatil-tours.mjs --ping"
