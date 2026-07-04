/**
 * Tatil evi / yat theme_codes içindeki alias kodları kanonik kodlara indirger
 * ve yinelenenleri siler (deniz_manzarali→sea_view, ozel_havuzlu→pool, jakuzili→jacuzzi).
 *
 *   node scripts/backfill-theme-code-aliases.mjs --dry-run
 *   node scripts/backfill-theme-code-aliases.mjs
 */
import { createPgClient } from './lib/pg-client.mjs'

const DRY_RUN = process.argv.includes('--dry-run')

const ALIASES = {
  deniz_manzarali: 'sea_view',
  deniz_manzarasi: 'sea_view',
  ozel_havuzlu: 'pool',
  ozel_havuz: 'pool',
  private_pool: 'pool',
  jakuzili: 'jacuzzi',
  jakuzi: 'jacuzzi',
  spa: 'jacuzzi',
  genis_aile_evi: 'family',
  kalabalik_aile: 'family',
  denize_sifir: 'beachfront',
  balayi_evi: 'honeymoon',
  muhafazakar: 'conservative',
}

function canonicalizeCodes(codes) {
  const seen = new Set()
  const out = []
  for (const raw of codes || []) {
    const k = String(raw ?? '').trim().toLowerCase()
    if (!k) continue
    const canon = ALIASES[k] ?? k
    if (seen.has(canon)) continue
    seen.add(canon)
    out.push(canon)
  }
  return out
}

function sameCodes(a, b) {
  if (a.length !== b.length) return false
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false
  return true
}

const pg = createPgClient()
await pg.connect()

try {
  const tables = [
    { table: 'listing_holiday_home_details', label: 'holiday_home' },
    { table: 'listing_yacht_details', label: 'yacht_charter' },
  ]

  const summary = {}

  for (const { table, label } of tables) {
    const { rows } = await pg.query(
      `SELECT listing_id::text AS id, theme_codes FROM ${table} WHERE theme_codes IS NOT NULL AND cardinality(theme_codes) > 0`,
    )
    let fixed = 0
    for (const row of rows) {
      const next = canonicalizeCodes(row.theme_codes)
      if (sameCodes(row.theme_codes, next)) continue
      fixed += 1
      if (!DRY_RUN) {
        await pg.query(`UPDATE ${table} SET theme_codes = $2::text[] WHERE listing_id = $1::uuid`, [
          row.id,
          next,
        ])
      }
    }
    summary[label] = { scanned: rows.length, fixed }
  }

  console.log(JSON.stringify({ dryRun: DRY_RUN, ...summary }, null, 2))
} finally {
  await pg.end()
}
