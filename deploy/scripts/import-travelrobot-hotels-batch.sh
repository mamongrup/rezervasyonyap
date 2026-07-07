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

# NOT: vitrin_price önbelleği artık HER batch sonrası çalıştırılmaz.
# refresh_listing_vitrin_prices() tam tablo taramasıdır; her batch'te (2000 otel)
# çağrılması DB'yi doyurup siteyi kilitliyordu. Periyodik tazeleme zaten
# travel-vitrin-price-refresh.timer (10 dk) ile yapılıyor. Tek seferlik istemek
# için: REFRESH_VITRIN_AFTER_BATCH=1 ./deploy/scripts/import-travelrobot-hotels-batch.sh
if [[ "${REFRESH_VITRIN_AFTER_BATCH:-0}" == "1" ]]; then
  echo "→ Vitrin fiyat önbelleği (istek üzerine)…"
  "$APP_ROOT/deploy/scripts/refresh-vitrin-prices.sh" 2>/dev/null || echo "[WARN] vitrin_price atlandı"
fi
