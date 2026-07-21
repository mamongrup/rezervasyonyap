#!/usr/bin/env bash
# Alanya / Side otel paketi (Hotels.com listesi → Bookeder aynası).
# Odalar, galeri, fiyat + tema (denize sıfır / yetişkin / muhafazakâr / spa / lüks / butik).
#
#   cd /var/www/vhosts/rezervasyonyap.tr/httpdocs
#   git fetch origin main && git reset --hard origin/main
#   chmod +x deploy/scripts/import-alanya-side-hotels.sh
#   ./deploy/scripts/import-alanya-side-hotels.sh
#
# İsteğe bağlı: SKIP_HARVEST=1 (repo'daki JSON kullan), LIMIT=N
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
MANIFEST="$APP_ROOT/deploy/data/tatilbudur/alanya-side-hotels.manifest.json"
DATA_FILE="$APP_ROOT/deploy/data/tatilbudur/alanya-side-hotels.json"
LIMIT="${LIMIT:-0}"

cd "$APP_ROOT"

if [[ ! -f "$MANIFEST" ]]; then
  echo "[ERR] Manifest yok: $MANIFEST" >&2
  exit 1
fi

if [[ "${SKIP_HARVEST:-0}" != "1" ]]; then
  echo "[INFO] Bookeder hasat..."
  HARVEST_ARGS=(--manifest "$MANIFEST" --out "$DATA_FILE")
  if [[ "$LIMIT" != "0" ]]; then
    HARVEST_ARGS+=(--limit "$LIMIT")
  fi
  node "$APP_ROOT/scripts/harvest-ng-hotels.mjs" "${HARVEST_ARGS[@]}"
fi

if [[ ! -f "$DATA_FILE" ]]; then
  echo "[ERR] Feed yok: $DATA_FILE — önce hasat çalıştırın." >&2
  exit 1
fi

HOTEL_COUNT="$(node -e "const j=require(process.argv[1]); console.log((j.hotels||[]).length)" "$DATA_FILE")"
echo "[INFO] Import: $HOTEL_COUNT otel"

IMPORT_ARGS=(--file "$DATA_FILE" --reset)
if [[ "$LIMIT" != "0" ]]; then
  IMPORT_ARGS+=(--limit "$LIMIT")
fi

TATILBUDUR_LISTING_STATUS="${TATILBUDUR_LISTING_STATUS:-published}" \
  "$APP_ROOT/deploy/scripts/import-tatilbudur-hotels.sh" \
  "${IMPORT_ARGS[@]}"

# shellcheck source=deploy/scripts/lib/psql-env.sh
source "$APP_ROOT/deploy/scripts/lib/psql-env.sh"

