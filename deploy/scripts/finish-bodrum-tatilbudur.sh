#!/usr/bin/env bash
# Bodrum batch: teklifli eksikleri onar → yalnız Bodrum URL listesi rehost → TR yayın.
#
#   chmod +x deploy/scripts/finish-bodrum-tatilbudur.sh
#   ./deploy/scripts/finish-bodrum-tatilbudur.sh
set -euo pipefail
APP_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$APP_ROOT"
URLS_FILE="${BODRUM_TATILBUDUR_URLS:-deploy/data/tatilbudur/bodrum-request-urls.txt}"

echo "==> 1/4 Teklifi olan eksik/odasız otelleri onar"
node scripts/repair-bodrum-tatilbudur-missing.mjs

echo "==> 2/4 Yalnız Bodrum listesi CDN → AVIF (max 40 görsel/otel)"
export IMAGE_CONVERT_CONCURRENCY="${IMAGE_CONVERT_CONCURRENCY:-1}"
export IMAGE_DOWNLOAD_CONCURRENCY="${IMAGE_DOWNLOAD_CONCURRENCY:-2}"
export AVIF_EFFORT="${AVIF_EFFORT:-2}"
export AVIF_QUALITY="${AVIF_QUALITY:-82}"
export VIPS_CONCURRENCY="${VIPS_CONCURRENCY:-1}"
export REHOST_MAX_IMAGES="${REHOST_MAX_IMAGES:-40}"
bash deploy/scripts/rehost-external-images-detached.sh stop || true
bash deploy/scripts/rehost-external-images-detached.sh \
  --provider=tatilbudur \
  --category=hotel \
  --hosts=productcdn.tatilbudur.com,ucdn.tatilbudur.net,tatilbudur.com \
  --slugs-file="$URLS_FILE" \
  --max-images="$REHOST_MAX_IMAGES"
bash deploy/scripts/rehost-external-images-detached.sh wait

echo "==> 3/4 TR yayın"
node scripts/finalize-bodrum-tatilbudur.mjs

echo "==> 4/4 Teşhis"
node scripts/diagnose-bodrum-tatilbudur-drafts.mjs
echo
echo "Rapor: backups/tatilbudur-bodrum-links.md"
echo "Taslak: backups/tatilbudur-bodrum-draft-diagnose.md"
