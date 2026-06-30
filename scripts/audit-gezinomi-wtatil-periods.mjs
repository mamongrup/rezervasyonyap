/**
 * Wtatil ↔ Gezinomi dönem karşılaştırması (tur kodu eşleştirmesi)
 *
 *   node scripts/audit-gezinomi-wtatil-periods.mjs --limit 20
 *   node scripts/audit-gezinomi-wtatil-periods.mjs --slug balkan-guzelleri-...-wt-25631
 *   node scripts/audit-gezinomi-wtatil-periods.mjs --mismatch-only
 *   node scripts/audit-gezinomi-wtatil-periods.mjs --json > report.json
 *
 * Gerekli: PG*, GEIZINOMI_DELAY_MS=800
 */

import { fetchGezinomiTourDetail, summarizeGezinomiPeriods } from './lib/gezinomi-api.mjs'
import { matchListingToGezinomi } from './lib/gezinomi-match.mjs'
import {
  compareTourPeriods,
  formatPeriodCompareSummary,
  summarizeWtatilPeriods,
} from './lib/gezinomi-period-compare.mjs'
import { createPgClient } from './lib/pg-client.mjs'

const args = new Set(process.argv.slice(2))
const MISMATCH_ONLY = args.has('--mismatch-only')
const JSON_OUT = args.has('--json')
const limitIdx = process.argv.indexOf('--limit')
const LIMIT = limitIdx >= 0 ? Number(process.argv[limitIdx + 1]) : 0
const slugIdx = process.argv.indexOf('--slug')
const SLUG_FILTER = slugIdx >= 0 ? process.argv[slugIdx + 1] : ''
const DELAY_MS = Number(process.env.GEIZINOMI_DELAY_MS || 800)

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms))
}

async function loadListings(pgClient) {
  let sql = `
    SELECT l.id::text AS listing_id, l.slug, lt.title,
           l.external_listing_ref AS wtatil_id,
           ltd.program_days_json
    FROM listings l
    JOIN listing_translations lt ON lt.listing_id = l.id
    JOIN locales loc ON loc.id = lt.locale_id AND loc.code = 'tr'
    LEFT JOIN listing_tour_details ltd ON ltd.listing_id = l.id
    WHERE l.external_provider_code = 'wtatil'
  `
  const params = []
  if (SLUG_FILTER) {
    params.push(SLUG_FILTER)
    sql += ` AND l.slug = $${params.length}`
  }
  sql += ` ORDER BY l.slug`
  if (LIMIT > 0) sql += ` LIMIT ${LIMIT}`
  const { rows } = await pgClient.query(sql, params)
  return rows
}

async function savePeriodAudit(pgClient, listingId, meta) {
  await pgClient.query(
    `INSERT INTO listing_attributes (listing_id, group_code, key, value_json)
     VALUES ($1::uuid, 'gezinomi', 'period_compare_at', $2::jsonb)
     ON CONFLICT (listing_id, group_code, key) DO UPDATE SET value_json = EXCLUDED.value_json`,
    [listingId, JSON.stringify(meta)],
  )
}

async function main() {
  const pgClient = createPgClient()
  await pgClient.connect()

  const listings = await loadListings(pgClient)
  const reports = []
  const stats = { total: 0, matched: 0, noMatch: 0, inSync: 0, mismatch: 0, noPeriods: 0 }

  for (const row of listings) {
    stats.total++
    let match
    try {
      match = await matchListingToGezinomi({ slug: row.slug, title: row.title })
    } catch (e) {
      reports.push({ slug: row.slug, error: e.message })
      continue
    }

    if (!match) {
      stats.noMatch++
      if (!MISMATCH_ONLY && !JSON_OUT) {
        console.log(`${row.slug} → eşleşme yok`)
      }
      reports.push({ slug: row.slug, wtatilId: row.wtatil_id, match: null })
      await sleep(DELAY_MS)
      continue
    }
    stats.matched++

    const detail = await fetchGezinomiTourDetail(match)
    const gezinomiPeriods = summarizeGezinomiPeriods(detail.model)
    const wtatilPeriods = summarizeWtatilPeriods(row.program_days_json)
    const compare = compareTourPeriods(wtatilPeriods, gezinomiPeriods)

    if (!compare.matchedCount && !compare.wtatilCount && !compare.gezinomiCount) {
      stats.noPeriods++
    } else if (compare.inSync) {
      stats.inSync++
    } else {
      stats.mismatch++
    }

    const report = {
      slug: row.slug,
      listingId: row.listing_id,
      wtatilId: row.wtatil_id,
      gezinomiProductId: match.productId,
      gezinomiLink: match.link,
      gezinomiName: match.name,
      matchScore: match.score,
      matchQuery: match.query,
      pageUrl: detail.pageUrl,
      summary: formatPeriodCompareSummary(compare),
      wtatilPeriods,
      gezinomiPeriods,
      compare,
    }
    reports.push(report)

    await savePeriodAudit(pgClient, row.listing_id, {
      at: new Date().toISOString(),
      tour_code: String(match.productId),
      gezinomi_link: match.link,
      summary: report.summary,
      ...compare,
    })

    if (!JSON_OUT && (!MISMATCH_ONLY || !compare.inSync)) {
      console.log(
        `${row.slug} → tur=${match.productId} wtatil=${compare.wtatilCount} gezinomi=${compare.gezinomiCount} ${report.summary}`,
      )
      if (!compare.inSync && compare.onlyWtatilCount) {
        console.log(`  yalnız wtatil: ${compare.onlyWtatil.map((p) => p.label || `${p.start}-${p.end}`).join('; ')}`)
      }
      if (!compare.inSync && compare.onlyGezinomiCount) {
        console.log(`  yalnız gezinomi: ${compare.onlyGezinomi.map((p) => p.label || `${p.start}-${p.end}`).join('; ')}`)
      }
    }

    await sleep(DELAY_MS)
  }

  await pgClient.end()

  if (JSON_OUT) {
    console.log(JSON.stringify({ stats, reports }, null, 2))
    return
  }

  console.log(
    `\nÖzet: ${stats.total} ilan, ${stats.matched} eşleşme, ${stats.noMatch} eşleşme yok, ` +
      `${stats.inSync} uyumlu, ${stats.mismatch} farklı, ${stats.noPeriods} dönemsiz`,
  )
}

main().catch((e) => {
  console.error(e.message || e)
  process.exit(1)
})
