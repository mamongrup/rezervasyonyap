#!/usr/bin/env node
/**
 * Zehra Villa 2026 Excel fiyat listesini tatil evi ilanlarına uygular.
 *
 * Excel BRÜT kolonları haftalık liste fiyatıdır; siteye
 *   base_nightly = round(BRÜT / 7)
 * yazılır (misafir fiyatı). Net/komisyon kolonları kullanılmaz.
 *
 *   # yerel / sunucu (backend.env veya PG* / DATABASE_URL)
 *   node scripts/apply-zehra-villa-2026-prices.mjs
 *   node scripts/apply-zehra-villa-2026-prices.mjs --dry-run
 *   node scripts/apply-zehra-villa-2026-prices.mjs --only nokta-vip-d-villa,tlos-dream-villa
 *
 * Üretim:
 *   cd /var/www/vhosts/rezervasyonyap.tr/httpdocs
 *   set -a && source /etc/rezervasyonyap/backend.env && set +a
 *   node scripts/apply-zehra-villa-2026-prices.mjs
 *   # ardından vitrin fiyat tazeleme (varsa):
 *   ./deploy/scripts/refresh-vitrin-prices.sh
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createPgClient } from './lib/pg-client.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const DATA_PATH = path.join(ROOT, 'deploy/data/zehra-villa-2026-prices.json')

const argv = process.argv.slice(2)
const DRY_RUN = argv.includes('--dry-run')
const onlyIdx = argv.indexOf('--only')
const ONLY = onlyIdx >= 0
  ? new Set(
      String(argv[onlyIdx + 1] || '')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
    )
  : null

function ruleJson(season) {
  return {
    base_nightly: String(season.base_nightly),
    weekly_total: String(season.weekly_brut),
    weekend_nightly: '',
    label: season.label || '',
    min_nights: String(season.min_nights || 7),
    source: 'zehra_villa_2026',
    price_sheet: 'Zehra Villa 2026',
  }
}

async function main() {
  if (!fs.existsSync(DATA_PATH)) {
    console.error(`[FAIL] veri yok: ${DATA_PATH}`)
    process.exit(1)
  }
  const data = JSON.parse(fs.readFileSync(DATA_PATH, 'utf8'))
  let listings = data.listings || []
  if (ONLY?.size) listings = listings.filter((l) => ONLY.has(l.slug))

  console.log(`[INFO] ${listings.length} ilan · dry_run=${DRY_RUN}`)
  console.log(`[INFO] ${data.note}`)

  const pg = createPgClient()
  await pg.connect()

  const report = { updated: [], missing: [], skipped: [] }

  try {
    for (const row of listings) {
      const found = await pg.query(
        `SELECT id::text, title, status, vitrin_price::text
         FROM listings WHERE slug = $1 LIMIT 1`,
        [row.slug],
      )
      if (!found.rows.length) {
        report.missing.push(row.slug)
        console.warn(`[MISS] ${row.slug} (${row.excel_name})`)
        continue
      }
      const listing = found.rows[0]
      const nightlyMin = row.vitrin_price
      console.log(
        `[PLAN] ${row.slug} · ${listing.title} · seasons=${row.seasons.length} · vitrin→${nightlyMin}`,
      )

      if (DRY_RUN) {
        report.skipped.push(row.slug)
        continue
      }

      await pg.query('BEGIN')
      try {
        await pg.query(`DELETE FROM listing_price_rules WHERE listing_id = $1::uuid`, [
          listing.id,
        ])
        for (const season of row.seasons) {
          await pg.query(
            `INSERT INTO listing_price_rules (listing_id, rule_json, valid_from, valid_to)
             VALUES ($1::uuid, $2::jsonb, $3::date, $4::date)`,
            [listing.id, JSON.stringify(ruleJson(season)), season.from, season.to],
          )
        }
        await pg.query(
          `UPDATE listings SET
             currency_code = 'TRY',
             min_stay_nights = COALESCE(min_stay_nights, 7),
             vitrin_price = $2,
             updated_at = now()
           WHERE id = $1::uuid`,
          [listing.id, nightlyMin],
        )
        await pg.query(
          `INSERT INTO listing_attributes (listing_id, group_code, key, value_json)
           VALUES ($1::uuid, 'listing_meta', 'v1', $2::jsonb)
           ON CONFLICT (listing_id, group_code, key) DO UPDATE SET
             value_json = COALESCE(listing_attributes.value_json, '{}'::jsonb) || EXCLUDED.value_json`,
          [
            listing.id,
            JSON.stringify({
              zehra_villa_2026_synced_at: new Date().toISOString(),
              zehra_villa_2026_excel_name: row.excel_name,
              price_min: String(nightlyMin),
              price_max: String(Math.max(...row.seasons.map((s) => s.base_nightly))),
            }),
          ],
        )
        await pg.query('COMMIT')
        report.updated.push(row.slug)
        console.log(`[OK] ${row.slug}`)
      } catch (e) {
        await pg.query('ROLLBACK')
        throw e
      }
    }
  } finally {
    await pg.end()
  }

  console.log(
    JSON.stringify(
      {
        updated: report.updated.length,
        missing: report.missing.length,
        dry_run_planned: report.skipped.length,
        missing_slugs: report.missing,
      },
      null,
      2,
    ),
  )
}

main().catch((e) => {
  console.error('[FAIL]', e)
  process.exit(1)
})
