#!/usr/bin/env bash
# git pull engeli (yerel kplus-tour-cert.sh) + tur cert
#   bash deploy/scripts/kplus-pull-and-cert.sh --only tour-s1
set -euo pipefail

APP_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$APP_ROOT"

if [[ -f deploy/scripts/kplus-tour-cert.sh ]]; then
  git checkout -- deploy/scripts/kplus-tour-cert.sh 2>/dev/null || true
fi

echo "== git pull origin main =="
git pull origin main

echo "== script surumu =="
grep -m1 'TRAVELROBOT_TEST_SCRIPT_VERSION' scripts/test-travelrobot-scenarios.mjs || true

exec bash deploy/scripts/kplus-tour-cert.sh "$@"
