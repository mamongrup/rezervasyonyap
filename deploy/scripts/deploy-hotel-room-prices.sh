#!/usr/bin/env bash
# Otel oda fiyatlarını oda-kapsamlı hale getir + vitrin medya onarımı + tek deploy.
# Önceki AVIF/CDN düzeltmeleri (382–387) main'deyse aynı DEPLOY_REF ile gelir.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"

REF="${DEPLOY_REF:-main}"
echo "==> git sync ($REF)"
git fetch origin "$REF"
git reset --hard "origin/$REF"

echo "==> hotel room scoped prices backfill"
chmod +x scripts/backfill-hotel-room-scoped-prices.mjs deploy/apply-sql.sh deploy/scripts/fix-all-listing-images.sh 2>/dev/null || true
node scripts/backfill-hotel-room-scoped-prices.mjs ${HOTEL_PRICE_BACKFILL_ARGS:-}

if [[ "${SKIP_IMAGE_FIX:-0}" != "1" ]]; then
  echo "==> listing image CDN repair (382–387)"
  ./deploy/scripts/fix-all-listing-images.sh || true
fi

echo "==> deploy API + web"
DEPLOY_REF="$REF" ./deploy/deploy.sh

echo "==> verify"
./deploy/verify.sh

echo "OK: hotel room prices + prior media fixes deployed ($REF)"
