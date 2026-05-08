#!/usr/bin/env bash
# Tek standart SQL uygulama: travel-api ile *aynı* veritabanı bağlantısı.
#
# Sunucuda (deploy kökünden), örnek:
#   chmod +x deploy/apply-sql.sh
#   ./deploy/apply-sql.sh backend/priv/sql/modules/281_holiday_home_default_faq_tuscany_seed.sql
#
# Bağlantı (backend ile aynı — bkz. backend/src/backend/config.gleam):
#   Öncelik: DATABASE_URL
#   Yoksa: PGHOST, PGPORT, PGUSER, PGPASSWORD, PGDATABASE
#
# Ortam dosyası (varsayılan): /etc/rezervasyonyap/backend.env
# Override: TRAVEL_DB_ENV=/path/to.env ./deploy/apply-sql.sh ...
#
# Yerelde elle deneme: export DATABASE_URL=... veya TRAVEL_DB_ENV ayarlayın;
# Windows Laragon için PowerShell yolu: proje README / 00-project-overview.
set -euo pipefail

APP_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="${TRAVEL_DB_ENV:-/etc/rezervasyonyap/backend.env}"

fail() { echo "[FAIL] $*" >&2; exit 1; }

require_cmd() {
  command -v "$1" >/dev/null 2>&1 || fail "Eksik komut: $1"
}

require_cmd psql

if [[ -z "${1:-}" ]]; then
  fail "Kullanım: $0 <sql-dosyası-yolu>

Örnek (üretim, deploy kökü):
  cd /var/www/vhosts/rezervasyonyap.tr/httpdocs
  ./deploy/apply-sql.sh backend/priv/sql/modules/281_holiday_home_default_faq_tuscany_seed.sql"
fi
SQL_FILE_INPUT="$1"

resolve_sql_path() {
  local input="$1"
  if [[ -f "$input" ]]; then
    echo "$(cd "$(dirname "$input")" && pwd)/$(basename "$input")"
  elif [[ -f "$APP_ROOT/$input" ]]; then
    echo "$APP_ROOT/$input"
  else
    fail "SQL dosyası bulunamadı: $input (cwd: $(pwd))"
  fi
}

SQL_FILE="$(resolve_sql_path "$SQL_FILE_INPUT")"

loaded_env=0
if [[ -f "$ENV_FILE" ]]; then
  set -a
  # shellcheck disable=SC1090
  source "$ENV_FILE"
  set +a
  loaded_env=1
fi

if [[ "$loaded_env" -ne 1 ]] && [[ -z "${DATABASE_URL:-}" ]]; then
  fail "Sunucuda kimlik bilgisi yok. Önce: $ENV_FILE (travel-api ile aynı EnvironmentFile).
Yerel/CI: export DATABASE_URL=... veya TRAVEL_DB_ENV=/yol/backend.env ./deploy/apply-sql.sh ..."
fi

if [[ "$loaded_env" -eq 1 ]] && [[ -z "${DATABASE_URL:-}" ]] && [[ -z "${PGPASSWORD:-}${PGUSER:-}${PGHOST:-}${PGPORT:-}${PGDATABASE:-}" ]]; then
  fail "Ortam dosyasında veritabanı ayarı görünmüyor: $ENV_FILE
(Genelde DATABASE_URL veya PGHOST/PGUSER/PGPASSWORD/PGDATABASE — travel-api config ile uyumlu olmalı.)"
fi

if [[ -n "${DATABASE_URL:-}" ]]; then
  psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f "$SQL_FILE"
else
  export PGHOST="${PGHOST:-127.0.0.1}"
  export PGPORT="${PGPORT:-5432}"
  export PGUSER="${PGUSER:-postgres}"
  export PGDATABASE="${PGDATABASE:-travel}"
  psql -v ON_ERROR_STOP=1 -f "$SQL_FILE"
fi

echo "[OK] SQL uygulandı: $SQL_FILE"
