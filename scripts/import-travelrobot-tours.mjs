/**
 * Travelrobot tur import — panel kimlik bilgilerini DB'den okur.
 *
 *   node scripts/import-travelrobot-tours.mjs --ping
 *   node scripts/import-travelrobot-tours.mjs --dry-run --limit 5
 *   node scripts/import-travelrobot-tours.mjs --org-id <uuid>
 */

import { createTravelrobotToken, loadTravelrobotConfig, pickTourRows, searchTours } from './lib/travelrobot-api.mjs'
import { resolveImportContext, upsertTravelrobotTourListing } from './lib/travelrobot-listing-db.mjs'
import { createPgClient } from './lib/pg-client.mjs'
import { createJobReporter } from './lib/sync-job-reporter.mjs'

const args = new Set(process.argv.slice(2))
const PING = args.has('--ping')
const DRY_RUN = args.has('--dry-run')
const limitIdx = process.argv.indexOf('--limit')
const LIMIT = limitIdx >= 0 ? Number(process.argv[limitIdx + 1]) : 0
const orgIdIdx = process.argv.indexOf('--org-id')
const ORG_ID = orgIdIdx >= 0 ? process.argv[orgIdIdx + 1] : (process.env.IMPORT_ORG_ID ?? '')

const jobIdIdx = process.argv.indexOf('--job-id')
const JOB_ID = jobIdIdx >= 0 ? process.argv[jobIdIdx + 1] : (process.env.SYNC_JOB_ID || '')
const reporter = createJobReporter(JOB_ID)

async function resolveOrgId(pgClient) {
  if (ORG_ID) return ORG_ID
  const r = await pgClient.query(
    `SELECT id::text FROM organizations ORDER BY created_at LIMIT 1`,
  )
  if (!r.rows[0]) throw new Error('organizations tablosunda kayıt yok; --org-id <uuid> ile belirtin')
  return r.rows[0].id
}

async function main() {
  const cfg = await loadTravelrobotConfig()
  if (!cfg.enabled && !PING) {
    console.warn('[uyarı] Travelrobot panelde kapalı (enabled=false) — yine de devam ediliyor')
  }
  if (!cfg.importTours && !PING) {
    console.warn('[uyarı] import_tours=false — yine de devam ediliyor')
  }

  const { tokenCode } = await createTravelrobotToken(cfg)
  if (PING) {
    console.log('Travelrobot token OK, uzunluk:', tokenCode.length)
    return
  }

  await reporter.start(0)
  await reporter.log('SearchTour çağrılıyor…')
  const payload = await searchTours(cfg, tokenCode)
  let rows = pickTourRows(payload)
  await reporter.log(`API: ${rows.length} tur adayı`)
  if (LIMIT > 0) rows = rows.slice(0, LIMIT)

  if (DRY_RUN) {
    await reporter.done(`Dry-run — DB yazılmadı. Toplam: ${rows.length} kayıt`)
    return
  }

  const client = createPgClient()
  await client.connect()
  try {
    const orgId = await resolveOrgId(client)
    const ctx = await resolveImportContext(client, orgId, 'tour')
    const status = cfg.listingStatus || 'draft'
    const total = rows.length

    let created = 0, updated = 0, skipped = 0
    for (let i = 0; i < rows.length; i++) {
      const tour = rows[i]
      try {
        const result = await upsertTravelrobotTourListing(client, ctx, tour, { status })
        if (result.action === 'created') created++
        else updated++
        await reporter.step(`[${i + 1}/${total}] ${result.action}: ${result.slug || tour.id}`, i + 1, total)
      } catch (e) {
        skipped++
        console.error(`\n[hata] ${e.message}`)
        await reporter.step(`[${i + 1}/${total}] hata: ${e.message?.slice(0, 80)}`, i + 1, total)
      }
    }
    await reporter.done(`Tamamlandı: ${created} yeni, ${updated} güncellendi, ${skipped} atlandı`)
  } finally {
    await client.end()
  }
}

main().catch(async (e) => {
  await reporter.fail(e.message || String(e))
  process.exit(1)
})
