#!/usr/bin/env bash
# Vitrin fiyat önbelleğini (listings.vitrin_price) tazeler.
# travel-api ile AYNI veritabanı bağlantısını kullanır (apply-sql.sh → backend.env).
#
# Elle (tüm tablo):
#   cd /var/www/vhosts/rezervasyonyap.tr/httpdocs
#   ./deploy/scripts/refresh-vitrin-prices.sh
#
# Yalnız belirli ilanlar (import sonrası — tam tablo taramasından kaçınır):
#   LISTING_IDS=uuid1,uuid2 ./deploy/scripts/refresh-vitrin-prices.sh
#
# Otomatik: deploy/systemd/travel-vitrin-price-refresh.timer (10 dk)
set -euo pipefail

APP_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

if [[ -n "${LISTING_IDS:-}" ]]; then
  ids_csv="$(echo "$LISTING_IDS" | tr -d '[:space:]')"
  if [[ -z "$ids_csv" ]]; then
    echo "[refresh-vitrin] LISTING_IDS boş — çıkılıyor" >&2
    exit 0
  fi
  # Tek tırnak/backslash kaçış: uuid listesi yalnızca [0-9a-fA-F,-]
  if [[ ! "$ids_csv" =~ ^[0-9a-fA-F,-]+$ ]]; then
    echo "[refresh-vitrin] LISTING_IDS geçersiz karakter içeriyor" >&2
    exit 1
  fi
  exec "$APP_ROOT/deploy/apply-sql.sh" -c \
    "SELECT refresh_listing_vitrin_prices_for_ids(string_to_array('${ids_csv}', ',')::uuid[]);"
fi

exec "$APP_ROOT/deploy/apply-sql.sh" backend/priv/sql/maintenance/refresh_vitrin_prices.sql
