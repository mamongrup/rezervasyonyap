#!/usr/bin/env bash
# Gezinomi cruise (kruvaziyer) ilan import — Wtatil görsel import ile paralel çalışabilir
#
#   chmod +x deploy/scripts/import-gezinomi-cruises.sh
#   ./deploy/scripts/import-gezinomi-cruises.sh --dry-run --limit 5
#   ./deploy/scripts/import-gezinomi-cruises.sh --category msc
#   ./deploy/scripts/import-gezinomi-cruises.sh --published
set -euo pipefail

APP_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
BACKEND_ENV="${TRAVEL_DB_ENV:-/etc/rezervasyonyap/backend.env}"

if [[ -f "$BACKEND_ENV" ]]; then
  set -a
  # shellcheck disable=SC1090
  source "$BACKEND_ENV"
  set +a
fi

cd "$APP_ROOT"

echo "→ git $(git -C "$APP_ROOT" rev-parse --short HEAD 2>/dev/null || echo '?')"
echo "→ PostgreSQL bağlantı testi…"
node scripts/test-pg-env.mjs || exit 1

echo "→ Gezinomi cruise import…"
node scripts/import-gezinomi-cruises.mjs "$@"
