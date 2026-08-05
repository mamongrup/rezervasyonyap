#!/usr/bin/env node
/**
 * Üretir: backend/priv/sql/modules/410_repair_listing_turkish_ascii_locations.sql
 */
import { writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { BRAVO_TURKISH_ASCII_PAIRS } from './lib/bravo-turkish-ascii-repair.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const outPath = join(
  __dirname,
  '../backend/priv/sql/modules/410_repair_listing_turkish_ascii_locations.sql',
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

const sql = `-- Türkçe charset kaybı onarımı (? → ş/ğ/ü/ö/ç/ı) — adres / konum / bölge meta
-- Üret: node scripts/generate-repair-listing-turkish-locations-sql.mjs
-- Arama: translate(ş→s) '?' ile eşleşmez; Ka?/T?rkiye gibi değerler bölge aramasını bozar.

BEGIN;

-- 1) listing_meta alanları
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

-- 3) Tatil evi: boş district/city/province/region_display doldur (arama + vitrin)
WITH holiday AS (
  SELECT
    l.id AS listing_id,
    la.ctid AS attr_ctid,
    coalesce(la.value_json, '{}'::jsonb) AS meta,
    lower(translate(
      coalesce(nullif(trim(la.value_json->>'address'), ''), nullif(trim(l.location_name), ''), ''),
      'üğışöçÜĞİŞÖÇ',
      'ugisocugisoc'
    )) AS hay
  FROM listings l
  JOIN product_categories pc ON pc.id = l.category_id AND pc.code = 'holiday_home'
  LEFT JOIN listing_attributes la
    ON la.listing_id = l.id AND la.group_code = 'listing_meta' AND la.key = 'v1'
),
guessed AS (
  SELECT
    h.*,
    CASE
      WHEN h.hay ~ '(^|[,/ ])kalkan([,/ ]|$)' THEN 'Kalkan'
      WHEN h.hay ~ '(^|[,/ ])oludeniz([,/ ]|$)' THEN 'Ölüdeniz'
      WHEN h.hay ~ '(^|[,/ ])kayakoy([,/ ]|$)' THEN 'Kayaköy'
      WHEN h.hay ~ '(^|[,/ ])islamlar([,/ ]|$)' THEN 'İslamlar'
      WHEN h.hay ~ '(^|[,/ ])patara([,/ ]|$)' THEN 'Patara'
      WHEN h.hay ~ '(^|[,/ ])calis([,/ ]|$)' THEN 'Çalış'
      WHEN h.hay ~ '(^|[,/ ])ovacik([,/ ]|$)' THEN 'Ovacık'
      WHEN h.hay ~ '(^|[,/ ])hisaronu([,/ ]|$)' THEN 'Hisarönü'
      ELSE NULL
    END AS district_guess,
    CASE
      WHEN h.hay ~ '(^|[,/ ])kas([,/ ]|$)' OR h.hay ~ '(^|[,/ ])kalkan([,/ ]|$)' THEN 'Kaş'
      WHEN h.hay ~ '(^|[,/ ])fethiye([,/ ]|$)' OR h.hay ~ '(^|[,/ ])oludeniz([,/ ]|$)' OR h.hay ~ '(^|[,/ ])kayakoy([,/ ]|$)' OR h.hay ~ '(^|[,/ ])calis([,/ ]|$)' OR h.hay ~ '(^|[,/ ])ovacik([,/ ]|$)' OR h.hay ~ '(^|[,/ ])hisaronu([,/ ]|$)' THEN 'Fethiye'
      WHEN h.hay ~ '(^|[,/ ])bodrum([,/ ]|$)' THEN 'Bodrum'
      WHEN h.hay ~ '(^|[,/ ])marmaris([,/ ]|$)' THEN 'Marmaris'
      WHEN h.hay ~ '(^|[,/ ])datca([,/ ]|$)' THEN 'Datça'
      WHEN h.hay ~ '(^|[,/ ])cesme([,/ ]|$)' THEN 'Çeşme'
      WHEN h.hay ~ '(^|[,/ ])alanya([,/ ]|$)' THEN 'Alanya'
      WHEN h.hay ~ '(^|[,/ ])side([,/ ]|$)' THEN 'Side'
      WHEN h.hay ~ '(^|[,/ ])belek([,/ ]|$)' THEN 'Belek'
      ELSE NULL
    END AS city_guess,
    CASE
      WHEN h.hay ~ 'antalya' OR h.hay ~ '(^|[,/ ])kas([,/ ]|$)' OR h.hay ~ 'kalkan' OR h.hay ~ 'alanya' OR h.hay ~ 'side' OR h.hay ~ 'belek' THEN 'Antalya'
      WHEN h.hay ~ 'mugla' OR h.hay ~ 'fethiye' OR h.hay ~ 'bodrum' OR h.hay ~ 'marmaris' OR h.hay ~ 'datca' OR h.hay ~ 'oludeniz' THEN 'Muğla'
      WHEN h.hay ~ 'izmir' OR h.hay ~ 'cesme' THEN 'İzmir'
      WHEN h.hay ~ 'aydin' OR h.hay ~ 'kusadasi' OR h.hay ~ 'didim' THEN 'Aydın'
      ELSE NULL
    END AS province_guess
  FROM holiday h
),
filled AS (
  SELECT
    g.listing_id,
    g.attr_ctid,
    g.meta,
    coalesce(nullif(trim(g.meta->>'district_label'), ''), g.district_guess) AS district_label,
    coalesce(nullif(trim(g.meta->>'city'), ''), g.city_guess) AS city,
    coalesce(nullif(trim(g.meta->>'province_city'), ''), g.province_guess) AS province_city
  FROM guessed g
)
UPDATE listing_attributes la
SET value_json = la.value_json || jsonb_strip_nulls(jsonb_build_object(
  'district_label',
    CASE WHEN nullif(trim(coalesce(la.value_json->>'district_label', '')), '') IS NULL
      THEN nullif(trim(f.district_label), '') ELSE NULL END,
  'city',
    CASE WHEN nullif(trim(coalesce(la.value_json->>'city', '')), '') IS NULL
      THEN nullif(trim(f.city), '') ELSE NULL END,
  'province_city',
    CASE WHEN nullif(trim(coalesce(la.value_json->>'province_city', '')), '') IS NULL
      THEN nullif(trim(f.province_city), '') ELSE NULL END,
  'region_display',
    CASE WHEN nullif(trim(coalesce(la.value_json->>'region_display', '')), '') IS NULL
      THEN nullif(trim(both FROM concat_ws(', ',
        coalesce(nullif(trim(coalesce(la.value_json->>'district_label', '')), ''), nullif(trim(f.district_label), '')),
        coalesce(nullif(trim(coalesce(la.value_json->>'city', '')), ''), nullif(trim(f.city), '')),
        coalesce(nullif(trim(coalesce(la.value_json->>'province_city', '')), ''), nullif(trim(f.province_city), ''))
      )), '')
      ELSE NULL END
))
FROM filled f
WHERE la.ctid = f.attr_ctid
  AND f.attr_ctid IS NOT NULL
  AND (
    (nullif(trim(coalesce(la.value_json->>'district_label', '')), '') IS NULL AND nullif(trim(f.district_label), '') IS NOT NULL)
    OR (nullif(trim(coalesce(la.value_json->>'city', '')), '') IS NULL AND nullif(trim(f.city), '') IS NOT NULL)
    OR (nullif(trim(coalesce(la.value_json->>'province_city', '')), '') IS NULL AND nullif(trim(f.province_city), '') IS NOT NULL)
    OR (nullif(trim(coalesce(la.value_json->>'region_display', '')), '') IS NULL AND (
      nullif(trim(f.district_label), '') IS NOT NULL
      OR nullif(trim(f.city), '') IS NOT NULL
      OR nullif(trim(f.province_city), '') IS NOT NULL
    ))
  );

INSERT INTO listing_attributes (listing_id, group_code, key, value_json)
SELECT
  f.listing_id,
  'listing_meta',
  'v1',
  jsonb_strip_nulls(jsonb_build_object(
    'district_label', nullif(trim(f.district_label), ''),
    'city', nullif(trim(f.city), ''),
    'province_city', nullif(trim(f.province_city), ''),
    'region_display', nullif(trim(both FROM concat_ws(', ',
      nullif(trim(f.district_label), ''),
      nullif(trim(f.city), ''),
      nullif(trim(f.province_city), '')
    )), '')
  ))
FROM (
  WITH holiday AS (
    SELECT
      l.id AS listing_id,
      la.ctid AS attr_ctid,
      coalesce(la.value_json, '{}'::jsonb) AS meta,
      lower(translate(
        coalesce(nullif(trim(la.value_json->>'address'), ''), nullif(trim(l.location_name), ''), ''),
        'üğışöçÜĞİŞÖÇ',
        'ugisocugisoc'
      )) AS hay
    FROM listings l
    JOIN product_categories pc ON pc.id = l.category_id AND pc.code = 'holiday_home'
    LEFT JOIN listing_attributes la
      ON la.listing_id = l.id AND la.group_code = 'listing_meta' AND la.key = 'v1'
  ),
  guessed AS (
    SELECT
      h.*,
      CASE
        WHEN h.hay ~ '(^|[,/ ])kalkan([,/ ]|$)' THEN 'Kalkan'
        WHEN h.hay ~ '(^|[,/ ])oludeniz([,/ ]|$)' THEN 'Ölüdeniz'
        WHEN h.hay ~ '(^|[,/ ])kayakoy([,/ ]|$)' THEN 'Kayaköy'
        WHEN h.hay ~ '(^|[,/ ])islamlar([,/ ]|$)' THEN 'İslamlar'
        WHEN h.hay ~ '(^|[,/ ])patara([,/ ]|$)' THEN 'Patara'
        WHEN h.hay ~ '(^|[,/ ])calis([,/ ]|$)' THEN 'Çalış'
        WHEN h.hay ~ '(^|[,/ ])ovacik([,/ ]|$)' THEN 'Ovacık'
        WHEN h.hay ~ '(^|[,/ ])hisaronu([,/ ]|$)' THEN 'Hisarönü'
        ELSE NULL
      END AS district_guess,
      CASE
        WHEN h.hay ~ '(^|[,/ ])kas([,/ ]|$)' OR h.hay ~ '(^|[,/ ])kalkan([,/ ]|$)' THEN 'Kaş'
        WHEN h.hay ~ '(^|[,/ ])fethiye([,/ ]|$)' OR h.hay ~ '(^|[,/ ])oludeniz([,/ ]|$)' OR h.hay ~ '(^|[,/ ])kayakoy([,/ ]|$)' OR h.hay ~ '(^|[,/ ])calis([,/ ]|$)' OR h.hay ~ '(^|[,/ ])ovacik([,/ ]|$)' OR h.hay ~ '(^|[,/ ])hisaronu([,/ ]|$)' THEN 'Fethiye'
        WHEN h.hay ~ '(^|[,/ ])bodrum([,/ ]|$)' THEN 'Bodrum'
        WHEN h.hay ~ '(^|[,/ ])marmaris([,/ ]|$)' THEN 'Marmaris'
        WHEN h.hay ~ '(^|[,/ ])datca([,/ ]|$)' THEN 'Datça'
        WHEN h.hay ~ '(^|[,/ ])cesme([,/ ]|$)' THEN 'Çeşme'
        WHEN h.hay ~ '(^|[,/ ])alanya([,/ ]|$)' THEN 'Alanya'
        WHEN h.hay ~ '(^|[,/ ])side([,/ ]|$)' THEN 'Side'
        WHEN h.hay ~ '(^|[,/ ])belek([,/ ]|$)' THEN 'Belek'
        ELSE NULL
      END AS city_guess,
      CASE
        WHEN h.hay ~ 'antalya' OR h.hay ~ '(^|[,/ ])kas([,/ ]|$)' OR h.hay ~ 'kalkan' OR h.hay ~ 'alanya' OR h.hay ~ 'side' OR h.hay ~ 'belek' THEN 'Antalya'
        WHEN h.hay ~ 'mugla' OR h.hay ~ 'fethiye' OR h.hay ~ 'bodrum' OR h.hay ~ 'marmaris' OR h.hay ~ 'datca' OR h.hay ~ 'oludeniz' THEN 'Muğla'
        WHEN h.hay ~ 'izmir' OR h.hay ~ 'cesme' THEN 'İzmir'
        WHEN h.hay ~ 'aydin' OR h.hay ~ 'kusadasi' OR h.hay ~ 'didim' THEN 'Aydın'
        ELSE NULL
      END AS province_guess
    FROM holiday h
  )
  SELECT
    g.listing_id,
    g.attr_ctid,
    coalesce(nullif(trim(g.meta->>'district_label'), ''), g.district_guess) AS district_label,
    coalesce(nullif(trim(g.meta->>'city'), ''), g.city_guess) AS city,
    coalesce(nullif(trim(g.meta->>'province_city'), ''), g.province_guess) AS province_city
  FROM guessed g
) f
WHERE f.attr_ctid IS NULL
  AND (
    nullif(trim(f.district_label), '') IS NOT NULL
    OR nullif(trim(f.city), '') IS NOT NULL
    OR nullif(trim(f.province_city), '') IS NOT NULL
  );

-- 4) location_name boş / bozuksa bölge meta'dan üret (vitrin + arama)
UPDATE listings l
SET
  location_name = nullif(trim(both FROM concat_ws(', ',
    nullif(trim(la.value_json->>'district_label'), ''),
    nullif(trim(la.value_json->>'city'), ''),
    nullif(trim(la.value_json->>'province_city'), '')
  )), ''),
  updated_at = now()
FROM listing_attributes la, product_categories pc
WHERE la.listing_id = l.id
  AND la.group_code = 'listing_meta'
  AND la.key = 'v1'
  AND pc.id = l.category_id
  AND pc.code = 'holiday_home'
  AND (
    nullif(trim(coalesce(l.location_name, '')), '') IS NULL
    OR l.location_name LIKE '%?%'
  )
  AND nullif(trim(both FROM concat_ws(', ',
    nullif(trim(la.value_json->>'district_label'), ''),
    nullif(trim(la.value_json->>'city'), ''),
    nullif(trim(la.value_json->>'province_city'), '')
  )), '') IS NOT NULL;

COMMIT;
`

writeFileSync(outPath, sql, 'utf8')
console.log('Wrote', outPath, `(${Buffer.byteLength(sql, 'utf8')} bytes)`)
