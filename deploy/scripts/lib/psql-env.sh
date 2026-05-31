#!/usr/bin/env bash
# travel-api ile aynı DB ortamı — DATABASE_URL veya PGHOST/PGUSER/PGPASSWORD.
#   source deploy/scripts/lib/psql-env.sh
#   load_travel_db_env
#   psql_travel -v ON_ERROR_STOP=1 -c "SELECT 1"

load_travel_db_env() {
  TRAVEL_DB_ENV_FILE="${TRAVEL_DB_ENV:-/etc/rezervasyonyap/backend.env}"
  if [[ -f "$TRAVEL_DB_ENV_FILE" ]]; then
    set -a
    # shellcheck disable=SC1090
    source "$TRAVEL_DB_ENV_FILE"
    set +a
  fi
}

require_travel_db_env() {
  load_travel_db_env
  if [[ -n "${DATABASE_URL:-}" ]]; then
    return 0
  fi
  if [[ -n "${PGPASSWORD:-}" ]] || [[ -n "${PGUSER:-}" ]] || [[ -n "${PGHOST:-}" ]]; then
    export PGHOST="${PGHOST:-127.0.0.1}"
    export PGPORT="${PGPORT:-5432}"
    export PGUSER="${PGUSER:-postgres}"
    export PGDATABASE="${PGDATABASE:-travel}"
    return 0
  fi
  echo "[FAIL] DB ortamı yok. Önce: set -a && source ${TRAVEL_DB_ENV_FILE:-/etc/rezervasyonyap/backend.env} && set +a" >&2
  exit 1
}

psql_travel() {
  require_travel_db_env
  if [[ -n "${DATABASE_URL:-}" ]]; then
    psql "$DATABASE_URL" "$@"
  else
    psql "$@"
  fi
}
