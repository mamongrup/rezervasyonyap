/**
 * Bravo aktarımında eklenen "Bravo dönem N" ve otomatik "Dönem YYYY-MM-DD …" etiketlerini siler.
 *
 *   node scripts/strip-bravo-period-labels.mjs
 */

import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'

const TRAVEL_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const require = createRequire(path.join(TRAVEL_ROOT, 'frontend', 'package.json'))
const pg = require('pg')

async function main() {
  const pgClient = new pg.Client({
    host: '127.0.0.1',
    port: 5432,
    user: 'postgres',
    password: '',
    database: 'travel',
  })
  await pgClient.connect()

  const { rowCount } = await pgClient.query(`
    UPDATE listing_price_rules
    SET rule_json = rule_json - 'label'
    WHERE rule_json ? 'label'
      AND (
        rule_json->>'label' ~* '^bravo\\s+dönem'
        OR rule_json->>'label' ~* '^dönem\\s+\\d{4}-\\d{2}-\\d{2}'
      )
  `)

  console.log(`strip-bravo-period-labels: ${rowCount ?? 0} kural güncellendi`)
  await pgClient.end()
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
