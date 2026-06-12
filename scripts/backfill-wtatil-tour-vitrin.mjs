/**
 * Mevcut Wtatil tur ilanları — vitrin eksik alan backfill.
 *
 * Eşleştirilen alanlar:
 *   - listing_attributes vertical_tour/v1 — süre, ulaşım, vize, dahil/hariç, gün gün program
 *   - listing_attributes wtatil/snapshot — katalog yenileme (--from-api)
 *   - listing_translations.description — program + genel şartlar
 *
 *   node scripts/backfill-wtatil-tour-vitrin.mjs
 *   node scripts/backfill-wtatil-tour-vitrin.mjs --dry-run --limit 20
 *   node scripts/backfill-wtatil-tour-vitrin.mjs --from-api --limit 50
 *   node scripts/backfill-wtatil-tour-vitrin.mjs --slug kapadokya-turu-wt-1234
 */

import {
  fetchWtatilToken,
  fetchAllTours,
  loadWtatilConfigAsync,
} from './lib/wtatil-api.mjs'
import { enrichWtatilTour } from './lib/wtatil-enrich.mjs'
import {
  resolveImportContext,
  refreshWtatilTourVitrin,
  buildWtatilVerticalTourFromDbRow,
} from './lib/wtatil-listing-db.mjs'
import {
  applyWtatilTourVitrinFields,
  buildWtatilTourSnapshot,
  buildWtatilTourVitrinPackage,
} from './lib/wtatil-tour-map.mjs'
import { createPgClient } from './lib/pg-client.mjs'

const DEFAULT_ORG = 'a0000000-0000-4000-8000-000000000001'

const args = new Set(process.argv.slice(2))
const DRY_RUN = args.has('--dry-run')
const FROM_API = args.has('--from-api')
const slugIdx = process.argv.indexOf('--slug')
const SLUG = slugIdx >= 0 ? process.argv[slugIdx + 1]?.trim() : ''
const limitIdx = process.argv.indexOf('--limit')
const LIMIT = limitIdx >= 0 ? Number(process.argv[limitIdx + 1]) : 0

function verticalTourLooksEmpty(valueJson) {
  if (!valueJson || typeof valueJson !== 'object') return true
  const root = valueJson
  const data =
    root.data && typeof root.data === 'object' && !Array.isArray(root.data) ? root.data : root
  const keys = ['duration_days', 'travel_type', 'includes', 'itinerary']
  for (const k of keys) {
    const v = data[k]
    if (Array.isArray(v) && v.length) return false
    if (typeof v === 'string' && v.trim()) return false
    if (typeof v === 'boolean' && v) return false
  }
  return true
}

async function main() {
  const orgId = process.env.WTATIL_ORG_ID || DEFAULT_ORG
  const pgClient = createPgClient()
  await pgClient.connect()

  let tourById = null
  let agencyId = null
  let userName = null
  let token = null

  if (FROM_API) {
    const auth = await fetchWtatilToken()
    userName = auth.userName
    token = auth.token
    const cfg = await loadWtatilConfigAsync()
    agencyId = cfg.agencyId
    const tours = await fetchAllTours(userName, token, Number(process.env.WTATIL_PAGE_SIZE || 50))
    tourById = new Map(tours.map((t) => [String(t.id), t]))
    console.log(`API katalog: ${tours.length} tur`)
  }

  try {
    const ctx = await resolveImportContext(pgClient, orgId)

    let sql = `
      SELECT l.id::text AS id,
             l.slug,
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
        AND l.external_listing_ref IS NOT NULL`
    const params = [ctx.orgId]
    if (SLUG) {
      params.push(SLUG)
      sql += ` AND l.slug = $${params.length}`
    }
    sql += ' ORDER BY l.slug ASC'
    if (LIMIT > 0) {
      params.push(LIMIT)
      sql += ` LIMIT $${params.length}`
    }

    const { rows } = await pgClient.query(sql, params)
    console.log(`Wtatil tur: ${rows.length} ilan${DRY_RUN ? ' (dry-run)' : ''}`)

    const stats = { ok: 0, skip: 0, apiMiss: 0, empty: 0 }

    for (const row of rows) {
      const ref = String(row.external_listing_ref)
      const apiTour = tourById?.get(ref) ?? null
      const catalog = apiTour ?? row.snapshot?.catalog ?? row.snapshot

      if (!catalog || typeof catalog !== 'object') {
        stats.empty += 1
        console.log(`[skip] ${row.slug} — katalog yok`)
        continue
      }

      if (FROM_API && !apiTour) {
        stats.apiMiss += 1
        console.log(`[skip] ${row.slug} — API katalogda yok (${ref})`)
        continue
      }

      const existingMeta = buildWtatilVerticalTourFromDbRow({
        snapshotJson: row.snapshot,
        programDaysJson: row.program_days_json,
      })
      const needsWrite = verticalTourLooksEmpty(row.vertical_tour) || FROM_API

      if (!needsWrite && existingMeta?.duration_days) {
        stats.skip += 1
        continue
      }

      if (DRY_RUN) {
        const preview = buildWtatilTourVitrinPackage(catalog, {
          transport: row.program_days_json?.transport ?? null,
        })
        console.log(
          `[dry-run] ${row.slug}: days=${preview.verticalTour.duration_days || '-'} travel=${preview.verticalTour.travel_type || '-'} incl=${preview.verticalTour.includes?.length ?? 0} itin=${preview.verticalTour.itinerary?.length ?? 0}`,
        )
        stats.ok += 1
        continue
      }

      if (FROM_API && apiTour) {
        const enrich = await enrichWtatilTour(userName, token, apiTour, agencyId, {
          withPrices: false,
        })
        await refreshWtatilTourVitrin(pgClient, ctx, row.id, apiTour, enrich)
      } else {
        const vitrin = buildWtatilTourVitrinPackage(catalog, {
          transport: row.program_days_json?.transport ?? null,
        })
        await applyWtatilTourVitrinFields(pgClient, row.id, {
          snapshot: row.snapshot?.catalog ? buildWtatilTourSnapshot(catalog) : vitrin.snapshot,
          verticalTour: vitrin.verticalTour,
          localeTrId: ctx.localeTrId,
          title: String(catalog.name || '').trim() || undefined,
          description: vitrin.description || undefined,
        })
      }

      stats.ok += 1
      console.log(`[ok] ${row.slug}`)
    }

    console.log(
      `\nBitti: ${stats.ok} yazıldı/dry-run, ${stats.skip} zaten dolu, ${stats.apiMiss} API miss, ${stats.empty} katalog yok.`,
    )
  } finally {
    await pgClient.end()
  }
}

main().catch((err) => {
  console.error(err.message || err)
  process.exit(1)
})
