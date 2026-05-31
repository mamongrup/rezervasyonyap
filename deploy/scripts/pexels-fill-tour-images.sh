#!/usr/bin/env bash
# Tur ilanları — Pexels yüksek çözünürlük galeri (wtatil thumbnail yerine).
#
#   chmod +x deploy/scripts/pexels-fill-tour-images.sh
#   ./deploy/scripts/pexels-fill-tour-images.sh --dry-run --limit 3
#   ./deploy/scripts/pexels-fill-tour-images.sh --limit 50
#   nohup ./deploy/scripts/pexels-fill-tour-images.sh --replace > /tmp/pexels-tours.log 2>&1 &
set -euo pipefail

APP_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
# shellcheck disable=SC1091
source "$APP_ROOT/deploy/scripts/lib/psql-env.sh"

command -v psql >/dev/null 2>&1 || { echo "[FAIL] psql bulunamadı"; exit 1; }
command -v node >/dev/null 2>&1 || { echo "[FAIL] node bulunamadı"; exit 1; }

cd "$APP_ROOT"

echo "→ PostgreSQL bağlantı testi…"
DBINFO=$(psql_travel -v ON_ERROR_STOP=1 -t -A -c "SELECT current_database() || ' user=' || current_user")
echo "[OK] PostgreSQL: $DBINFO"

# Yüksek kalite AVIF (varsayılan wtatil script 90/1600 — burada biraz daha geniş)
export AVIF_QUALITY="${AVIF_QUALITY:-88}"
export MAX_WIDTH="${MAX_WIDTH:-1920}"
export PEXELS_IMAGES="${PEXELS_IMAGES:-6}"

node scripts/pexels-fill-tour-images.mjs "$@"
