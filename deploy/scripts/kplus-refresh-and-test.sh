#!/usr/bin/env bash
# KPlus / Travelrobot: veri import + (isteğe bağlı) sertifikasyon testi
#
#   chmod +x deploy/scripts/kplus-refresh-and-test.sh
#   ./deploy/scripts/kplus-refresh-and-test.sh
#   ./deploy/scripts/kplus-refresh-and-test.sh --import-only
#   ./deploy/scripts/kplus-refresh-and-test.sh --test-only
#   ./deploy/scripts/kplus-refresh-and-test.sh --with-enrich --limit 100
#   ./deploy/scripts/kplus-refresh-and-test.sh --test-only --with-booking --only hotels
#
set -euo pipefail

APP_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
BACKEND_ENV="${TRAVEL_DB_ENV:-/etc/rezervasyonyap/backend.env}"

IMPORT_ONLY=0
TEST_ONLY=0
WITH_ENRICH=0
WITH_BOOKING=0
ENRICH_LIMIT=100
TEST_ONLY_FILTER=""

for arg in "$@"; do
  case "$arg" in
    --import-only) IMPORT_ONLY=1 ;;
    --test-only) TEST_ONLY=1 ;;
    --with-enrich) WITH_ENRICH=1 ;;
    --with-booking) WITH_BOOKING=1 ;;
  esac
done

prev=""
for arg in "$@"; do
  if [[ "$prev" == "--limit" ]]; then
    ENRICH_LIMIT="$arg"
  fi
  if [[ "$prev" == "--only" ]]; then
    TEST_ONLY_FILTER="$arg"
  fi
  prev="$arg"
done

if [[ -f "$BACKEND_ENV" ]]; then
  set -a
  # shellcheck disable=SC1090
  source "$BACKEND_ENV"
  set +a
fi

cd "$APP_ROOT"

echo "══ KPlus refresh & test ══"
echo "Repo: $APP_ROOT"

if [[ "$TEST_ONLY" -eq 0 ]]; then
  echo ""
  echo "→ [1/3] Travelrobot bağlantı (ping)…"
  chmod +x deploy/scripts/import-travelrobot-all.sh
  ./deploy/scripts/import-travelrobot-all.sh --ping

  echo ""
  echo "→ [2/3] Import (tur · otel · uçuş)…"
  ./deploy/scripts/import-travelrobot-all.sh

  if [[ "$WITH_ENRICH" -eq 1 ]]; then
    echo ""
    echo "→ [2b] Otel zenginleştirme (limit=$ENRICH_LIMIT)…"
    node scripts/enrich-travelrobot-hotels.mjs --limit "$ENRICH_LIMIT" --with-rooms
  fi
fi

if [[ "$IMPORT_ONLY" -eq 0 ]]; then
  echo ""
  echo "→ [3/3] Senaryo testi…"
  TEST_ARGS=(--from-db)
  if [[ "$WITH_BOOKING" -eq 1 ]]; then
    TEST_ARGS+=(--with-booking)
  fi
  if [[ -n "$TEST_ONLY_FILTER" ]]; then
    TEST_ARGS+=(--only "$TEST_ONLY_FILTER")
  else
    TEST_ARGS+=(--only hotels)
  fi
  node scripts/test-travelrobot-scenarios.mjs "${TEST_ARGS[@]}"
fi

echo ""
echo "[OK] Tamamlandı."
