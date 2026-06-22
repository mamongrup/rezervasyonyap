#!/usr/bin/env bash
# Vitrin fiyat önbelleğini (listings.vitrin_price) tazeler.
# travel-api ile AYNI veritabanı bağlantısını kullanır (apply-sql.sh → backend.env).
#
# Elle:
#   cd /var/www/vhosts/rezervasyonyap.tr/httpdocs
#   ./deploy/scripts/refresh-vitrin-prices.sh
#
# Otomatik: deploy/systemd/travel-vitrin-price-refresh.timer (10 dk)
set -euo pipefail

APP_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
exec "$APP_ROOT/deploy/apply-sql.sh" backend/priv/sql/maintenance/refresh_vitrin_prices.sql
