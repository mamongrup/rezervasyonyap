import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const json = readFileSync(
  join(root, 'backend/priv/sql/data/holiday_home_default_faq_common.json'),
  'utf8',
).trim()

const sql = `-- Tatil evi vitrin SSS şablonu — 10 sık sorulan madde (6 dil). Platform ayarını günceller / yoksa ekler.
-- Kaynak: frontend/src/data/holiday-home-default-faq.ts

INSERT INTO site_settings (id, organization_id, key, value_json)
VALUES (gen_random_uuid(), NULL, 'catalog.holiday_home_default_faq', $faq$${json}$faq$::jsonb)
ON CONFLICT (key) WHERE organization_id IS NULL
DO UPDATE SET value_json = EXCLUDED.value_json;
`

writeFileSync(join(root, 'backend/priv/sql/modules/302_holiday_home_default_faq_common_seed.sql'), sql, 'utf8')
console.log('wrote 302_holiday_home_default_faq_common_seed.sql')
