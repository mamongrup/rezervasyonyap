#!/usr/bin/env bash
# Panel kapalıyken çalışan zamanlanmış ilan import başlatıcısı.
# Her saat başı travel-import-scheduler.timer tarafından çağrılır.
#
# Kurulum:
#   sudo cp deploy/systemd/travel-import-scheduler.service /etc/systemd/system/
#   sudo cp deploy/systemd/travel-import-scheduler.timer   /etc/systemd/system/
#   sudo systemctl daemon-reload
#   sudo systemctl enable --now travel-import-scheduler.timer
#
# Manuel test:
#   ./deploy/scripts/run-scheduled-imports.sh --force-all
#   ./deploy/scripts/run-scheduled-imports.sh --provider wtatil
#
# Log:
#   journalctl -u travel-import-scheduler.service -n 200 --no-pager
set -euo pipefail

APP_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
# shellcheck source=deploy/scripts/lib/load-env-file.sh
source "$APP_ROOT/deploy/scripts/lib/load-env-file.sh"

BACKEND_ENV="${TRAVEL_DB_ENV:-/etc/rezervasyonyap/backend.env}"
load_env_file "$BACKEND_ENV"

# Opsiyonel: istatistik API endpointini progress raporlaması için ayarla
export INTERNAL_API_ORIGIN="${INTERNAL_API_ORIGIN:-http://127.0.0.1:8080}"

cd "$APP_ROOT"

if [[ ! -d "$APP_ROOT/scripts/node_modules/pg" ]]; then
  echo "→ npm install (scripts/)…"
  (cd "$APP_ROOT/scripts" && npm install --no-audit --no-fund)
fi

echo "→ Zamanlanmış importlar başlatılıyor (UTC $(date -u '+%H:%M'))…"
node "$APP_ROOT/scripts/run-scheduled-imports.mjs" "$@"
