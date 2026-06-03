#!/usr/bin/env bash
# Geriye dönük uyumluluk — sync-wtatil-auto.sh çağırır.
set -euo pipefail
APP_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
exec "$APP_ROOT/deploy/scripts/sync-wtatil-auto.sh" "$@"
