#!/usr/bin/env bash
# Tatilsepeti cruise kabin/fiyat backfill — üretim veya yerel
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"
export TATILSEPETI_DELAY_MS="${TATILSEPETI_DELAY_MS:-500}"
node scripts/backfill-tatilsepeti-cruise-cabins.mjs "$@"
