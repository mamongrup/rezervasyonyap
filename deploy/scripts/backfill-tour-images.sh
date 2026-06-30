#!/usr/bin/env bash
# Tur görselleri — önce Gezinomi (yüksek kalite), sonra Wtatil snapshot yedek.
#
#   ./deploy/scripts/import-gezinomi-tour-images.sh --few-only --skip-existing
#   ./deploy/scripts/backfill-tour-images.sh --missing-local-files
#
#   chmod +x deploy/scripts/backfill-tour-images.sh
#   ./deploy/scripts/backfill-tour-images.sh --dry-run --limit 5
#   ./deploy/scripts/backfill-tour-images.sh --missing-local-files
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

echo "→ PostgreSQL bağlantı testi…"
node scripts/test-pg-env.mjs || exit 1

echo "→ Wtatil snapshot / reserwation.com (eksik görseller)…"
node scripts/import-wtatil-snapshot-images.mjs "$@"

echo "→ Tamam."
