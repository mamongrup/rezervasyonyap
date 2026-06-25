#!/usr/bin/env bash
# travel-api restart/deploy sonrası biriken orphan PostgreSQL bağlantılarını temizler.
#
# Varsayılan davranış:
# - travel-api ile aynı DB kullanıcısını tespit eder.
# - Bağlantı sayısı eşik altındaysa yalnız raporlar.
# - Eşik üstündeyse aynı kullanıcının idle ve eski bağlantılarını sonlandırır.
#
# Örnek:
#   ./deploy/scripts/guard-postgres-connections.sh
#   TRAVEL_DB_CONN_THRESHOLD=30 TRAVEL_DB_IDLE_MIN_SECONDS=20 ./deploy/scripts/guard-postgres-connections.sh

set -euo pipefail

APP_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

# shellcheck source=deploy/scripts/lib/psql-env.sh
source "$APP_ROOT/deploy/scripts/lib/psql-env.sh"

fail() { echo "[FAIL] $*" >&2; exit 1; }
ok() { echo "[OK] $*"; }
warn() { echo "[WARN] $*" >&2; }

command -v psql >/dev/null 2>&1 || fail "psql bulunamadı"

THRESHOLD="${TRAVEL_DB_CONN_THRESHOLD:-30}"
IDLE_MIN_SECONDS="${TRAVEL_DB_IDLE_MIN_SECONDS:-20}"

case "$THRESHOLD" in
  ''|*[!0-9]*) fail "TRAVEL_DB_CONN_THRESHOLD sayısal olmalı: $THRESHOLD" ;;
esac
case "$IDLE_MIN_SECONDS" in
  ''|*[!0-9]*) fail "TRAVEL_DB_IDLE_MIN_SECONDS sayısal olmalı: $IDLE_MIN_SECONDS" ;;
esac

load_travel_db_env

db_user_from_url() {
  local url="$1"
  printf '%s' "$url" | sed -E 's#^[a-zA-Z0-9+.-]+://([^:/@?]+).*#\1#'
}

db_name_from_url() {
  local url="$1"
  local no_query="${url%%\?*}"
  printf '%s' "$no_query" | sed -E 's#^.*/([^/?]+)$#\1#'
}

sql_quote() {
  printf "%s" "$1" | sed "s/'/''/g"
}

DB_USER="${TRAVEL_DB_APP_USER:-}"
DB_NAME="${TRAVEL_DB_APP_DATABASE:-}"

if [[ -z "$DB_USER" && -n "${DATABASE_URL:-}" ]]; then
  DB_USER="$(db_user_from_url "$DATABASE_URL")"
fi
if [[ -z "$DB_NAME" && -n "${DATABASE_URL:-}" ]]; then
  DB_NAME="$(db_name_from_url "$DATABASE_URL")"
fi
DB_USER="${DB_USER:-${PGUSER:-}}"
DB_NAME="${DB_NAME:-${PGDATABASE:-}}"

# Son çare: normal bağlantı mümkünse app kullanıcısından öğren.
if [[ -z "$DB_USER" ]]; then
  DB_USER="$(psql_travel -tA -v ON_ERROR_STOP=1 -c "select current_user" | tr -d '[:space:]')"
fi
if [[ -z "$DB_NAME" ]]; then
  DB_NAME="$(psql_travel -tA -v ON_ERROR_STOP=1 -c "select current_database()" | tr -d '[:space:]')"
fi

if [[ -z "$DB_USER" || -z "$DB_NAME" ]]; then
  fail "DB kullanıcı/veritabanı tespit edilemedi"
fi

PSQL_MODE="app"

psql_guard() {
  if [[ "$PSQL_MODE" == "postgres-sudo" ]]; then
    sudo -u postgres psql -d "$DB_NAME" "$@"
  elif [[ "$PSQL_MODE" == "postgres-runuser" ]]; then
    runuser -u postgres -- psql -d "$DB_NAME" "$@"
  else
    psql_travel "$@"
  fi
}

if command -v sudo >/dev/null 2>&1 && sudo -n -u postgres psql -d "$DB_NAME" -tA -c "select 1" >/dev/null 2>&1; then
  PSQL_MODE="postgres-sudo"
elif command -v runuser >/dev/null 2>&1 && runuser -u postgres -- psql -d "$DB_NAME" -tA -c "select 1" >/dev/null 2>&1; then
  PSQL_MODE="postgres-runuser"
fi

DB_USER_SQL="$(sql_quote "$DB_USER")"
DB_NAME_SQL="$(sql_quote "$DB_NAME")"

TOTAL="$(psql_guard -tA -v ON_ERROR_STOP=1 -c "select count(*)::int from pg_stat_activity where usename = '$DB_USER_SQL' and datname = '$DB_NAME_SQL'" | tr -d '[:space:]')"
IDLE_OLD="$(psql_guard -tA -v ON_ERROR_STOP=1 -c "select count(*)::int from pg_stat_activity where usename = '$DB_USER_SQL' and datname = '$DB_NAME_SQL' and pid <> pg_backend_pid() and state = 'idle' and now() - state_change > make_interval(secs => $IDLE_MIN_SECONDS)" | tr -d '[:space:]')"

ok "PostgreSQL bağlantı durumu: mode=$PSQL_MODE db=$DB_NAME user=$DB_USER total=$TOTAL idle_old=${IDLE_OLD} threshold=$THRESHOLD"

if [[ "$TOTAL" -le "$THRESHOLD" ]]; then
  exit 0
fi

warn "Bağlantı sayısı eşik üstünde; eski idle bağlantılar sonlandırılıyor."

TERMINATED="$(psql_guard -tA -v ON_ERROR_STOP=1 -c "select count(*)::int from (select pg_terminate_backend(pid) from pg_stat_activity where usename = '$DB_USER_SQL' and datname = '$DB_NAME_SQL' and pid <> pg_backend_pid() and state = 'idle' and now() - state_change > make_interval(secs => $IDLE_MIN_SECONDS)) x" | tr -d '[:space:]')"
AFTER="$(psql_guard -tA -v ON_ERROR_STOP=1 -c "select count(*)::int from pg_stat_activity where usename = '$DB_USER_SQL' and datname = '$DB_NAME_SQL'" | tr -d '[:space:]')"

ok "PostgreSQL idle bağlantı temizliği: terminated=$TERMINATED remaining=$AFTER"

if [[ "$AFTER" -gt "$THRESHOLD" ]]; then
  warn "Bağlantı sayısı hâlâ yüksek. Aktif bağlantılar veya farklı kullanıcılar olabilir; pg_stat_activity inceleyin."
fi
