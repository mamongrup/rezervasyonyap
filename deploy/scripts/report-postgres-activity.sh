#!/usr/bin/env bash
# PostgreSQL bağlantı/sorgu teşhisi. Hiçbir bağlantıyı sonlandırmaz.
#
# Sunucuda:
#   ./deploy/scripts/report-postgres-activity.sh
#   TRAVEL_DB_REPORT_MIN_SECONDS=30 ./deploy/scripts/report-postgres-activity.sh

set -euo pipefail

APP_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

# shellcheck source=deploy/scripts/lib/psql-env.sh
source "$APP_ROOT/deploy/scripts/lib/psql-env.sh"

fail() { echo "[FAIL] $*" >&2; exit 1; }
section() { echo; echo "== $* =="; }
warn() { echo "[WARN] $*" >&2; }

command -v psql >/dev/null 2>&1 || fail "psql bulunamadı"

MIN_SECONDS="${TRAVEL_DB_REPORT_MIN_SECONDS:-30}"
case "$MIN_SECONDS" in
  ''|*[!0-9]*) fail "TRAVEL_DB_REPORT_MIN_SECONDS sayısal olmalı: $MIN_SECONDS" ;;
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

CONNECT_DB="${TRAVEL_DB_GUARD_DATABASE:-postgres}"
PSQL_MODE=""

if command -v sudo >/dev/null 2>&1 && sudo -n -u postgres psql -d "$CONNECT_DB" -tA -c "select 1" >/dev/null 2>&1; then
  PSQL_MODE="sudo"
elif command -v runuser >/dev/null 2>&1 && runuser -u postgres -- psql -d "$CONNECT_DB" -tA -c "select 1" >/dev/null 2>&1; then
  PSQL_MODE="runuser"
else
  PSQL_MODE="app"
fi

psql_report() {
  if [[ "$PSQL_MODE" == "sudo" ]]; then
    sudo -u postgres psql -d "$CONNECT_DB" "$@"
  elif [[ "$PSQL_MODE" == "runuser" ]]; then
    runuser -u postgres -- psql -d "$CONNECT_DB" "$@"
  else
    psql_travel "$@"
  fi
}

DB_USER_SQL="$(sql_quote "$DB_USER")"
DB_NAME_SQL="$(sql_quote "$DB_NAME")"
DB_FILTER_SQL=""

if [[ -n "$DB_NAME" ]]; then
  DB_EXISTS="$(psql_report -tA -v ON_ERROR_STOP=1 -c "select exists(select 1 from pg_database where datname = '$DB_NAME_SQL')" | tr -d '[:space:]' || true)"
  if [[ "$DB_EXISTS" == "t" || "$DB_EXISTS" == "true" ]]; then
    DB_FILTER_SQL="and datname = '$DB_NAME_SQL'"
  else
    warn "DB adı '$DB_NAME' bulunamadı; rapor user='$DB_USER' filtresiyle çalışacak."
  fi
fi

section "Rapor ayarları"
echo "mode=$PSQL_MODE connect_db=$CONNECT_DB app_db=${DB_NAME:-?} app_user=${DB_USER:-?} min_seconds=$MIN_SECONDS"

section "Bağlantı özeti"
psql_report -v ON_ERROR_STOP=1 -c "
select datname, usename, state, wait_event_type, wait_event, count(*)::int
from pg_stat_activity
group by 1,2,3,4,5
order by count(*) desc, datname nulls last, usename nulls last;
"

section "Uygulama kullanıcısı bağlantı sayısı"
psql_report -v ON_ERROR_STOP=1 -c "
select count(*)::int as total,
       count(*) filter (where state = 'active')::int as active,
       count(*) filter (where state = 'idle')::int as idle,
       count(*) filter (where wait_event_type is not null)::int as waiting
from pg_stat_activity
where usename = '$DB_USER_SQL' $DB_FILTER_SQL;
"

section "${MIN_SECONDS}s üstü aktif sorgular"
psql_report -v ON_ERROR_STOP=1 -c "
select pid,
       datname,
       usename,
       state,
       wait_event_type,
       wait_event,
       now() - query_start as age,
       left(regexp_replace(query, '\s+', ' ', 'g'), 180) as query
from pg_stat_activity
where usename = '$DB_USER_SQL'
  $DB_FILTER_SQL
  and state = 'active'
  and now() - query_start > make_interval(secs => $MIN_SECONDS)
order by query_start asc
limit 40;
"

section "Bloklanan / bloklayan sorgular"
psql_report -v ON_ERROR_STOP=1 -c "
select blocked.pid as blocked_pid,
       blocked.usename as blocked_user,
       now() - blocked.query_start as blocked_age,
       blocker.pid as blocker_pid,
       blocker.usename as blocker_user,
       now() - blocker.query_start as blocker_age,
       left(regexp_replace(blocked.query, '\s+', ' ', 'g'), 120) as blocked_query,
       left(regexp_replace(blocker.query, '\s+', ' ', 'g'), 120) as blocker_query
from pg_stat_activity blocked
join pg_locks blocked_locks on blocked_locks.pid = blocked.pid and not blocked_locks.granted
join pg_locks blocker_locks
  on blocker_locks.locktype = blocked_locks.locktype
 and blocker_locks.database is not distinct from blocked_locks.database
 and blocker_locks.relation is not distinct from blocked_locks.relation
 and blocker_locks.page is not distinct from blocked_locks.page
 and blocker_locks.tuple is not distinct from blocked_locks.tuple
 and blocker_locks.virtualxid is not distinct from blocked_locks.virtualxid
 and blocker_locks.transactionid is not distinct from blocked_locks.transactionid
 and blocker_locks.classid is not distinct from blocked_locks.classid
 and blocker_locks.objid is not distinct from blocked_locks.objid
 and blocker_locks.objsubid is not distinct from blocked_locks.objsubid
 and blocker_locks.pid <> blocked_locks.pid
join pg_stat_activity blocker on blocker.pid = blocker_locks.pid
where blocked.usename = '$DB_USER_SQL' or blocker.usename = '$DB_USER_SQL'
order by blocked.query_start asc
limit 20;
"

section "Veritabanları"
psql_report -v ON_ERROR_STOP=1 -c "
select datname, pg_size_pretty(pg_database_size(datname)) as size
from pg_database
where datistemplate = false
order by pg_database_size(datname) desc;
"
