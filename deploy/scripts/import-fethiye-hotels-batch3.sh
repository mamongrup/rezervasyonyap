#!/usr/bin/env bash
# Fethiye kuşağı batch-3 (14 otel + pending asri-ala-likya).
# Bookeder + AegeanHotels (veya galleryUrls) hasadı → tatilbudur import →
# tema/facet + child_policy + meal plans + AI kuyruğu + vitrin refresh.
# Ayrıca tüm mevcut tatilbudur otellerine child_policy backfill.
#
#   cd /var/www/vhosts/rezervasyonyap.tr/httpdocs
#   git fetch origin main && git reset --hard origin/main
#   chmod +x deploy/scripts/import-fethiye-hotels-batch3.sh
#   SKIP_HARVEST=1 TATILBUDUR_LISTING_STATUS=published ./deploy/scripts/import-fethiye-hotels-batch3.sh
#
# Yeniden hasat: SKIP_HARVEST=0 (varsayılan) veya:
#   node scripts/harvest-ng-hotels.mjs --manifest deploy/data/tatilbudur/fethiye-hotels-batch3.manifest.json \
#     --out deploy/data/tatilbudur/fethiye-hotels-batch3.json
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
MANIFEST="$APP_ROOT/deploy/data/tatilbudur/fethiye-hotels-batch3.manifest.json"
DATA="$APP_ROOT/deploy/data/tatilbudur/fethiye-hotels-batch3.json"
LIMIT="${LIMIT:-0}"

cd "$APP_ROOT"

if [[ "${SKIP_HARVEST:-0}" != "1" ]]; then
  echo "[INFO] Fethiye batch-3 Bookeder/Aegean/gallery hasat..."
  HARVEST_ARGS=(--manifest "$MANIFEST" --out "$DATA")
  if [[ "$LIMIT" != "0" ]]; then
    HARVEST_ARGS+=(--limit "$LIMIT")
  fi
  node "$APP_ROOT/scripts/harvest-ng-hotels.mjs" "${HARVEST_ARGS[@]}"
fi

if [[ ! -f "$DATA" ]]; then
  echo "[ERR] Feed yok: $DATA — önce harvest çalıştırın" >&2
  exit 1
fi

# Oda görselleri: Restaurant/Lobby/Exterior etiketlerini odadan çıkar
node "$APP_ROOT/scripts/fix-hotel-room-images-in-feed.mjs" "$DATA"

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
const locRows = []
const childRows = []

function childPolicyFor(h) {
  const adultsOnly =
    Boolean(h.adultsOnly) || String(h.themeCode || '') === 'adults_only'
  const infantsFree = h.infantsFree === false ? false : true
  const chargePercent = Number(h.childChargePercent ?? 50) || 50
  if (adultsOnly) {
    return {
      free_max_age: null,
      charge_percent: chargePercent,
      infants_free: infantsFree,
      children_allowed: false,
      charge_max_age: 12,
    }
  }
  const freeRaw = h.freeChildMaxAge
  const freeMax =
    freeRaw == null || freeRaw === ''
      ? 6
      : Math.max(0, Math.min(17, Number(freeRaw)))
  return {
    free_max_age: Number.isFinite(freeMax) ? freeMax : 6,
    charge_percent: chargePercent,
    infants_free: infantsFree,
    children_allowed: true,
    charge_max_age: 12,
  }
}

