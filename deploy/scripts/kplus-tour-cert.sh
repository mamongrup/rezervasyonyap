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
node scripts/test-travelrobot-scenarios.mjs --sandbox --with-booking "${EXTRA[@]}"
