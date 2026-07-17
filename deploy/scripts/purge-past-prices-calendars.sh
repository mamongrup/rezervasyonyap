#!/usr/bin/env bash
# Bu aydan önceki listing_price_rules + müsaitlik takvimlerini siler.
# Her ayın 1'inden itibaren otomatik (timer); elle de çalıştırılabilir.
#
# Elle:
#   cd /var/www/vhosts/rezervasyonyap.tr/httpdocs
#   ./deploy/scripts/purge-past-prices-calendars.sh
#
# Otomatik: deploy/systemd/travel-purge-past-calendars.timer (ayın 1'i 03:20 UTC)
set -euo pipefail

APP_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

echo "[purge-past-calendars] $(date -u +%Y-%m-%dT%H:%M:%SZ) start cutoff=$(date -u +%Y-%m-01)"

"$APP_ROOT/deploy/apply-sql.sh" backend/priv/sql/maintenance/purge_past_prices_calendars.sql

echo "[purge-past-calendars] $(date -u +%Y-%m-%dT%H:%M:%SZ) done"
