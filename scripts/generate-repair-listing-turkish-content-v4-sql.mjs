#!/usr/bin/env node
/**
 * Üretir: backend/priv/sql/modules/417_repair_listing_turkish_ascii_content_v4.sql
 *
 * 416'daki yüzlerce iç içe replace() PostgreSQL parser/stack sınırına takılabilir.
 * Bu sürüm aynı sözlüğü geçici tablo + PL/pgSQL döngüsüyle tek satır fonksiyonunda
 * uygular; gerçek soru işaretlerini yalnız bilinen bozuk kalıplar eşleşirse değiştirir.
 */
import { writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { BRAVO_TURKISH_ASCII_PAIRS } from './lib/bravo-turkish-ascii-repair.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const outPath = join(
  __dirname,
  '../backend/priv/sql/modules/417_repair_listing_turkish_ascii_content_v4.sql',
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

const sql = `-- Türkçe charset onarımı v4: 416 parser/stack-safe tekrar
-- ç/ğ/ı/ö/ş/ü + Ç/Ğ/İ/Ö/Ş/Ü; gerçek soru işaretleri korunur.
-- Üret: node scripts/generate-repair-listing-turkish-content-v4-sql.mjs

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

  -- Kelime başındaki özel örnekleri ortadaki g?zel gibi sözcüklerle karıştırma.
  result_text := regexp_replace(result_text, '(^|[^[:alpha:]])\\?zel', '\\1özel', 'g');
  result_text := regexp_replace(result_text, '(^|[^[:alpha:]])\\?ZEL', '\\1ÖZEL', 'g');

  RETURN result_text;
END;
$$;

-- İlan çevirileri: veri kaybı tüm aktif çeviri alanlarında oluşmuş olabilir.
UPDATE listing_translations
SET
  title = nullif(trim(pg_temp.repair_listing_turkish_ascii(title)), ''),
  description = pg_temp.repair_listing_turkish_ascii(description)
WHERE coalesce(title, '') LIKE '%?%'
   OR coalesce(description, '') LIKE '%?%';

UPDATE seo_metadata
SET
  title = pg_temp.repair_listing_turkish_ascii(title),
  description = pg_temp.repair_listing_turkish_ascii(description),
  keywords = pg_temp.repair_listing_turkish_ascii(keywords)
WHERE entity_type = 'listing'
  AND (
    coalesce(title, '') LIKE '%?%'
    OR coalesce(description, '') LIKE '%?%'
    OR coalesce(keywords, '') LIKE '%?%'
  );

UPDATE listing_attributes
SET value_json = pg_temp.repair_listing_turkish_ascii(value_json::text)::jsonb
WHERE group_code = 'vertical_holiday_home'
  AND key = 'v1'
  AND value_json::text LIKE '%?%';

COMMIT;
`

writeFileSync(outPath, sql)
console.log(`wrote ${outPath} (${sql.length} bytes, ${pairs.length} pairs)`)
