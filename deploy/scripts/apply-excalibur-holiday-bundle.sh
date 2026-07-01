#!/usr/bin/env bash
# Excalibur tatil evi bundle → üretim PostgreSQL (MariaDB GEREKMEZ).
#
# Önkoşul: PC'den export edilen .json.gz sunucuya yüklü.
#
#   chmod +x deploy/scripts/apply-excalibur-holiday-bundle.sh
#   ./deploy/scripts/apply-excalibur-holiday-bundle.sh
#   ./deploy/scripts/apply-excalibur-holiday-bundle.sh backups/excalibur-holiday-1.7.26.json.gz
set -euo pipefail

APP_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
BACKEND_ENV="${TRAVEL_DB_ENV:-/etc/rezervasyonyap/backend.env}"
DEFAULT_BUNDLE="${EXCALIBUR_BUNDLE:-$APP_ROOT/backups/excalibur-holiday-1.7.26.json.gz}"
BUNDLE="${1:-$DEFAULT_BUNDLE}"

fail() { echo "[FAIL] $*" >&2; exit 1; }

[[ -f "$BUNDLE" ]] || fail "Dosya yok: $BUNDLE (Plesk → httpdocs/backups/ altına yükleyin)"

if [[ -f "$BACKEND_ENV" ]]; then
  set -a
  # shellcheck disable=SC1090
  source "$BACKEND_ENV"
  set +a
fi

cd "$APP_ROOT"

if [[ ! -d "$APP_ROOT/scripts/node_modules/pg" ]]; then
  echo "→ scripts bağımlılıkları…"
  (cd "$APP_ROOT/scripts" && npm install --no-audit --no-fund)
fi

echo "→ PostgreSQL bağlantı testi…"
node scripts/test-pg-env.mjs || fail "PostgreSQL bağlantısı başarısız"

echo "→ Bundle import (takvim + fiyat + ilanlar)…"
node scripts/import-excalibur-holiday-bundle.mjs "$BUNDLE"

if [[ -x "$APP_ROOT/deploy/scripts/warm-cache.sh" ]]; then
  echo "→ Vitrin önbelleği…"
  "$APP_ROOT/deploy/scripts/warm-cache.sh" tr || true
fi

echo "[OK] Excalibur tatil evi bundle uygulandı (PostgreSQL travel)."
