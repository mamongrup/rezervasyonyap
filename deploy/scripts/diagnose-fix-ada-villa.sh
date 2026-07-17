#!/usr/bin/env bash
# Ada Villa neden vitrinde yok — teşhis + olası onarım.
#   cd /var/www/vhosts/rezervasyonyap.tr/httpdocs
#   ./deploy/scripts/diagnose-fix-ada-villa.sh
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT"
ENV_FILE="${TRAVEL_DB_ENV:-/etc/rezervasyonyap/backend.env}"
PHOTO_DIR="${ADA_PHOTO_DIR:-/var/www/vhosts/rezervasyonyap.tr/tmp/ada-online-fotolar}"

if [[ -f "$ENV_FILE" ]]; then
  set -a
  # shellcheck disable=SC1090
  source "$ENV_FILE"
  set +a
fi

echo "===== DB: Ada Villa satırı ====="
node --input-type=module <<'EOF'
import { createPgClient } from './scripts/lib/pg-client.mjs'
const pg = createPgClient()
await pg.connect()
const r = await pg.query(`
  SELECT l.id::text, l.slug, l.status, l.currency_code,
         l.vitrin_price::text, l.first_charge_amount::text,
         left(coalesce(l.featured_image_url,''), 80) AS featured,
         left(coalesce(l.thumbnail_url,''), 80) AS thumb,
         (SELECT count(*)::int FROM listing_images li WHERE li.listing_id = l.id) AS img_count,
         (SELECT count(*)::int FROM listing_price_rules pr WHERE pr.listing_id = l.id) AS price_rules,
         pc.code AS category
  FROM listings l
  JOIN product_categories pc ON pc.id = l.category_id
  WHERE l.slug IN ('fethiye-ada-villa','ada-villa')
     OR l.external_listing_ref = '672181424354502311'
  ORDER BY l.updated_at DESC NULLS LAST
`)
console.log(JSON.stringify(r.rows, null, 2))
if (r.rows[0]) {
  const id = r.rows[0].id
  const pr = await pg.query(
    `SELECT left(rule_json::text, 120) AS rule FROM listing_price_rules WHERE listing_id = $1::uuid LIMIT 3`,
    [id],
  )
  console.log('price_rule_sample:', JSON.stringify(pr.rows, null, 2))
}
await pg.end()
EOF

echo
echo "===== foto klasörü ====="
ls -la "$PHOTO_DIR" 2>/dev/null | head -15 || echo "YOK: $PHOTO_DIR"
find "$PHOTO_DIR" -type f \( -iname '*.jpg' -o -iname '*.jpeg' -o -iname '*.png' -o -iname '*.webp' -o -iname '*.avif' \) 2>/dev/null | wc -l

echo
echo "===== API: slug ara ====="
curl -sS --max-time 20 "http://127.0.0.1:8080/api/v1/catalog/public/listings?category_code=holiday_home&q=Ada&limit=5" | head -c 800
echo
curl -sS -o /dev/null -w "detail_by_slug HTTP %{http_code}\n" --max-time 15 \
  "http://127.0.0.1:8080/api/v1/catalog/public/listings/by-slug/fethiye-ada-villa" 2>/dev/null \
  || curl -sS -o /dev/null -w "alt HTTP %{http_code}\n" --max-time 15 \
  "http://127.0.0.1:8080/api/v1/catalog/public/listing-by-slug?slug=fethiye-ada-villa" || true

echo
echo "===== onarım denemesi (görsel yoksa) ====="
IMG_N=$(find "$PHOTO_DIR" -type f \( -iname '*.jpg' -o -iname '*.jpeg' -o -iname '*.png' -o -iname '*.webp' -o -iname '*.avif' \) 2>/dev/null | wc -l)
if [[ "${IMG_N// /}" -gt 0 ]]; then
  node scripts/set-villa-gallery-from-folder.mjs --slug fethiye-ada-villa --dir "$PHOTO_DIR"
  ./deploy/scripts/refresh-vitrin-prices.sh || true
else
  echo "Foto yok — Airbnb görselleriyle yeniden import:"
  echo "  node scripts/import-fethiye-ada-villa.mjs"
fi

echo
echo "===== cache temizle + web restart ====="
rm -rf frontend/.next/cache/fetch-cache 2>/dev/null || true
systemctl restart travel-web
sleep 8
curl -sS -o /dev/null -w "web %{http_code}\n" --max-time 20 http://127.0.0.1:3000/

echo "Bitti."
