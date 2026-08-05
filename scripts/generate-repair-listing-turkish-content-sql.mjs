#!/usr/bin/env node
/**
 * Üretir: backend/priv/sql/modules/412_repair_listing_turkish_ascii_content.sql
 *
 * listing_translations.title/description + seo_metadata + pool description
 * içindeki Bravo charset kaybını (? → Türkçe harf) onarır.
 */
import { writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { BRAVO_TURKISH_ASCII_PAIRS } from './lib/bravo-turkish-ascii-repair.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const outPath = join(
  __dirname,
  '../backend/priv/sql/modules/412_repair_listing_turkish_ascii_content.sql',
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

const titleRep = nestReplace(`coalesce(lt.title, '')`)
const descRep = nestReplace(`coalesce(lt.description, '')`)
const seoTitleRep = nestReplace(`coalesce(sm.title, '')`)
const seoDescRep = nestReplace(`coalesce(sm.description, '')`)
const seoKwRep = nestReplace(`coalesce(sm.keywords, '')`)
const poolJsonRep = nestReplace(`coalesce(la.value_json::text, '{}')`)

const sql = `-- Türkçe charset kaybı onarımı (? → ş/ğ/ü/ö/ç/ı) — başlık / açıklama / SEO / havuz metni
-- Üret: node scripts/generate-repair-listing-turkish-content-sql.mjs
-- Bravo holiday_home açıklamalarında yaygın (Balay? → Balayı, Giri? → Giriş, …).

BEGIN;

-- 1) listing_translations (tüm diller; TR baskın hasarlı)
UPDATE listing_translations lt
SET
  title = nullif(trim(${titleRep}), ''),
  description = CASE
    WHEN coalesce(lt.description, '') = '' THEN lt.description
    ELSE ${descRep}
  END
WHERE coalesce(lt.title, '') LIKE '%?%'
   OR coalesce(lt.description, '') LIKE '%?%';

-- 2) seo_metadata (ilan)
UPDATE seo_metadata sm
SET
  title = CASE
    WHEN coalesce(sm.title, '') LIKE '%?%' THEN nullif(trim(${seoTitleRep}), '')
    ELSE sm.title
  END,
  description = CASE
    WHEN coalesce(sm.description, '') LIKE '%?%' THEN nullif(trim(${seoDescRep}), '')
    ELSE sm.description
  END,
  keywords = CASE
    WHEN coalesce(sm.keywords, '') LIKE '%?%' THEN nullif(trim(${seoKwRep}), '')
    ELSE sm.keywords
  END
WHERE sm.entity_type = 'listing'
  AND (
    coalesce(sm.title, '') LIKE '%?%'
    OR coalesce(sm.description, '') LIKE '%?%'
    OR coalesce(sm.keywords, '') LIKE '%?%'
  );

-- 3) vertical_holiday_home pools.*.description (varsa)
UPDATE listing_attributes la
SET value_json = (${poolJsonRep})::jsonb
WHERE la.group_code = 'vertical_holiday_home'
  AND la.key = 'v1'
  AND la.value_json::text LIKE '%?%';

COMMIT;
`

writeFileSync(outPath, sql)
console.log(`wrote ${outPath} (${sql.length} bytes, ${BRAVO_TURKISH_ASCII_PAIRS.length} pairs)`)
