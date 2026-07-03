#!/usr/bin/env bash
# Tatilsepeti otel import — kopmaya dayanıklı (nohup + batch checkpoint).
#
#   chmod +x deploy/scripts/import-tatilsepeti-hotels.sh
#   ./deploy/scripts/import-tatilsepeti-hotels.sh
#   ./deploy/scripts/import-tatilsepeti-hotels.sh --dry-run --limit 2
#   ./deploy/scripts/import-tatilsepeti-hotels.sh --refresh-catalog
#   ./deploy/scripts/import-tatilsepeti-hotels.sh --status
#
# Log: backups/tatilsepeti-hotel-import.log (veya TATILSEPETI_IMPORT_LOG)
# State: backups/tatilsepeti-hotel-import-state.json
#
# Tüm batch'ler bitene kadar script her çağrıda bir batch (varsayılan 10.000) işler.
# Arka planda sürekli çalışması için:
#   nohup bash -c 'while ./deploy/scripts/import-tatilsepeti-hotels.sh; do sleep 5; done' \
#     >> /var/log/tatilsepeti-hotel-import.log 2>&1 &
set -euo pipefail

APP_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
BACKEND_ENV="${TRAVEL_DB_ENV:-/etc/rezervasyonyap/backend.env}"
LOG_FILE="${TATILSEPETI_IMPORT_LOG:-$APP_ROOT/backups/tatilsepeti-hotel-import.log}"

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

echo "→ Tatilsepeti otel import başlıyor… ($(date -Iseconds))"
node scripts/import-tatilsepeti-hotels.mjs "$@"

echo "→ Vitrin fiyat önbelleği…"
"$APP_ROOT/deploy/scripts/refresh-vitrin-prices.sh" 2>/dev/null || echo "[WARN] vitrin_price atlandı"

STATE="$APP_ROOT/backups/tatilsepeti-hotel-import-state.json"
if [[ -f "$STATE" ]]; then
  NEXT="$(node -e "const s=require('$STATE'); const c=require('$APP_ROOT/backups/tatilsepeti-hotel-catalog.json'); console.log(s.nextIndex>=c.hotels.length?'done':'continue')")"
  if [[ "$NEXT" == "continue" ]]; then
    echo "[bilgi] Sonraki batch bekliyor — nohup döngüsü varsa otomatik devam eder"
  fi
fi
