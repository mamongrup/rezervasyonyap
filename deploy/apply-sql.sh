#!/usr/bin/env bash
# Tek standart SQL uygulama: travel-api ile *aynı* veritabanı bağlantısı.
#
# Sunucuda (deploy kökünden), örnek:
#   chmod +x deploy/apply-sql.sh
#   ./deploy/apply-sql.sh backend/priv/sql/modules/281_holiday_home_default_faq_tuscany_seed.sql
#   ./deploy/apply-sql.sh -c "SELECT refresh_listing_vitrin_prices();"
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
  fail "Kullanım: $0 <sql-dosyası-yolu> | -c <sql>

Örnek (üretim, deploy kökü):
  cd /var/www/vhosts/rezervasyonyap.tr/httpdocs
  ./deploy/apply-sql.sh backend/priv/sql/modules/281_holiday_home_default_faq_tuscany_seed.sql
  ./deploy/apply-sql.sh -c \"SELECT refresh_listing_vitrin_prices();\""
fi
SQL_MODE="file"
SQL_FILE_INPUT="$1"
SQL_COMMAND=""

if [[ "$SQL_FILE_INPUT" == "-c" || "$SQL_FILE_INPUT" == "--command" ]]; then
  SQL_MODE="command"
  SQL_COMMAND="${2:-}"
  [[ -n "$SQL_COMMAND" ]] || fail "-c için SQL komutu gerekli"
fi

resolve_sql_path() {
  local input="$1"
  if [[ -f "$input" ]]; then
    echo "$(cd "$(dirname "$input")" && pwd)/$(basename "$input")"
  elif [[ -f "$APP_ROOT/$input" ]]; then
    echo "$APP_ROOT/$input"
  else
    # Fallback: backend/priv/ → backend/priv_data/ (sunucuda symlink yoksa)
    local alt="$(echo "$input" | sed 's|backend/priv/sql/|backend/priv_data/sql/|')"
    if [[ -f "$APP_ROOT/$alt" ]]; then
      echo "$APP_ROOT/$alt"
    else
      fail "SQL dosyası bulunamadı: $input (cwd: $(pwd))\nİpucu: priv_data yolunu deneyin — ./deploy/apply-sql.sh $alt"
    fi
  fi
}

if [[ "$SQL_MODE" == "file" ]]; then
  SQL_FILE="$(resolve_sql_path "$SQL_FILE_INPUT")"
fi

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
  PSQL=(psql "$DATABASE_URL" -v ON_ERROR_STOP=1)
else
  export PGHOST="${PGHOST:-127.0.0.1}"
  export PGPORT="${PGPORT:-5432}"
  export PGUSER="${PGUSER:-postgres}"
  export PGDATABASE="${PGDATABASE:-travel}"
  PSQL=(psql -v ON_ERROR_STOP=1)
fi

# Toplu bakım (görsel URL vb.): AI trigger enqueue kilidini atla (app.ai_apply=1).
# Örnek: APPLY_SQL_SKIP_AI_ENQUEUE=1 ./deploy/apply-sql.sh modules/387_....sql
PREAMBLE=""
if [[ "${APPLY_SQL_SKIP_AI_ENQUEUE:-0}" == "1" ]]; then
  PREAMBLE="SELECT set_config('app.ai_apply', '1', false);"
fi

if [[ "$SQL_MODE" == "command" ]]; then
  if [[ -n "$PREAMBLE" ]]; then
    "${PSQL[@]}" -c "$PREAMBLE" -c "$SQL_COMMAND"
  else
    "${PSQL[@]}" -c "$SQL_COMMAND"
  fi
else
  if [[ -n "$PREAMBLE" ]]; then
    {
      echo "$PREAMBLE"
      cat "$SQL_FILE"
    } | "${PSQL[@]}" -f -
  else
    "${PSQL[@]}" -f "$SQL_FILE"
  fi
fi

if [[ "$SQL_MODE" == "command" ]]; then
  echo "[OK] SQL komutu uygulandı"
else
  echo "[OK] SQL uygulandı: $SQL_FILE"
fi
