#!/usr/bin/env node
/**
 * Üretir: backend/priv/sql/modules/423_repair_remaining_turkish_ascii_fields.sql
 * Açıklama/adres dışında kalan vitrin alanları (amenities, iptal, havuz, POI title…).
 */
import { writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { BRAVO_TURKISH_ASCII_PAIRS } from './lib/bravo-turkish-ascii-repair.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const outPath = join(
  __dirname,
  '../backend/priv/sql/modules/423_repair_remaining_turkish_ascii_fields.sql',
)

function sqlStr(value) {
  return `'${String(value).replace(/'/g, "''")}'`
}

const pairs = [...BRAVO_TURKISH_ASCII_PAIRS]
  .filter(([from, to]) => from && from !== to)
  .sort((a, b) => b[0].length - a[0].length)

const pairValues = pairs
  .map(([from, to], index) => `  (${index + 1}, ${sqlStr(from)}, ${sqlStr(to)})`)
  .join(',\n')

const sql = `-- Türkçe charset onarımı — kalan vitrin alanları (amenities / iptal / havuz / POI)
-- Üret: node scripts/generate-repair-remaining-turkish-ascii-fields-sql.mjs
-- 412–422 sonrası: imported_* label, cancellation, pool, nearby title, hotel rooms, meta owner address

BEGIN;

CREATE TEMP TABLE _turkish_ascii_repair_pairs (
  ord integer PRIMARY KEY,
  broken text NOT NULL,
  fixed text NOT NULL
) ON COMMIT DROP;

INSERT INTO _turkish_ascii_repair_pairs (ord, broken, fixed) VALUES
${pairValues};

CREATE OR REPLACE FUNCTION pg_temp.repair_listing_turkish_ascii(input_text text)
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  result_text text := input_text;
  pair_row record;
BEGIN
  IF input_text IS NULL OR position('?' IN input_text) = 0 THEN
    RETURN input_text;
  END IF;

  FOR pair_row IN
    SELECT broken, fixed
    FROM _turkish_ascii_repair_pairs
    ORDER BY ord
  LOOP
    IF position(pair_row.broken IN result_text) > 0 THEN
      result_text := replace(result_text, pair_row.broken, pair_row.fixed);
    END IF;
  END LOOP;

  result_text := regexp_replace(result_text, '(^|[^[:alpha:]])\\?zel', '\\1özel', 'g');
  result_text := regexp_replace(result_text, '(^|[^[:alpha:]])\\?ZEL', '\\1ÖZEL', 'g');

  RETURN result_text;
END;
$$;

-- 1) Bravo olanak / dahil / hariç etiketleri
UPDATE listing_attributes la
SET value_json = (
  CASE
    WHEN jsonb_typeof(la.value_json) = 'object' THEN
      la.value_json
      || jsonb_strip_nulls(jsonb_build_object(
           'label', nullif(trim(pg_temp.repair_listing_turkish_ascii(coalesce(la.value_json->>'label', ''))), ''),
           'name', nullif(trim(pg_temp.repair_listing_turkish_ascii(coalesce(la.value_json->>'name', ''))), '')
         ))
    ELSE la.value_json
  END
)
WHERE la.group_code IN ('imported_amenity', 'imported_included', 'imported_excluded')
  AND (
    coalesce(la.value_json->>'label', '') LIKE '%?%'
    OR coalesce(la.value_json->>'name', '') LIKE '%?%'
  );

-- 2) İptal metni + havuz etiketi
UPDATE listings
SET
  cancellation_policy_text = pg_temp.repair_listing_turkish_ascii(cancellation_policy_text),
  pool_size_label = nullif(trim(pg_temp.repair_listing_turkish_ascii(pool_size_label)), ''),
  updated_at = now()
WHERE coalesce(cancellation_policy_text, '') LIKE '%?%'
   OR coalesce(pool_size_label, '') LIKE '%?%';

-- 3) nearby_pois_json — title/summary/name/address/label
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
            elem || jsonb_strip_nulls(jsonb_build_object(
              'title', nullif(trim(pg_temp.repair_listing_turkish_ascii(coalesce(elem->>'title', ''))), ''),
              'summary', nullif(trim(pg_temp.repair_listing_turkish_ascii(coalesce(elem->>'summary', ''))), ''),
              'name', nullif(trim(pg_temp.repair_listing_turkish_ascii(coalesce(elem->>'name', ''))), ''),
              'address', nullif(trim(pg_temp.repair_listing_turkish_ascii(coalesce(elem->>'address', ''))), ''),
              'label', nullif(trim(pg_temp.repair_listing_turkish_ascii(coalesce(elem->>'label', ''))), '')
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

-- 4) amenities_pois_json / transport_pois_json label
WITH amenity_src AS (
  SELECT l.ctid AS row_ctid, l.amenities_pois_json AS pois
  FROM listings l
  WHERE jsonb_typeof(l.amenities_pois_json) = 'array'
    AND l.amenities_pois_json::text LIKE '%?%'
),
amenity_fixed AS (
  SELECT
    s.row_ctid,
    s.pois,
    (
      SELECT jsonb_agg(
        CASE
          WHEN jsonb_typeof(elem) = 'object' THEN
            elem || jsonb_strip_nulls(jsonb_build_object(
              'label', nullif(trim(pg_temp.repair_listing_turkish_ascii(coalesce(elem->>'label', ''))), ''),
              'title', nullif(trim(pg_temp.repair_listing_turkish_ascii(coalesce(elem->>'title', ''))), ''),
              'name', nullif(trim(pg_temp.repair_listing_turkish_ascii(coalesce(elem->>'name', ''))), '')
            ))
          ELSE elem
        END
        ORDER BY ord
      )
      FROM jsonb_array_elements(s.pois) WITH ORDINALITY AS t(elem, ord)
    ) AS new_pois
  FROM amenity_src s
)
UPDATE listings l
SET
  amenities_pois_json = f.new_pois,
  updated_at = now()
FROM amenity_fixed f
WHERE l.ctid = f.row_ctid
  AND f.new_pois IS NOT NULL
  AND f.new_pois IS DISTINCT FROM f.pois;

WITH transport_src AS (
  SELECT l.ctid AS row_ctid, l.transport_pois_json AS pois
  FROM listings l
  WHERE jsonb_typeof(l.transport_pois_json) = 'array'
    AND l.transport_pois_json::text LIKE '%?%'
),
transport_fixed AS (
  SELECT
    s.row_ctid,
    s.pois,
    (
      SELECT jsonb_agg(
        CASE
          WHEN jsonb_typeof(elem) = 'object' THEN
            elem || jsonb_strip_nulls(jsonb_build_object(
              'label', nullif(trim(pg_temp.repair_listing_turkish_ascii(coalesce(elem->>'label', ''))), ''),
              'title', nullif(trim(pg_temp.repair_listing_turkish_ascii(coalesce(elem->>'title', ''))), ''),
              'name', nullif(trim(pg_temp.repair_listing_turkish_ascii(coalesce(elem->>'name', ''))), '')
            ))
          ELSE elem
        END
        ORDER BY ord
      )
      FROM jsonb_array_elements(s.pois) WITH ORDINALITY AS t(elem, ord)
    ) AS new_pois
  FROM transport_src s
)
UPDATE listings l
SET
  transport_pois_json = f.new_pois,
  updated_at = now()
FROM transport_fixed f
WHERE l.ctid = f.row_ctid
  AND f.new_pois IS NOT NULL
  AND f.new_pois IS DISTINCT FROM f.pois;

-- 5) listing_meta owner_residence_address
UPDATE listing_attributes la
SET value_json = la.value_json
  || jsonb_strip_nulls(jsonb_build_object(
       'owner_residence_address',
       nullif(trim(pg_temp.repair_listing_turkish_ascii(coalesce(la.value_json->>'owner_residence_address', ''))), '')
     ))
WHERE la.group_code = 'listing_meta'
  AND la.key = 'v1'
  AND coalesce(la.value_json->>'owner_residence_address', '') LIKE '%?%';

-- 6) Otel oda adları
UPDATE hotel_rooms
SET name = nullif(trim(pg_temp.repair_listing_turkish_ascii(name)), '')
WHERE coalesce(name, '') LIKE '%?%';

-- 7) vertical_hotel JSON (şartlar / tesis / SSS)
UPDATE listing_attributes
SET value_json = pg_temp.repair_listing_turkish_ascii(value_json::text)::jsonb
WHERE group_code = 'vertical_hotel'
  AND key = 'v1'
  AND value_json::text LIKE '%?%';

COMMIT;
`

writeFileSync(outPath, sql)
console.log(`wrote ${outPath} (${pairs.length} pairs)`)
