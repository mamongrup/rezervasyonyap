#!/usr/bin/env bash
# Bodrum: teklifli eksikleri onar → tüm TatilBudur CDN galeriyi yerelleştir → TR yayın.
# Import sonrası AVIF ezilmesin diye rehost EN SONA yakın; finalize import yapmaz.
#
#   chmod +x deploy/scripts/finish-bodrum-tatilbudur.sh
#   ./deploy/scripts/finish-bodrum-tatilbudur.sh
set -euo pipefail
APP_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$APP_ROOT"

echo "==> 1/4 Teklifi olan eksik/odasız otelleri onar"
node scripts/repair-bodrum-tatilbudur-missing.mjs

echo "==> 2/4 CDN galerileri yerel AVIF (yayında + taslak)"
export IMAGE_CONVERT_CONCURRENCY="${IMAGE_CONVERT_CONCURRENCY:-1}"
export IMAGE_DOWNLOAD_CONCURRENCY="${IMAGE_DOWNLOAD_CONCURRENCY:-2}"
export AVIF_EFFORT="${AVIF_EFFORT:-2}"
export AVIF_QUALITY="${AVIF_QUALITY:-82}"
export VIPS_CONCURRENCY="${VIPS_CONCURRENCY:-1}"
bash deploy/scripts/rehost-external-images-detached.sh stop || true
bash deploy/scripts/rehost-external-images-detached.sh \
  --provider=tatilbudur \
  --category=hotel \
  --hosts=productcdn.tatilbudur.com,ucdn.tatilbudur.net,tatilbudur.com
bash deploy/scripts/rehost-external-images-detached.sh wait

echo "==> 3/4 TR yayın"
node scripts/finalize-bodrum-tatilbudur.mjs

echo "==> 4/4 Teşhis"
node scripts/diagnose-bodrum-tatilbudur-drafts.mjs
echo
echo "Rapor: backups/tatilbudur-bodrum-links.md"
echo "Taslak: backups/tatilbudur-bodrum-draft-diagnose.md"
