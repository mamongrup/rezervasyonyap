#!/usr/bin/env bash
# Ada Villa — sunucuda ilan + EUR sezon + takvim + (varsa) yerel galeri.
#
# Önkoşul (fotoğraflar):
#   Fotoğrafları şuraya koyun (Laragon'dan scp veya Plesk File Manager):
#   /var/www/vhosts/rezervasyonyap.tr/tmp/ada-online-fotolar/
#
#   cd /var/www/vhosts/rezervasyonyap.tr/httpdocs
#   ./deploy/scripts/import-ada-villa-prod.sh
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT"

PHOTO_DIR="${ADA_PHOTO_DIR:-/var/www/vhosts/rezervasyonyap.tr/tmp/ada-online-fotolar}"
ENV_FILE="${TRAVEL_DB_ENV:-/etc/rezervasyonyap/backend.env}"

if [[ -f "$ENV_FILE" ]]; then
  set -a
  # shellcheck disable=SC1090
  source "$ENV_FILE"
  set +a
fi

echo "[ada] git: $(git rev-parse --short HEAD 2>/dev/null || echo '?')"
echo "[ada] import (skip Airbnb images — galeri yerel klasörden)"
node scripts/import-fethiye-ada-villa.mjs --skip-images

if [[ -d "$PHOTO_DIR" ]] && find "$PHOTO_DIR" -type f \( -iname '*.jpg' -o -iname '*.jpeg' -o -iname '*.png' -o -iname '*.webp' -o -iname '*.avif' \) | grep -q .; then
  echo "[ada] galeri: $PHOTO_DIR"
  node scripts/set-villa-gallery-from-folder.mjs \
    --slug fethiye-ada-villa \
    --dir "$PHOTO_DIR"
else
  echo "[ada] UYARI: foto klasörü boş veya yok: $PHOTO_DIR"
  echo "      Galeri atlandı. Fotoğrafları yükleyip şunu tekrar çalıştırın:"
  echo "      node scripts/set-villa-gallery-from-folder.mjs --slug fethiye-ada-villa --dir \"$PHOTO_DIR\""
fi

if [[ -x deploy/scripts/refresh-vitrin-prices.sh ]]; then
  echo "[ada] vitrin_price refresh"
  ./deploy/scripts/refresh-vitrin-prices.sh || echo "[ada] WARN refresh-vitrin-prices başarısız"
else
  echo "[ada] refresh-vitrin-prices.sh yok — manuel: SELECT refresh_listing_vitrin_prices();"
fi

echo "[ada] bitti — slug: fethiye-ada-villa (Ada Villa)"
