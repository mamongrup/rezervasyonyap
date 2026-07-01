#!/usr/bin/env bash
# Excalibur phpMyAdmin dump → sunucu MariaDB/MySQL.
#
# Örnek (repo kökü, dump /tmp altında):
#   chmod +x deploy/scripts/import-excalibur-mysql.sh
#   ./deploy/scripts/import-excalibur-mysql.sh /tmp/rezervasyonyapco_excalibur.sql
#
# Ortam (isteğe bağlı /etc/rezervasyonyap/excalibur-mysql.env):
#   MYSQL_HOST=127.0.0.1
#   MYSQL_USER=...
#   MYSQL_PASSWORD=...
#   MYSQL_DATABASE=rezervasyonyap
set -euo pipefail

APP_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
MYSQL_ENV="${EXCALIBUR_MYSQL_ENV:-/etc/rezervasyonyap/excalibur-mysql.env}"
SQL_FILE="${1:-}"

fail() { echo "[FAIL] $*" >&2; exit 1; }

[[ -n "$SQL_FILE" ]] || fail "Kullanım: $0 <dump.sql>"
[[ -f "$SQL_FILE" ]] || fail "Dosya yok: $SQL_FILE"

if [[ -f "$MYSQL_ENV" ]]; then
  set -a
  # shellcheck disable=SC1090
  source "$MYSQL_ENV"
  set +a
fi

MYSQL_HOST="${MYSQL_HOST:-127.0.0.1}"
MYSQL_USER="${MYSQL_USER:-root}"
MYSQL_PASSWORD="${MYSQL_PASSWORD:-}"
MYSQL_DATABASE="${MYSQL_DATABASE:-rezervasyonyap}"

command -v mysql >/dev/null 2>&1 || fail "mysql istemcisi bulunamadı (MariaDB client kurulu olmalı)"

MYSQL_ARGS=(-h "$MYSQL_HOST" -u "$MYSQL_USER")
if [[ -n "$MYSQL_PASSWORD" ]]; then
  MYSQL_ARGS+=(-p"$MYSQL_PASSWORD")
fi

echo "→ Veritabanı: $MYSQL_DATABASE @ $MYSQL_HOST"
echo "→ Eski tablolar temizleniyor (DROP + CREATE)…"
"${MYSQL_ARGS[@]}" -e \
  "DROP DATABASE IF EXISTS \`${MYSQL_DATABASE}\`; CREATE DATABASE \`${MYSQL_DATABASE}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"

echo "→ İçe aktarılıyor (büyük dosya, birkaç dakika)…"
"${MYSQL_ARGS[@]}" "$MYSQL_DATABASE" <"$SQL_FILE"

COUNT=$("${MYSQL_ARGS[@]}" "$MYSQL_DATABASE" -N -e \
  "SELECT COUNT(*) FROM bravo_spaces WHERE deleted_at IS NULL AND status='publish';")
echo "[OK] bravo_spaces publish: $COUNT"
echo "Sonra: ./deploy/scripts/sync-excalibur-holiday-homes.sh"
