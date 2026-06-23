#!/usr/bin/env bash
# Yayında olup vitrinde gizlenen (fiyatsız) otellerin sayısını/nedenini raporlar.
# travel-api ile AYNI veritabanı bağlantısını kullanır (apply-sql.sh → backend.env).
#
# Elle:
#   cd /var/www/vhosts/rezervasyonyap.tr/httpdocs
#   ./deploy/scripts/report-priceless-hotels.sh
#
# Otomatik (opsiyonel): deploy/systemd/travel-priceless-hotels-report.timer (günlük)
# Log: journalctl -u travel-priceless-hotels-report.service -n 100 --no-pager
set -euo pipefail

APP_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

# Rapor öncesi vitrin_price'ı tazele ki fiyatlı yeni oteller "fiyatsız" sayılmasın.
"$APP_ROOT/deploy/scripts/refresh-vitrin-prices.sh" >/dev/null 2>&1 || echo "[WARN] vitrin_price tazeleme atlandı"

exec "$APP_ROOT/deploy/apply-sql.sh" backend/priv/sql/maintenance/report_priceless_hotels.sql
