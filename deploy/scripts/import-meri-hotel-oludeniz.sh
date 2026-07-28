#!/usr/bin/env bash
# Meri Hotel Ölüdeniz (Tatilsepeti) — eksiksiz aktarım + AI dil/SEO kuyruğu.
#
#   chmod +x deploy/scripts/import-meri-hotel-oludeniz.sh
#   ./deploy/scripts/import-meri-hotel-oludeniz.sh
#   TATILSEPETI_LISTING_STATUS=published ./deploy/scripts/import-meri-hotel-oludeniz.sh
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
BACKEND_ENV="${TRAVEL_DB_ENV:-/etc/rezervasyonyap/backend.env}"
EDITORIAL="$APP_ROOT/deploy/data/tatilsepeti/meri-hotel-oludeniz.description.tr.html"
PACKAGE_OUT="$APP_ROOT/deploy/data/tatilsepeti/meri-hotel-oludeniz.package.json"

if [[ -f "$BACKEND_ENV" ]]; then
  set -a
  # shellcheck disable=SC1090
  source "$BACKEND_ENV"
  set +a
fi

# Yerel Laragon / cloud: backend.env yoksa workspace backend.env
if [[ ! -f "$BACKEND_ENV" && -f "$APP_ROOT/backend/backend.env" ]]; then
  set -a
  # shellcheck disable=SC1091
  source "$APP_ROOT/backend/backend.env"
  set +a
fi

cd "$APP_ROOT"
export NODE_OPTIONS="${NODE_OPTIONS:+$NODE_OPTIONS }--dns-result-order=ipv4first"

echo "→ PostgreSQL bağlantı testi…"
node scripts/test-pg-env.mjs

echo "→ Meri Hotel Ölüdeniz Tatilsepeti aktarımı…"
TATILSEPETI_LISTING_STATUS="${TATILSEPETI_LISTING_STATUS:-published}" \
  node scripts/import-tatilsepeti-one-hotel.mjs \
    --url "https://www.tatilsepeti.com/meri-hotel-oludeniz" \
    --slug "meri-hotel-oludeniz" \
    --hotel-id "7661" \
    --name "Meri Hotel Ölüdeniz" \
    --editorial-html "$EDITORIAL" \
    --package-out "$PACKAGE_OUT" \
    "$@"

echo "→ Vitrin fiyat önbelleği…"
"$APP_ROOT/deploy/scripts/refresh-vitrin-prices.sh" 2>/dev/null || {
  # Yerel: fonksiyon varsa çağır
  if command -v psql >/dev/null 2>&1; then
    psql -h "${PGHOST:-127.0.0.1}" -U "${PGUSER:-postgres}" -d "${PGDATABASE:-travel}" \
      -c "SELECT refresh_listing_vitrin_prices();" >/dev/null && echo "[OK] refresh_listing_vitrin_prices" \
      || echo "[WARN] vitrin_price atlandı"
  else
    echo "[WARN] vitrin_price atlandı"
  fi
}

echo "→ Konum / harita (Nominatim doğrulanmış Meri Hotel Ölüdeniz)…"
psql -h "${PGHOST:-127.0.0.1}" -U "${PGUSER:-postgres}" -d "${PGDATABASE:-travel}" -v ON_ERROR_STOP=1 <<'SQL'
UPDATE listings
SET map_lat = 36.5553736,
    map_lng = 29.1126094,
    location_name = 'Ölüdeniz, Fethiye, Muğla',
    review_avg = COALESCE(review_avg, 8.8),
    updated_at = now()
WHERE external_provider_code = 'tatilsepeti'
  AND external_listing_ref = '7661';
SQL


# shellcheck source=deploy/scripts/lib/psql-env.sh
if [[ -f "$APP_ROOT/deploy/scripts/lib/psql-env.sh" ]]; then
  # shellcheck disable=SC1091
  source "$APP_ROOT/deploy/scripts/lib/psql-env.sh" || true
fi

if declare -F psql_travel >/dev/null 2>&1; then
  psql_travel -v ON_ERROR_STOP=1 <<'SQL'
SELECT
  l.id,
  l.slug,
  l.status,
  l.vitrin_price,
  l.location_name,
  count(DISTINCT lt.locale_id) AS language_count,
  count(DISTINCT li.id) AS gallery_image_count,
  count(DISTINCT hr.id) AS room_count,
  count(DISTINCT hr.id) FILTER (
    WHERE nullif(hr.meta_json->>'image', '') IS NOT NULL
       OR jsonb_typeof(hr.meta_json->'images') = 'array'
  ) AS rooms_with_images
FROM listings l
LEFT JOIN listing_translations lt ON lt.listing_id = l.id
LEFT JOIN listing_images li ON li.listing_id = l.id
LEFT JOIN hotel_rooms hr ON hr.listing_id = l.id
WHERE l.external_provider_code = 'tatilsepeti'
  AND l.external_listing_ref = '7661'
GROUP BY l.id, l.slug, l.status, l.vitrin_price, l.location_name;
SQL
else
  psql -h "${PGHOST:-127.0.0.1}" -U "${PGUSER:-postgres}" -d "${PGDATABASE:-travel}" -v ON_ERROR_STOP=1 <<'SQL'
SELECT
  l.id,
  l.slug,
  l.status,
  l.vitrin_price,
  l.location_name,
  count(DISTINCT lt.locale_id) AS language_count,
  count(DISTINCT li.id) AS gallery_image_count,
  count(DISTINCT hr.id) AS room_count,
  count(DISTINCT hr.id) FILTER (
    WHERE nullif(hr.meta_json->>'image', '') IS NOT NULL
       OR jsonb_typeof(hr.meta_json->'images') = 'array'
  ) AS rooms_with_images
FROM listings l
LEFT JOIN listing_translations lt ON lt.listing_id = l.id
LEFT JOIN listing_images li ON li.listing_id = l.id
LEFT JOIN hotel_rooms hr ON hr.listing_id = l.id
WHERE l.external_provider_code = 'tatilsepeti'
  AND l.external_listing_ref = '7661'
GROUP BY l.id, l.slug, l.status, l.vitrin_price, l.location_name;
SQL
fi

echo "[OK] Meri Hotel Ölüdeniz aktarıldı."
echo "[INFO] AI worker (üretim): systemctl start --no-block travel-ai-worker.service"
