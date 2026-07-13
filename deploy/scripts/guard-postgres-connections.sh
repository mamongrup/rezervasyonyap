#!/usr/bin/env bash
# PostgreSQL bağlantı slotları dolmadan Travel API bağlantılarını otomatik iyileştirir.
# Yalnızca application_name=travel_api* bağlantılarına müdahale eder; Plesk ve diğer
# uygulamaların bağlantılarını sonlandırmaz.

set -euo pipefail

APP_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
source "$APP_ROOT/deploy/scripts/lib/psql-env.sh"

fail() { echo "[FAIL] $*" >&2; exit 1; }
ok() { echo "[OK] $*"; }
warn() { echo "[WARN] $*" >&2; }

command -v psql >/dev/null 2>&1 || fail "psql bulunamadı"

PERCENT="${TRAVEL_DB_CONN_PERCENT:-75}"
IDLE_MIN_SECONDS="${TRAVEL_DB_IDLE_MIN_SECONDS:-45}"
ACTIVE_MIN_SECONDS="${TRAVEL_DB_ACTIVE_MIN_SECONDS:-45}"
APP_PREFIX="${TRAVEL_DB_GUARD_APPLICATION_PREFIX:-travel_api}"
APP_EXACT="${TRAVEL_DB_GUARD_APPLICATION_EXACT:-nonode@nohost}"
APP_THRESHOLD="${TRAVEL_DB_APP_CONN_THRESHOLD:-20}"

for value in "$PERCENT" "$IDLE_MIN_SECONDS" "$ACTIVE_MIN_SECONDS" "$APP_THRESHOLD"; do
  case "$value" in ''|*[!0-9]*) fail "Guard ayarları sayısal olmalı" ;; esac
done
[[ "$PERCENT" -ge 20 && "$PERCENT" -le 95 ]] || fail "TRAVEL_DB_CONN_PERCENT 20-95 olmalı"

load_travel_db_env

PSQL_MODE="app"
CONNECT_DB="${TRAVEL_DB_GUARD_DATABASE:-postgres}"
if command -v sudo >/dev/null 2>&1 && sudo -n -u postgres psql -d "$CONNECT_DB" -tA -c "select 1" >/dev/null 2>&1; then
  PSQL_MODE="sudo"
elif command -v runuser >/dev/null 2>&1 && runuser -u postgres -- psql -d "$CONNECT_DB" -tA -c "select 1" >/dev/null 2>&1; then
  PSQL_MODE="runuser"
fi

psql_guard() {
  case "$PSQL_MODE" in
    sudo) sudo -u postgres psql -d "$CONNECT_DB" "$@" ;;
    runuser) runuser -u postgres -- psql -d "$CONNECT_DB" "$@" ;;
    *) psql_travel "$@" ;;
  esac
}

PREFIX_SQL="${APP_PREFIX//\'/\'\'}"
EXACT_SQL="${APP_EXACT//\'/\'\'}"
read -r TOTAL MAX_CONN RESERVED <<<"$(psql_guard -tA -F ' ' -v ON_ERROR_STOP=1 -c \
  "select count(*)::int, current_setting('max_connections')::int, current_setting('superuser_reserved_connections')::int from pg_stat_activity")"

USABLE=$((MAX_CONN - RESERVED))
THRESHOLD=$((USABLE * PERCENT / 100))
[[ "$THRESHOLD" -ge 1 ]] || THRESHOLD=1

APP_TOTAL="$(psql_guard -tA -v ON_ERROR_STOP=1 -c \
  "select count(*)::int from pg_stat_activity where application_name like '${PREFIX_SQL}%' or application_name = '${EXACT_SQL}'")"
ok "PostgreSQL guard: total=$TOTAL usable=$USABLE global_threshold=$THRESHOLD travel=$APP_TOTAL travel_threshold=$APP_THRESHOLD mode=$PSQL_MODE"

if [[ "$TOTAL" -lt "$THRESHOLD" && "$APP_TOTAL" -le "$APP_THRESHOLD" ]]; then
  exit 0
fi

warn "Bağlantı kullanımı %${PERCENT} eşiğinde; eski Travel bağlantıları iyileştiriliyor."

# Önce boştaki ve yarım transaction bağlantılarını kapat. Havuz ihtiyaç halinde
# kontrollü biçimde yeniden bağlanır.
IDLE_TERMINATED="$(psql_guard -tA -v ON_ERROR_STOP=1 -c "
select count(*)::int from (
  select pg_terminate_backend(pid)
  from pg_stat_activity
  where pid <> pg_backend_pid()
    and (application_name like '${PREFIX_SQL}%' or application_name = '${EXACT_SQL}')
    and backend_type = 'client backend'
    and state in ('idle', 'idle in transaction', 'idle in transaction (aborted)')
    and now() - state_change > make_interval(secs => $IDLE_MIN_SECONDS)
) x")"

# Uzun sorguyu önce nazikçe iptal et; API havuzu bağlantıyı yeniden kullanabilir.
ACTIVE_CANCELLED="$(psql_guard -tA -v ON_ERROR_STOP=1 -c "
select count(*)::int from (
  select pg_cancel_backend(pid)
  from pg_stat_activity
  where pid <> pg_backend_pid()
    and (application_name like '${PREFIX_SQL}%' or application_name = '${EXACT_SQL}')
    and backend_type = 'client backend'
    and state = 'active'
    and now() - query_start > make_interval(secs => $ACTIVE_MIN_SECONDS)
) x")"

AFTER="$(psql_guard -tA -v ON_ERROR_STOP=1 -c "select count(*)::int from pg_stat_activity")"
ok "PostgreSQL guard tamam: idle_terminated=$IDLE_TERMINATED active_cancelled=$ACTIVE_CANCELLED total_after=$AFTER"
