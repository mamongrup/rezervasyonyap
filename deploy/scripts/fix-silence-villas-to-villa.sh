#!/usr/bin/env bash
# Silence Villas: otel → villa (holiday_home) + bölge Kargı.
#   ./deploy/scripts/fix-silence-villas-to-villa.sh
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
SQL_FILE="$APP_ROOT/deploy/scripts/sql/fix-silence-villas-to-holiday-home.sql"

# shellcheck source=deploy/scripts/lib/psql-env.sh
source "$APP_ROOT/deploy/scripts/lib/psql-env.sh"

psql_travel -v ON_ERROR_STOP=1 -f "$SQL_FILE"

echo "[OK] Silence Villas → tatil evi (villa), bölge Kargı."
echo "[INFO] Kartta 'Villa' + URL /tatil-evi/silence-villas olmalı."
echo "[INFO] AI: ./deploy/scripts/ensure-ai-social-workers.sh"
