#!/usr/bin/env bash
# KPlus tur PNR sertifikasyonu (sandbox Test_* kanalı)
#
#   chmod +x deploy/scripts/kplus-tour-cert.sh
#   ./deploy/scripts/kplus-tour-cert.sh
#   ./deploy/scripts/kplus-tour-cert.sh --only tour-s1
#
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

EXTRA=("$@")
if [[ ${#EXTRA[@]} -eq 0 ]]; then
  EXTRA=(--only tours)
fi

echo "══ KPlus tour cert (sandbox) ══"
echo "[config] git: $(git -C "$APP_ROOT" rev-parse --short HEAD 2>/dev/null || echo unknown)"
grep -m1 'TRAVELROBOT_TEST_SCRIPT_VERSION' "$APP_ROOT/scripts/test-travelrobot-scenarios.mjs" || true
# v28: sessionPkg+254key önce; final price yanıt Id; Token objesi varyantı
export KPLUS_FETCH_TIMEOUT_MS="${KPLUS_FETCH_TIMEOUT_MS:-90000}"
export KPLUS_TOUR_BOOK_TIMEOUT_MS="${KPLUS_TOUR_BOOK_TIMEOUT_MS:-180000}"
export KPLUS_TOUR_CERT_CODE="${KPLUS_TOUR_CERT_CODE:-T66-1204-22669}"
node scripts/test-travelrobot-scenarios.mjs --sandbox --with-booking --tour-code "$KPLUS_TOUR_CERT_CODE" "${EXTRA[@]}"
