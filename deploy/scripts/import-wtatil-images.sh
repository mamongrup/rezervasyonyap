#!/usr/bin/env bash
# Wtatil tur görselleri — backend.env + isteğe bağlı wtatil.env
#
#   chmod +x deploy/scripts/import-wtatil-images.sh
#   ./deploy/scripts/import-wtatil-images.sh --skip-existing
#   ./deploy/scripts/import-wtatil-images.sh --limit 20
set -euo pipefail

APP_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
BACKEND_ENV="${TRAVEL_DB_ENV:-/etc/rezervasyonyap/backend.env}"
WTATIL_ENV="${WTATIL_ENV_FILE:-/etc/rezervasyonyap/wtatil.env}"

if [[ -f "$BACKEND_ENV" ]]; then
  set -a
  # shellcheck disable=SC1090
  source "$BACKEND_ENV"
  set +a
fi

if [[ -f "$WTATIL_ENV" ]]; then
  set -a
  # shellcheck disable=SC1090
  source "$WTATIL_ENV"
  set +a
fi

cd "$APP_ROOT"

echo "→ PostgreSQL bağlantı testi…"
node scripts/test-pg-env.mjs || exit 1

echo "→ Wtatil görseller…"
node scripts/import-wtatil-images.mjs "$@"
