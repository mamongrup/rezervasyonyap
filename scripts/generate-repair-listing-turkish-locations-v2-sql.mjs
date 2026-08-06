#!/usr/bin/env node
/**
 * Üretir: backend/priv/sql/modules/422_repair_listing_turkish_ascii_locations_v2.sql
 * 410 sonrası eklenen Bay?nd?r vb. kalıpları + güncel BRAVO sözlüğünü adres/konum alanlarına uygular.
 */
import { writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { BRAVO_TURKISH_ASCII_PAIRS } from './lib/bravo-turkish-ascii-repair.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const outPath = join(
  __dirname,
  '../backend/priv/sql/modules/422_repair_listing_turkish_ascii_locations_v2.sql',
)

function sqlStr(s) {
  return `'${String(s).replace(/'/g, "''")}'`
}

function nestReplace(expr) {
  let e = expr
  for (const [from, to] of BRAVO_TURKISH_ASCII_PAIRS) {
    if (from === to) continue
    e = `replace(${e}, ${sqlStr(from)}, ${sqlStr(to)})`
  }
  return e
}

const addr = nestReplace(`coalesce(la.value_json->>'address', '')`)
const city = nestReplace(`coalesce(la.value_json->>'city', '')`)
const district = nestReplace(`coalesce(la.value_json->>'district_label', '')`)
const province = nestReplace(`coalesce(la.value_json->>'province_city', '')`)
const regionDisp = nestReplace(`coalesce(la.value_json->>'region_display', '')`)
const locName = nestReplace(`coalesce(l.location_name, '')`)
const poiName = nestReplace(`coalesce(elem->>'name', '')`)
const poiAddr = nestReplace(`coalesce(elem->>'address', '')`)

const sql = `-- Türkçe charset kaybı onarımı v2 (? → ş/ğ/ü/ö/ç/ı) — adres / konum / bölge / nearby POI
-- Üret: node scripts/generate-repair-listing-turkish-locations-v2-sql.mjs
-- 410 sonrası sözlüğe eklenen Bay?nd?r vb. kalıplar; panel harita «Gerçek Adres» alanı.

BEGIN;

-- 1) listing_meta konum alanları
WITH repaired AS (
  SELECT
    la.ctid AS row_ctid,
    la.value_json
      || jsonb_strip_nulls(jsonb_build_object(
           'address', nullif(trim(${addr}), ''),
           'city', nullif(trim(${city}), ''),
           'district_label', nullif(trim(${district}), ''),
           'province_city', nullif(trim(${province}), ''),
           'region_display', nullif(trim(${regionDisp}), '')
         )) AS new_json
  FROM listing_attributes la
  WHERE la.group_code = 'listing_meta'
    AND la.key = 'v1'
    AND (
      coalesce(la.value_json->>'address', '') LIKE '%?%'
      OR coalesce(la.value_json->>'city', '') LIKE '%?%'
      OR coalesce(la.value_json->>'district_label', '') LIKE '%?%'
      OR coalesce(la.value_json->>'province_city', '') LIKE '%?%'
      OR coalesce(la.value_json->>'region_display', '') LIKE '%?%'
    )
)
UPDATE listing_attributes la
SET value_json = r.new_json
FROM repaired r
WHERE la.ctid = r.row_ctid
  AND la.value_json IS DISTINCT FROM r.new_json;

-- 2) listings.location_name
UPDATE listings l
SET
  location_name = nullif(trim(${locName}), ''),
  updated_at = now()
WHERE coalesce(l.location_name, '') LIKE '%?%'
  AND nullif(trim(${locName}), '') IS DISTINCT FROM l.location_name;

-- 3) listings.nearby_pois_json ad / adres (vitrin mesafe listesi)
WITH poi_src AS (
  SELECT
    l.ctid AS row_ctid,
    l.nearby_pois_json AS pois
  FROM listings l
  WHERE jsonb_typeof(l.nearby_pois_json) = 'array'
    AND l.nearby_pois_json::text LIKE '%?%'
),
poi_fixed AS (
  SELECT
    s.row_ctid,
    s.pois,
    (
      SELECT jsonb_agg(
        CASE
          WHEN jsonb_typeof(elem) = 'object' THEN
            elem
            || jsonb_strip_nulls(jsonb_build_object(
                 'name', nullif(trim(${poiName}), ''),
                 'address', nullif(trim(${poiAddr}), '')
               ))
          ELSE elem
        END
        ORDER BY ord
      )
      FROM jsonb_array_elements(s.pois) WITH ORDINALITY AS t(elem, ord)
    ) AS new_pois
  FROM poi_src s
)
UPDATE listings l
SET
  nearby_pois_json = f.new_pois,
  updated_at = now()
FROM poi_fixed f
WHERE l.ctid = f.row_ctid
  AND f.new_pois IS NOT NULL
  AND f.new_pois IS DISTINCT FROM f.pois;

COMMIT;
`

writeFileSync(outPath, sql)
console.log(`wrote ${outPath} (${BRAVO_TURKISH_ASCII_PAIRS.length} pairs)`)
