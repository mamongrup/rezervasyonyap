/**
 * Wtatil tur vitrin denetimi — vertical_tour vs snapshot/catalog.
 *
 *   node scripts/audit-wtatil-tour-vitrin.mjs
 *   node scripts/audit-wtatil-tour-vitrin.mjs --limit 50
 *   node scripts/audit-wtatil-tour-vitrin.mjs --missing-only
 */

import { createPgClient } from './lib/pg-client.mjs'
import { buildWtatilVerticalTourFromDbRow } from './lib/wtatil-listing-db.mjs'

const DEFAULT_ORG = 'a0000000-0000-4000-8000-000000000001'

const args = new Set(process.argv.slice(2))
const MISSING_ONLY = args.has('--missing-only')
const limitIdx = process.argv.indexOf('--limit')
const LIMIT = limitIdx >= 0 ? Number(process.argv[limitIdx + 1]) : 0

function unwrapVertical(data) {
  if (!data || typeof data !== 'object') return {}
  const root = data
  if (root.data && typeof root.data === 'object' && !Array.isArray(root.data)) return root.data
  return root
}

function fieldScore(meta) {
  let n = 0
  if (meta.duration_days) n++
  if (meta.travel_type) n++
  if (meta.accommodation_type) n++
  if (meta.visa_required === true) n++
  if (meta.is_guided) n++
  if (Array.isArray(meta.includes) && meta.includes.length) n++
  if (Array.isArray(meta.excludes) && meta.excludes.length) n++
  if (Array.isArray(meta.itinerary) && meta.itinerary.length) n++
  return n
}

async function main() {
  const orgId = process.env.WTATIL_ORG_ID || DEFAULT_ORG
  const pgClient = createPgClient()
  await pgClient.connect()

  try {
    let sql = `
      SELECT l.slug,
             l.external_listing_ref,
             snap.value_json AS snapshot,
             vt.value_json AS vertical_tour,
             ltd.program_days_json
      FROM listings l
      JOIN product_categories pc ON pc.id = l.category_id AND pc.code = 'tour'
      LEFT JOIN listing_attributes snap
        ON snap.listing_id = l.id AND snap.group_code = 'wtatil' AND snap.key = 'snapshot'
      LEFT JOIN listing_attributes vt
        ON vt.listing_id = l.id AND vt.group_code = 'vertical_tour' AND vt.key = 'v1'
      LEFT JOIN listing_tour_details ltd ON ltd.listing_id = l.id
      WHERE l.organization_id = $1::uuid
        AND l.external_provider_code = 'wtatil'
      ORDER BY l.slug ASC`
    const params = [orgId]
    if (LIMIT > 0) {
      params.push(LIMIT)
      sql += ` LIMIT $${params.length}`
    }

    const { rows } = await pgClient.query(sql, params)

    const summary = {
      total: rows.length,
      no_vertical: 0,
      sparse_vertical: 0,
      ok: 0,
      no_snapshot: 0,
    }
    const sparse = []

    for (const row of rows) {
      if (!row.snapshot) summary.no_snapshot += 1

      const stored = unwrapVertical(row.vertical_tour)
      const storedScore = fieldScore(stored)
      const expected = buildWtatilVerticalTourFromDbRow({
        snapshotJson: row.snapshot,
        programDaysJson: row.program_days_json,
      })
      const expectedScore = expected ? fieldScore(expected) : 0

      if (!row.vertical_tour || storedScore === 0) {
        summary.no_vertical += 1
        if (!MISSING_ONLY || expectedScore > 0) {
          sparse.push({
            slug: row.slug,
            ref: row.external_listing_ref,
            storedScore,
            expectedScore,
            issue: 'no_vertical_tour',
          })
        }
        continue
      }

      if (storedScore < 3 && expectedScore >= 3) {
        summary.sparse_vertical += 1
        sparse.push({
          slug: row.slug,
          ref: row.external_listing_ref,
          storedScore,
          expectedScore,
          issue: 'sparse_vertical',
        })
        continue
      }

      summary.ok += 1
    }

    console.log('=== Wtatil vitrin özeti ===')
    console.log(summary)

    if (sparse.length) {
      console.log('\n=== Eksik / seyrek vertical_tour ===')
      console.table(sparse.slice(0, 50))
      if (sparse.length > 50) console.log(`… +${sparse.length - 50} daha`)
      console.log('\nBackfill: node scripts/backfill-wtatil-tour-vitrin.mjs')
      console.log('API ile: node scripts/backfill-wtatil-tour-vitrin.mjs --from-api')
    }
  } finally {
    await pgClient.end()
  }
}

main().catch((err) => {
  console.error(err.message || err)
  process.exit(1)
})
