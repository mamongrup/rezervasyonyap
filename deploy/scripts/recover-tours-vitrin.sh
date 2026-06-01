#!/usr/bin/env bash
# Vitrinden kaybolan turları geri getir + Pexels / durum özeti.
# Turlar silinmez; çoğunlukla status=draft veya API search_failed.
#
#   chmod +x deploy/scripts/recover-tours-vitrin.sh
#   ./deploy/scripts/recover-tours-vitrin.sh
#   ./deploy/scripts/recover-tours-vitrin.sh --republish
set -euo pipefail

APP_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
# shellcheck source=deploy/scripts/lib/psql-env.sh
source "$APP_ROOT/deploy/scripts/lib/psql-env.sh"

REPUBLISH=0
[[ "${1:-}" == "--republish" ]] && REPUBLISH=1

require_travel_db_env

echo "==> Tur ilan durumu (wtatil)"
psql_travel -v ON_ERROR_STOP=1 -c "
SELECT l.status, count(*)::int AS adet
FROM listings l
JOIN product_categories pc ON pc.id = l.category_id
WHERE pc.code = 'tour' AND l.external_provider_code = 'wtatil'
GROUP BY l.status
ORDER BY l.status;
"

echo "==> Pexels galeri kaydı (DB — silinmedi mi?)"
psql_travel -v ON_ERROR_STOP=1 -c "
SELECT count(*)::int AS pexels_tur_sayisi
FROM listing_attributes la
JOIN listings l ON l.id = la.listing_id
WHERE la.group_code = 'pexels' AND la.key = 'gallery_imported_at'
  AND l.external_provider_code = 'wtatil';
"

echo "==> Pexels dosyaları (disk)"
PEX_DIR="$APP_ROOT/frontend/public/uploads/listings/pexels"
if [[ -d "$PEX_DIR" ]]; then
  FILE_COUNT="$(find "$PEX_DIR" -type f 2>/dev/null | wc -l | tr -d ' ')"
  echo "    $PEX_DIR → ${FILE_COUNT} dosya"
else
  echo "    [WARN] Pexels klasörü yok: $PEX_DIR"
fi

echo "==> Vitrin API (tur arama)"
curl -sS "http://127.0.0.1:8080/api/v1/catalog/public/listings?category_code=tour&per_page=2&locale=tr" | head -c 400
echo

if [[ "$REPUBLISH" -eq 1 ]]; then
  echo "==> draft → published (wtatil turları)"
  psql_travel -v ON_ERROR_STOP=1 -c "
UPDATE listings l
SET status = 'published', updated_at = now()
FROM product_categories pc
WHERE pc.id = l.category_id
  AND pc.code = 'tour'
  AND l.external_provider_code = 'wtatil'
  AND l.status = 'draft';
"
  echo "[OK] Yayına alındı. Siteyi yenileyin."
fi