# Manifest temalarını (yeniden) uygula + AI kuyruk + vitrin fiyat
node --input-type=module <<'NODE' | psql_travel -v ON_ERROR_STOP=1
import fs from 'node:fs'
const manifest = JSON.parse(fs.readFileSync('deploy/data/tatilbudur/alanya-side-hotels.manifest.json', 'utf8'))
const hotels = manifest.hotels || []
const refs = hotels.map((h) => String(h.id).replace(/'/g, "''"))
const refList = refs.map((r) => `'${r}'`).join(',')

const facetRows = []
const metaRows = []
for (const h of hotels) {
  const id = String(h.id).replace(/'/g, "''")
  const theme = String(h.themeCode || '').replace(/'/g, "''")
  const hotelType = String(h.hotelType || '').replace(/'/g, "''")
  const tags = Array.isArray(h.themeTags) ? h.themeTags : []
  const tagsJson = JSON.stringify(tags).replace(/'/g, "''")
  const adults = h.adultsOnly ? 'true' : 'false'
  const src = String(h.sourceUrl || '').replace(/'/g, "''")
  if (theme) {
    facetRows.push(`SELECT '${id}' AS ref, 'theme_code' AS key, to_jsonb('${theme}'::text) AS v`)
  }
  if (hotelType) {
    facetRows.push(`SELECT '${id}' AS ref, 'hotel_type_code' AS key, to_jsonb('${hotelType}'::text) AS v`)
  }
  metaRows.push(
    `SELECT '${id}' AS ref, jsonb_build_object('theme_tags', '${tagsJson}'::jsonb, 'adults_only', ${adults}, 'source_url', '${src}') AS patch`,
  )
}

const sql = `
WITH facet_src AS (
  ${facetRows.join('\n  UNION ALL\n  ') || "SELECT NULL::text AS ref, NULL::text AS key, NULL::jsonb AS v WHERE false"}
),
meta_src AS (
  ${metaRows.join('\n  UNION ALL\n  ') || "SELECT NULL::text AS ref, '{}'::jsonb AS patch WHERE false"}
),
facet_upsert AS (
  INSERT INTO listing_attributes (listing_id, group_code, key, value_json)
  SELECT l.id, 'hotel', f.key, f.v
  FROM facet_src f
  JOIN listings l ON l.external_provider_code = 'tatilbudur' AND l.external_listing_ref = f.ref
  WHERE f.ref IS NOT NULL
  ON CONFLICT (listing_id, group_code, key) DO UPDATE SET value_json = EXCLUDED.value_json
  RETURNING listing_id
),
meta_upsert AS (
  INSERT INTO listing_attributes (listing_id, group_code, key, value_json)
  SELECT l.id, 'listing_meta', 'v1', m.patch
  FROM meta_src m
  JOIN listings l ON l.external_provider_code = 'tatilbudur' AND l.external_listing_ref = m.ref
  WHERE m.ref IS NOT NULL
  ON CONFLICT (listing_id, group_code, key) DO UPDATE SET
    value_json = listing_attributes.value_json || EXCLUDED.value_json
  RETURNING listing_id
)
SELECT refresh_listing_vitrin_prices();

WITH target AS (
  SELECT l.id
  FROM listings l
  WHERE l.external_provider_code = 'tatilbudur'
    AND l.external_listing_ref IN (${refList || "''"})
),
queued AS (
  INSERT INTO ai_listing_content_batches
    (listing_id, category_code, phase, status, overwrite)
  SELECT t.id, 'hotel', 'tr_description', 'pending', true
  FROM target t
  WHERE NOT EXISTS (
    SELECT 1 FROM ai_listing_content_batches b
    WHERE b.listing_id = t.id AND b.status IN ('pending', 'running')
  )
  RETURNING listing_id
)
SELECT 'alanya_side_ai_queued' AS result, count(*) AS queued FROM queued;

SELECT
  l.external_listing_ref AS id,
  l.slug,
  l.status,
  l.vitrin_price::text AS vitrin_price,
  coalesce(
    case jsonb_typeof(th.value_json)
      when 'string' then th.value_json#>>'{}'
      else th.value_json->>'theme_code'
    end, ''
  ) AS theme_code,
  count(DISTINCT li.id) AS gallery_images,
  count(DISTINCT hr.id) AS rooms
FROM listings l
LEFT JOIN listing_attributes th
  ON th.listing_id = l.id AND th.group_code = 'hotel' AND th.key = 'theme_code'
LEFT JOIN listing_images li ON li.listing_id = l.id
LEFT JOIN hotel_rooms hr ON hr.listing_id = l.id
WHERE l.external_provider_code = 'tatilbudur'
  AND l.external_listing_ref IN (${refList || "''"})
GROUP BY l.id, l.external_listing_ref, l.slug, l.status, l.vitrin_price, th.value_json
ORDER BY l.external_listing_ref;
`
process.stdout.write(sql)
NODE

echo "[OK] Alanya/Side otel paketi import edildi ($HOTEL_COUNT)."
echo "[INFO] AI: systemctl start --no-block travel-ai-worker.service"
echo "[INFO] Bekleyen (Bookeder yok): Cemsa, Lofts Alanya Lina, ho4071288096, ho4006398240, MCA Marquis, Alusso Thermal"
