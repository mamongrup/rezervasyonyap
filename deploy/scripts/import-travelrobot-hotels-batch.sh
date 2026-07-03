#!/usr/bin/env bash
# Travelrobot (KPlus) otel import — kopmaya dayanıklı (nohup + batch checkpoint).
#
#   chmod +x deploy/scripts/import-travelrobot-hotels-batch.sh
#   ./deploy/scripts/import-travelrobot-hotels-batch.sh
#   ./deploy/scripts/import-travelrobot-hotels-batch.sh --dry-run --limit 2
#   ./deploy/scripts/import-travelrobot-hotels-batch.sh --refresh-catalog
#   ./deploy/scripts/import-travelrobot-hotels-batch.sh --status
#
# Log: backups/travelrobot-hotel-import.log (veya TRAVELROBOT_IMPORT_LOG)
# State: backups/travelrobot-hotel-import-state.json
#
# Tüm batch'ler bitene kadar script her çağrıda bir batch (varsayılan 2.000) işler.
# Arka planda sürekli çalışması için: run-travelrobot-hotels-background.sh kullanın.
set -euo pipefail

APP_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
BACKEND_ENV="${TRAVEL_DB_ENV:-/etc/rezervasyonyap/backend.env}"
LOG_FILE="${TRAVELROBOT_IMPORT_LOG:-$APP_ROOT/backups/travelrobot-hotel-import.log}"

if [[ -f "$BACKEND_ENV" ]]; then
  set -a
  # shellcheck disable=SC1090
  source "$BACKEND_ENV"
  set +a
fi

cd "$APP_ROOT"
mkdir -p "$(dirname "$LOG_FILE")"

echo "→ PostgreSQL bağlantı testi…"
node scripts/test-pg-env.mjs || exit 1

echo "→ Travelrobot otel import başlıyor… ($(date -Iseconds))"
node scripts/import-travelrobot-hotels-batch.mjs "$@"

echo "→ Vitrin fiyat önbelleği…"
"$APP_ROOT/deploy/scripts/refresh-vitrin-prices.sh" 2>/dev/null || echo "[WARN] vitrin_price atlandı"
