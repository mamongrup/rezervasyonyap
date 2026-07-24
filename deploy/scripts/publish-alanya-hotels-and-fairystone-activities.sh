#!/usr/bin/env bash
# Tek komut: Alanya/Side otel batch-1+2 + Fairy Stone Kapadokya aktiviteleri.
# Kod main'de olmalı; bu script veriyi DB'ye yazar (deploy.sh tek başına import etmez).
#
#   cd /var/www/vhosts/rezervasyonyap.tr/httpdocs
#   git fetch origin main && git reset --hard origin/main
#   chmod +x deploy/scripts/publish-alanya-hotels-and-fairystone-activities.sh
#   ./deploy/scripts/publish-alanya-hotels-and-fairystone-activities.sh
#
# Ardından (facet + fairystone görselleri için):
#   DEPLOY_REF=main ./deploy/deploy.sh
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
cd "$APP_ROOT"

echo "[1/3] Alanya/Side batch-2 (+ batch-1 oda görseli yeniden import)..."
chmod +x "$APP_ROOT/deploy/scripts/import-alanya-side-hotels-batch2.sh"
SKIP_HARVEST=1 "$APP_ROOT/deploy/scripts/import-alanya-side-hotels-batch2.sh"

echo "[2/3] Fairy Stone Kapadokya aktiviteleri..."
chmod +x "$APP_ROOT/deploy/scripts/import-fairystone-kapadokya-activities.sh"
SKIP_HARVEST=1 "$APP_ROOT/deploy/scripts/import-fairystone-kapadokya-activities.sh"

echo "[3/3] Hızlı doğrulama (API)..."
sleep 2
curl -sS "http://127.0.0.1:8080/api/v1/catalog/public/listings?category_code=hotel&q=venessa&limit=2" \
  | head -c 400 || true
echo
curl -sS "http://127.0.0.1:8080/api/v1/catalog/public/listings?category_code=activity&q=balon&limit=2" \
  | head -c 400 || true
echo

echo "[OK] Import bitti."
echo "[INFO] Frontend/API güncellemesi için: DEPLOY_REF=main ./deploy/deploy.sh"
echo "[INFO] AI kuyruk: systemctl start --no-block travel-ai-worker.service"
echo "[INFO] Cache: rm -rf frontend/.next/cache/fetch-cache && systemctl restart travel-web.service"
