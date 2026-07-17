#!/usr/bin/env bash
# Haftalık ağır tablo VACUUM/ANALYZE (idle I/O).
#
# Elle:
#   ./deploy/scripts/vacuum-heavy-tables.sh
# Otomatik: travel-vacuum-heavy.timer (Pazar 03:40 UTC)
set -euo pipefail

APP_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
echo "[vacuum-heavy] $(date -u +%Y-%m-%dT%H:%M:%SZ) start"
"$APP_ROOT/deploy/apply-sql.sh" backend/priv/sql/maintenance/vacuum_heavy_tables.sql
echo "[vacuum-heavy] $(date -u +%Y-%m-%dT%H:%M:%SZ) done"
