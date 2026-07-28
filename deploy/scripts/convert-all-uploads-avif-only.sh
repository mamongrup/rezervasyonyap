#!/usr/bin/env bash
# Yerel uploads → AVIF-only (webp/jpg/png dönüştür, kaynakları sil) + DB path güncelle
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"

echo "[avif] converting public/uploads ..."
if [[ -f frontend/scripts/convert-uploads-to-avif.mjs ]]; then
  node frontend/scripts/convert-uploads-to-avif.mjs
fi
if [[ -f scripts/convert-listings-avif-full.mjs ]]; then
  node scripts/convert-listings-avif-full.mjs
fi
if [[ -f scripts/update-listing-paths-avif.mjs ]]; then
  node scripts/update-listing-paths-avif.mjs
fi

echo "[ok] local media AVIF-only pass done"
echo "[note] Harici CDN (TravelAPI/Hotelbeds) JPG kalır; tam AVIF için:"
echo "  REHOST_EXTERNAL=1 ./deploy/scripts/fix-all-listing-images.sh"
echo "[note] iPhone 7 / iOS 15 AVIF gösteremez — bilinçli politika."
