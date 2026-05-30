#!/usr/bin/env bash
# Wtatil snapshot görselleri — backend.env
#
#   chmod +x deploy/scripts/import-wtatil-snapshot-images.sh
#   ./deploy/scripts/import-wtatil-snapshot-images.sh --missing-local-files
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
node scripts/test-pg-env.mjs || exit 1
node scripts/import-wtatil-snapshot-images.mjs "$@"
