#!/usr/bin/env bash
# Haftalık ağır tablo VACUUM/ANALYZE (idle I/O).
#
# Elle:
#   ./deploy/scripts/vacuum-heavy-tables.sh
# Otomatik: travel-vacuum-heavy.timer (Pazar 03:40 UTC)
#
# flock ile tekil çalışma korumalı: elle art arda çalıştırma veya timer +
# elle çalıştırmanın çakışması aynı büyük tabloda (listing_images vb.)
# birden fazla VACUUM'un kilit üzerinde birbirini bloke etmesini önler.
set -euo pipefail

APP_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
LOCK_FILE="/tmp/travel-vacuum-heavy.lock"

exec 9>"$LOCK_FILE"
if ! flock -n 9; then
  echo "[vacuum-heavy] $(date -u +%Y-%m-%dT%H:%M:%SZ) zaten çalışıyor — atlanıyor (lock: $LOCK_FILE)"
  exit 0
fi

echo "[vacuum-heavy] $(date -u +%Y-%m-%dT%H:%M:%SZ) start"
"$APP_ROOT/deploy/apply-sql.sh" backend/priv/sql/maintenance/vacuum_heavy_tables.sql
echo "[vacuum-heavy] $(date -u +%Y-%m-%dT%H:%M:%SZ) done"
