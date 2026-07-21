#!/usr/bin/env bash
# Alanya/Side/Manavgat Hotels.com batch-2 + önceki batch oda görseli düzeltmesi.
#
#   cd /var/www/vhosts/rezervasyonyap.tr/httpdocs
#   git fetch origin main && git reset --hard origin/main
#   chmod +x deploy/scripts/import-alanya-side-hotels-batch2.sh
#   SKIP_HARVEST=1 ./deploy/scripts/import-alanya-side-hotels-batch2.sh
#
# SKIP_BATCH1_REIMPORT=1 → yalnızca batch-2
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
MANIFEST2="$APP_ROOT/deploy/data/tatilbudur/alanya-side-hotels-batch2.manifest.json"
DATA2="$APP_ROOT/deploy/data/tatilbudur/alanya-side-hotels-batch2.json"
MANIFEST1="$APP_ROOT/deploy/data/tatilbudur/alanya-side-hotels.manifest.json"
DATA1="$APP_ROOT/deploy/data/tatilbudur/alanya-side-hotels.json"
LIMIT="${LIMIT:-0}"

cd "$APP_ROOT"

# Oda görselleri: Restaurant/Lobby/Exterior etiketlerini odadan çıkar
node "$APP_ROOT/scripts/fix-hotel-room-images-in-feed.mjs" \
  "$DATA1" "$DATA2" \
  "$APP_ROOT/deploy/data/tatilbudur/palmeras-beach-hotel.json" \
  "$APP_ROOT/deploy/data/tatilbudur/ng-hotels-5.json" \
  "$APP_ROOT/deploy/data/tatilbudur/fethiye-belt-14.json" \
  "$APP_ROOT/deploy/data/tatilbudur/adrasan-beltom-beach-hotel.json" \
  2>/dev/null || true

if [[ "${SKIP_HARVEST:-0}" != "1" ]]; then
  echo "[INFO] Batch-2 Bookeder hasat..."
  HARVEST_ARGS=(--manifest "$MANIFEST2" --out "$DATA2")
  if [[ "$LIMIT" != "0" ]]; then
    HARVEST_ARGS+=(--limit "$LIMIT")
  fi
  node "$APP_ROOT/scripts/harvest-ng-hotels.mjs" "${HARVEST_ARGS[@]}"
fi

if [[ ! -f "$DATA2" ]]; then
  echo "[ERR] Feed yok: $DATA2" >&2
  exit 1
fi

# shellcheck source=deploy/scripts/lib/psql-env.sh
source "$APP_ROOT/deploy/scripts/lib/psql-env.sh"

apply_manifest_facets() {
  local manifest_path="$1"
  local label="$2"
  MANIFEST_PATH="$manifest_path" LABEL="$label" node --input-type=module <<'NODE' | psql_travel -v ON_ERROR_STOP=1
import fs from 'node:fs'
const manifest = JSON.parse(fs.readFileSync(process.env.MANIFEST_PATH, 'utf8'))
const label = process.env.LABEL || 'batch'
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
  SELECT l.id FROM listings l
  WHERE l.external_provider_code = 'tatilbudur'
    AND l.external_listing_ref IN (${refList || "''"})
),
queued AS (
  INSERT INTO ai_listing_content_batches (listing_id, category_code, phase, status, overwrite)
  SELECT t.id, 'hotel', 'tr_description', 'pending', true
  FROM target t
  WHERE NOT EXISTS (
    SELECT 1 FROM ai_listing_content_batches b
    WHERE b.listing_id = t.id AND b.status IN ('pending', 'running')
  )
  RETURNING listing_id
)
SELECT '${label}_ai_queued' AS result, count(*) AS queued FROM queued;

SELECT l.external_listing_ref AS id, l.slug, l.vitrin_price::text,
  count(DISTINCT li.id) AS gallery_images,
  count(DISTINCT hr.id) AS rooms
FROM listings l
LEFT JOIN listing_images li ON li.listing_id = l.id
LEFT JOIN hotel_rooms hr ON hr.listing_id = l.id
WHERE l.external_provider_code = 'tatilbudur'
  AND l.external_listing_ref IN (${refList || "''"})
GROUP BY l.id, l.external_listing_ref, l.slug, l.vitrin_price
ORDER BY l.external_listing_ref;
`
process.stdout.write(sql)
NODE
}

import_one() {
  local file="$1"
  local manifest="$2"
  local label="$3"
  local count
  count="$(node -e "const j=require(process.argv[1]); console.log((j.hotels||[]).length)" "$file")"
  echo "[INFO] Import $label: $count otel"
  local args=(--file "$file" --reset)
  if [[ "$LIMIT" != "0" ]]; then
    args+=(--limit "$LIMIT")
  fi
  TATILBUDUR_LISTING_STATUS="${TATILBUDUR_LISTING_STATUS:-published}" \
    "$APP_ROOT/deploy/scripts/import-tatilbudur-hotels.sh" \
    "${args[@]}"
  apply_manifest_facets "$manifest" "$label"
}

import_one "$DATA2" "$MANIFEST2" "batch2"

if [[ "${SKIP_BATCH1_REIMPORT:-0}" != "1" && -f "$DATA1" && -f "$MANIFEST1" ]]; then
  echo "[INFO] Batch-1 yeniden import (düzeltilmiş oda görselleri)..."
  import_one "$DATA1" "$MANIFEST1" "batch1"
fi

# Diğer Bookeder paketleri yalnızca oda görseli için yeniden import (opsiyonel)
if [[ "${REIMPORT_OTHER_FEEDS:-0}" == "1" ]]; then
  for pair in \
    "deploy/data/tatilbudur/palmeras-beach-hotel.json|deploy/data/tatilbudur/palmeras-beach-hotel.manifest.json|palmeras" \
    "deploy/data/tatilbudur/ng-hotels-5.json|deploy/data/tatilbudur/ng-hotels-5.manifest.json|ng5" \
    "deploy/data/tatilbudur/fethiye-belt-14.json|deploy/data/tatilbudur/fethiye-belt-14.manifest.json|fethiye"; do
    IFS='|' read -r f m lab <<<"$pair"
    if [[ -f "$APP_ROOT/$f" ]]; then
      echo "[INFO] Reimport $lab (oda görselleri)..."
      TATILBUDUR_LISTING_STATUS="${TATILBUDUR_LISTING_STATUS:-published}" \
        "$APP_ROOT/deploy/scripts/import-tatilbudur-hotels.sh" --file "$APP_ROOT/$f" --reset
    fi
  done
fi

echo "[OK] Batch-2 import tamam (40 otel + batch-1 oda görseli)."
echo "[INFO] AI: systemctl start --no-block travel-ai-worker.service"
echo "[INFO] Diğer feed oda düzeltmesi: REIMPORT_OTHER_FEEDS=1 $0"
