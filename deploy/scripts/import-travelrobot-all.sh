#!/usr/bin/env bash
# Travelrobot (KPlus) tur / otel / uçak import — kimlik bilgileri site_settings.listing_api_providers
#
# Panel: Yönetim → İlan API sağlayıcıları → Travelrobot
# Sandbox IP whitelist: KPlus'a sunucu çıkış IP'sini bildirin.
#
#   chmod +x deploy/scripts/import-travelrobot-all.sh
#   ./deploy/scripts/import-travelrobot-all.sh --ping
#   ./deploy/scripts/import-travelrobot-all.sh --dry-run --limit 5
#   ./deploy/scripts/import-travelrobot-all.sh
#   ONLY=tours ./deploy/scripts/import-travelrobot-all.sh
#   ONLY=hotels ./deploy/scripts/import-travelrobot-all.sh --limit 10
set -euo pipefail

APP_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
BACKEND_ENV="${TRAVEL_DB_ENV:-/etc/rezervasyonyap/backend.env}"
ONLY="${ONLY:-}"

if [[ -f "$BACKEND_ENV" ]]; then
  set -a
  # shellcheck disable=SC1090
  source "$BACKEND_ENV"
  set +a
fi

cd "$APP_ROOT"

echo "→ PostgreSQL bağlantı testi…"
node scripts/test-pg-env.mjs || exit 1

run_import() {
  local label="$1"
  local script="$2"
  echo ""
  echo "══ Travelrobot $label ══"
  node "$script" "$@"
}

if [[ "$*" == *"--ping"* ]] || [[ "$*" == *"--dry-run"* ]]; then
  run_import "tur" scripts/import-travelrobot-tours.mjs "$@"
  exit 0
fi

case "$ONLY" in
  tours|tour)
    run_import "tur" scripts/import-travelrobot-tours.mjs "$@"
    ;;
  hotels|hotel)
    run_import "otel" scripts/import-travelrobot-hotels.mjs "$@"
    ;;
  flights|flight)
    run_import "uçak" scripts/import-travelrobot-flights.mjs "$@"
    ;;
  "")
    run_import "tur" scripts/import-travelrobot-tours.mjs "$@"
    run_import "otel" scripts/import-travelrobot-hotels.mjs "$@"
    run_import "uçak" scripts/import-travelrobot-flights.mjs "$@"
    ;;
  *)
    echo "[FAIL] ONLY=$ONLY geçersiz (tours|hotels|flights)" >&2
    exit 1
    ;;
esac
