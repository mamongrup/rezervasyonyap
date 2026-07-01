#!/usr/bin/env bash
# Excalibur (MariaDB bravo_spaces) → üretim PostgreSQL tatil evleri.
# Takvim, fiyat, meta günceller; sitede olmayan publish ilanları ekler.
#
# Önkoşul:
#   1) Dump sunucu MySQL'e yüklü (deploy/scripts/import-excalibur-mysql.sh)
#   2) /etc/rezervasyonyap/backend.env (PG*)
#   3) İsteğe bağlı: /etc/rezervasyonyap/excalibur-mysql.env (MYSQL_*)
#
# Kullanım (repo kökü):
#   chmod +x deploy/scripts/sync-excalibur-holiday-homes.sh
#   ./deploy/scripts/sync-excalibur-holiday-homes.sh
#   ./deploy/scripts/sync-excalibur-holiday-homes.sh --dry-run
#   ./deploy/scripts/sync-excalibur-holiday-homes.sh --skip-images
set -euo pipefail

APP_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
BACKEND_ENV="${TRAVEL_DB_ENV:-/etc/rezervasyonyap/backend.env}"
MYSQL_ENV="${EXCALIBUR_MYSQL_ENV:-/etc/rezervasyonyap/excalibur-mysql.env}"

fail() { echo "[FAIL] $*" >&2; exit 1; }

if [[ -f "$BACKEND_ENV" ]]; then
  set -a
  # shellcheck disable=SC1090
  source "$BACKEND_ENV"
  set +a
fi

if [[ -f "$MYSQL_ENV" ]]; then
  set -a
  # shellcheck disable=SC1090
  source "$MYSQL_ENV"
  set +a
fi

export MYSQL_HOST="${MYSQL_HOST:-127.0.0.1}"
export MYSQL_USER="${MYSQL_USER:-root}"
export MYSQL_PASSWORD="${MYSQL_PASSWORD:-}"
export MYSQL_DATABASE="${MYSQL_DATABASE:-rezervasyonyap}"

DRY_RUN=0
SKIP_IMAGES=0
EXTRA_ARGS=()
for arg in "$@"; do
  case "$arg" in
    --dry-run) DRY_RUN=1 ;;
    --skip-images) SKIP_IMAGES=1 ;;
    *) EXTRA_ARGS+=("$arg") ;;
  esac
done

cd "$APP_ROOT"

command -v mysql >/dev/null 2>&1 || fail "mysql istemcisi yok — önce dump import edin"

if [[ ! -d "$APP_ROOT/scripts/node_modules/pg" ]]; then
  echo "→ scripts bağımlılıkları (bir kez)…"
  (cd "$APP_ROOT/scripts" && npm install --no-audit --no-fund)
fi

MYSQL_ARGS=(-h "$MYSQL_HOST" -u "$MYSQL_USER")
if [[ -n "$MYSQL_PASSWORD" ]]; then
  MYSQL_ARGS+=(-p"$MYSQL_PASSWORD")
fi

echo "→ MySQL kaynak kontrolü ($MYSQL_DATABASE)…"
BRAVO_COUNT=$("${MYSQL_ARGS[@]}" "$MYSQL_DATABASE" -N -e \
  "SELECT COUNT(*) FROM bravo_spaces WHERE deleted_at IS NULL AND status='publish';" 2>/dev/null) \
  || fail "MySQL '$MYSQL_DATABASE' okunamadı. ./deploy/scripts/import-excalibur-mysql.sh <dump.sql>"
echo "  bravo_spaces (publish): $BRAVO_COUNT"

echo "→ PostgreSQL bağlantı testi…"
node scripts/test-pg-env.mjs || fail "PostgreSQL bağlantısı başarısız"

SYNC_ARGS=(scripts/sync-excalibur-bravo.mjs --mysql-database "$MYSQL_DATABASE")
IMPORT_ARGS=(scripts/import-bravo-spaces.mjs --mysql-database "$MYSQL_DATABASE" --create-missing-only)
[[ $DRY_RUN -eq 1 ]] && SYNC_ARGS+=(--dry-run) && IMPORT_ARGS+=(--dry-run)
[[ $SKIP_IMAGES -eq 1 ]] && IMPORT_ARGS+=(--skip-images)

echo "→ Mevcut ilanlar: takvim + fiyat sync…"
node "${SYNC_ARGS[@]}"

echo "→ Eksik publish ilanları ekle…"
node "${IMPORT_ARGS[@]}"

if [[ $DRY_RUN -eq 0 ]] && [[ -x "$APP_ROOT/deploy/scripts/warm-cache.sh" ]]; then
  echo "→ Vitrin önbelleği…"
  "$APP_ROOT/deploy/scripts/warm-cache.sh" tr || true
fi

echo "[OK] Excalibur tatil evi sync tamam."
