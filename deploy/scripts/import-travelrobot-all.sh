#!/usr/bin/env bash
# Travelrobot (KPlus) tur / otel / uçuş import — kimlik bilgileri site_settings.listing_api_providers
#
# Panel: Yönetim → İlan API sağlayıcıları → Travelrobot
# Sandbox IP whitelist: KPlus'a sunucu çıkış IP'sini bildirin.
#
#   chmod +x deploy/scripts/import-travelrobot-all.sh
#   ./deploy/scripts/import-travelrobot-all.sh --ping
#   ./deploy/scripts/import-travelrobot-all.sh --dry-run --limit 5
#   ./deploy/scripts/import-travelrobot-all.sh
#   ONLY=hotels ./deploy/scripts/import-travelrobot-all.sh --limit 10
#   ONLY=flights ./deploy/scripts/import-travelrobot-all.sh
#
# ONLY → Node --only bayrağına çevrilir (tours|hotels|flights veya tour|hotel|flight).
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

EXTRA_ARGS=()
if [[ -n "$ONLY" ]]; then
  case "$ONLY" in
    tours|tour) EXTRA_ARGS+=(--only tours) ;;
    hotels|hotel) EXTRA_ARGS+=(--only hotels) ;;
    flights|flight) EXTRA_ARGS+=(--only flights) ;;
    *)
      echo "[FAIL] ONLY=$ONLY geçersiz (tours|hotels|flights)" >&2
      exit 1
      ;;
  esac
fi

echo ""
echo "══ Travelrobot import (tur · otel · uçuş) ══"
node scripts/import-travelrobot-all.mjs "${EXTRA_ARGS[@]}" "$@"

echo "→ Vitrin fiyat önbelleği tazeleniyor (fiyatı olan oteller görünür, fiyatsızlar gizli)…"
"$APP_ROOT/deploy/scripts/refresh-vitrin-prices.sh" || echo "[WARN] vitrin_price tazeleme atlandı"