for (const h of hotels) {
  const id = String(h.id).replace(/'/g, "''")
  const theme = String(h.themeCode || '').replace(/'/g, "''")
  const hotelType = String(h.hotelType || '').replace(/'/g, "''")
  const tags = Array.isArray(h.themeTags) ? h.themeTags : []
  const tagsJson = JSON.stringify(tags).replace(/'/g, "''")
  const adults = h.adultsOnly ? 'true' : 'false'
  const src = String(h.sourceUrl || '').replace(/'/g, "''")
  const district = String(h.district || '').replace(/'/g, "''")
  const city = String(h.city || '').replace(/'/g, "''")
  const province = String(h.provinceCity || '').replace(/'/g, "''")
  const address = String(h.address || '').replace(/'/g, "''")
  const lat = h.lat != null ? Number(h.lat) : null
  const lng = h.lng != null ? Number(h.lng) : null
  const locationName = [district, city, province].filter(Boolean).join(', ').replace(/'/g, "''")
  if (theme) {
    facetRows.push(`SELECT '${id}' AS ref, 'theme_code' AS key, to_jsonb('${theme}'::text) AS v`)
  }
  if (hotelType) {
    facetRows.push(`SELECT '${id}' AS ref, 'hotel_type_code' AS key, to_jsonb('${hotelType}'::text) AS v`)
  }
  if (tags.length > 0) {
    facetRows.push(`SELECT '${id}' AS ref, 'theme_tags' AS key, '${tagsJson}'::jsonb AS v`)
  }
  metaRows.push(
    `SELECT '${id}' AS ref, jsonb_build_object('theme_tags', '${tagsJson}'::jsonb, 'adults_only', ${adults}, 'source_url', '${src}', 'district_label', '${district}', 'city', '${city}', 'province_city', '${province}', 'address', '${address}') AS patch`,
  )
  if (lat != null && lng != null) {
    locRows.push(
      `SELECT '${id}' AS ref, '${locationName}' AS location_name, ${lat}::float8 AS lat, ${lng}::float8 AS lng, '${src}' AS source_url`,
    )
  }
  const cp = childPolicyFor(h)
  const cpJson = JSON.stringify(cp).replace(/'/g, "''")
  childRows.push(`SELECT '${id}' AS ref, '${cpJson}'::jsonb AS policy`)
}
const mealRows = hotels.map((h) => {
  const id = String(h.id).replace(/'/g, "''")
  const board = String(h.boardType || 'Her Şey Dahil')
  let code = 'all_inclusive'
  let label = 'Her Şey Dahil'
  let labelEn = 'All Inclusive'
  if (/helal/i.test(board) && /her şey|all.?incl/i.test(board)) {
    code = 'halal_all_inclusive'
    label = 'Helal Her Şey Dahil'
    labelEn = 'Halal All Inclusive'
  } else if (/helal/i.test(board)) {
    code = 'halal_bed_breakfast'
    label = 'Helal Oda Kahvaltı'
    labelEn = 'Halal Bed & Breakfast'
  } else if (/oda.?kahvalt|bed.?breakfast|b&b/i.test(board)) {
    code = 'bed_breakfast'
    label = 'Oda Kahvaltı'
    labelEn = 'Bed & Breakfast'
  } else if (/ultra/i.test(board)) {
    code = 'ultra_all_inclusive'
    label = 'Ultra Her Şey Dahil'
    labelEn = 'Ultra All Inclusive'
  }
  return `SELECT '${id}' AS ref, '${code}' AS meal_code, '${label.replace(/'/g, "''")}' AS meal_label, '${labelEn.replace(/'/g, "''")}' AS meal_label_en`
}).join('\n  UNION ALL\n  ')

const sql = `
WITH facet_src AS (
  ${facetRows.join('\n  UNION ALL\n  ') || "SELECT NULL::text AS ref, NULL::text AS key, NULL::jsonb AS v WHERE false"}
),
meta_src AS (
  ${metaRows.join('\n  UNION ALL\n  ') || "SELECT NULL::text AS ref, '{}'::jsonb AS patch WHERE false"}
),
loc_src AS (
  ${locRows.join('\n  UNION ALL\n  ') || "SELECT NULL::text AS ref, NULL::text AS location_name, NULL::float8 AS lat, NULL::float8 AS lng, NULL::text AS source_url WHERE false"}
),
meal_src AS (
  ${mealRows || "SELECT NULL::text AS ref, NULL::text AS meal_code, NULL::text AS meal_label, NULL::text AS meal_label_en WHERE false"}
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
  SELECT l.id, 'listing_meta', 'v1', COALESCE(la.value_json, '{}'::jsonb) || m.patch
  FROM meta_src m
  JOIN listings l ON l.external_provider_code = 'tatilbudur' AND l.external_listing_ref = m.ref
  LEFT JOIN listing_attributes la ON la.listing_id = l.id AND la.group_code = 'listing_meta' AND la.key = 'v1'
  WHERE m.ref IS NOT NULL
  ON CONFLICT (listing_id, group_code, key) DO UPDATE SET
    value_json = listing_attributes.value_json || EXCLUDED.value_json
  RETURNING listing_id
),
loc_upd AS (
  UPDATE listings l
  SET location_name = s.location_name,
      map_lat = s.lat,
      map_lng = s.lng,
      updated_at = now()
  FROM loc_src s
  WHERE l.external_provider_code = 'tatilbudur' AND l.external_listing_ref = s.ref
  RETURNING l.id
),
src_upd AS (
  UPDATE listing_hotel_details d
  SET etstur_property_ref = CASE WHEN s.source_url LIKE '%etstur.com%' THEN s.source_url ELSE d.etstur_property_ref END,
      tatilcom_property_ref = CASE WHEN s.source_url NOT LIKE '%etstur.com%' THEN s.source_url ELSE d.tatilcom_property_ref END
  FROM loc_src s
  JOIN listings l ON l.external_provider_code = 'tatilbudur' AND l.external_listing_ref = s.ref
  WHERE d.listing_id = l.id
  RETURNING d.listing_id
),
src_ins AS (
  INSERT INTO listing_hotel_details (listing_id, etstur_property_ref, tatilcom_property_ref)
  SELECT l.id,
    CASE WHEN s.source_url LIKE '%etstur.com%' THEN s.source_url ELSE NULL END,
    CASE WHEN s.source_url NOT LIKE '%etstur.com%' THEN s.source_url ELSE NULL END
  FROM loc_src s
  JOIN listings l ON l.external_provider_code = 'tatilbudur' AND l.external_listing_ref = s.ref
  WHERE NOT EXISTS (SELECT 1 FROM listing_hotel_details d WHERE d.listing_id = l.id)
  RETURNING listing_id
),
meal_ins AS (
  INSERT INTO listing_meal_plans (
    listing_id, plan_code, label, label_en, price_per_night, currency_code, is_active
  )
  SELECT
    l.id,
    m.meal_code,
    m.meal_label,
    m.meal_label_en,
    COALESCE((
      SELECT MIN((r.rule_json->>'base_nightly')::numeric)
      FROM listing_price_rules r
      WHERE r.listing_id = l.id AND nullif(r.rule_json->>'base_nightly', '') IS NOT NULL
    ), 0),
    'TRY',
    true
  FROM meal_src m
  JOIN listings l ON l.external_provider_code = 'tatilbudur' AND l.external_listing_ref = m.ref
  WHERE COALESCE((
    SELECT MIN((r.rule_json->>'base_nightly')::numeric)
    FROM listing_price_rules r
    WHERE r.listing_id = l.id AND nullif(r.rule_json->>'base_nightly', '') IS NOT NULL
  ), 0) > 0
  ON CONFLICT (listing_id, plan_code) DO UPDATE SET
    label = EXCLUDED.label,
    label_en = EXCLUDED.label_en,
    price_per_night = EXCLUDED.price_per_night,
    currency_code = EXCLUDED.currency_code,
    is_active = true
  RETURNING listing_id
)
SELECT refresh_listing_vitrin_prices();

-- 1) Tüm tatilbudur otellerine child_policy backfill (adults_only → çocuk yok; diğerleri 6 yaş / %50)
WITH tb AS (
  SELECT l.id,
    COALESCE(
      (SELECT trim(both '"' from la.value_json::text) FROM listing_attributes la
       WHERE la.listing_id = l.id AND la.group_code = 'hotel' AND la.key = 'theme_code' LIMIT 1),
      ''
    ) AS theme_code,
    COALESCE(
      (SELECT (la.value_json->>'adults_only')::boolean FROM listing_attributes la
       WHERE la.listing_id = l.id AND la.group_code = 'listing_meta' AND la.key = 'v1' LIMIT 1),
      false
    ) AS adults_meta
  FROM listings l
  WHERE l.external_provider_code = 'tatilbudur'
),
policy_src AS (
  SELECT id,
    CASE
      WHEN theme_code = 'adults_only' OR adults_meta IS TRUE THEN
        jsonb_build_object(
          'free_max_age', null,
          'charge_percent', 50,
          'infants_free', true,
          'children_allowed', false,
          'charge_max_age', 12
        )
      ELSE
        jsonb_build_object(
          'free_max_age', 6,
          'charge_percent', 50,
          'infants_free', true,
          'children_allowed', true,
          'charge_max_age', 12
        )
    END AS policy
  FROM tb
),
backfill AS (
  INSERT INTO listing_attributes (listing_id, group_code, key, value_json)
  SELECT id, 'hotel', 'child_policy', policy
  FROM policy_src
  ON CONFLICT (listing_id, group_code, key) DO UPDATE SET value_json = EXCLUDED.value_json
  RETURNING listing_id
)
SELECT 'child_policy_backfill' AS result, count(*) AS n FROM backfill;

-- 2) Batch manifest child_policy (backfill üzerine yazar — hotel.freeChildMaxAge vb.)
WITH child_src AS (
  ${childRows.join('\n  UNION ALL\n  ') || "SELECT NULL::text AS ref, '{}'::jsonb AS policy WHERE false"}
),
child_upsert AS (
  INSERT INTO listing_attributes (listing_id, group_code, key, value_json)
  SELECT l.id, 'hotel', 'child_policy', c.policy
  FROM child_src c
  JOIN listings l ON l.external_provider_code = 'tatilbudur' AND l.external_listing_ref = c.ref
  WHERE c.ref IS NOT NULL
  ON CONFLICT (listing_id, group_code, key) DO UPDATE SET value_json = EXCLUDED.value_json
  RETURNING listing_id
)
SELECT 'child_policy_batch' AS result, count(*) AS n FROM child_upsert;

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

SELECT l.external_listing_ref AS id, l.slug, l.status, l.vitrin_price::text,
  l.location_name,
  (SELECT la.value_json FROM listing_attributes la
   WHERE la.listing_id = l.id AND la.group_code = 'hotel' AND la.key = 'child_policy' LIMIT 1) AS child_policy,
  count(DISTINCT li.id) AS gallery_images,
  count(DISTINCT hr.id) AS rooms,
  count(DISTINCT hr.id) FILTER (WHERE nullif(hr.meta_json->>'image', '') IS NOT NULL) AS rooms_with_images
FROM listings l
LEFT JOIN listing_images li ON li.listing_id = l.id
LEFT JOIN hotel_rooms hr ON hr.listing_id = l.id
WHERE l.external_provider_code = 'tatilbudur'
  AND l.external_listing_ref IN (${refList || "''"})
GROUP BY l.id, l.external_listing_ref, l.slug, l.status, l.vitrin_price, l.location_name
ORDER BY l.external_listing_ref;
`
process.stdout.write(sql)
NODE
}

count="$(node -e "const j=require(process.argv[1]); console.log((j.hotels||[]).length)" "$DATA")"
echo "[INFO] Import fethiye-batch3: $count otel"
args=(--file "$DATA" --reset)
if [[ "$LIMIT" != "0" ]]; then
  args+=(--limit "$LIMIT")
fi
TATILBUDUR_LISTING_STATUS="${TATILBUDUR_LISTING_STATUS:-published}" \
  "$APP_ROOT/deploy/scripts/import-tatilbudur-hotels.sh" \
  "${args[@]}"

apply_manifest_facets "$MANIFEST" "fethiye_batch3"

if [[ -x "$APP_ROOT/deploy/scripts/refresh-vitrin-prices.sh" ]]; then
  echo "[INFO] refresh-vitrin-prices.sh..."
  "$APP_ROOT/deploy/scripts/refresh-vitrin-prices.sh" || true
fi

echo "[OK] Fethiye hotels batch-3 import tamam ($count otel)."
echo "[INFO] Pending: asri-ala-likya-hotel (bookeder_mirror_not_found)"
echo "[INFO] AI: systemctl start --no-block travel-ai-worker.service"
echo "[INFO] veya: ./deploy/scripts/ensure-ai-social-workers.sh"
