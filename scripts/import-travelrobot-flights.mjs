/**
 * Travelrobot uçuş import — panel kimlik bilgilerini DB'den okur.
 *
 *   node scripts/import-travelrobot-flights.mjs --ping
 *   node scripts/import-travelrobot-flights.mjs --dry-run --limit 5
 *   node scripts/import-travelrobot-flights.mjs --org-id <uuid>
 *
 * Not: KPlus uçuş endpoint adı sağlayıcıya göre değişebilir.
 * Farklı endpoint için: --endpoint /Flight.svc/Rest/Json/SearchFlight
 */

import { createTravelrobotToken, loadTravelrobotConfig, searchFlights, pickFlightRows } from './lib/travelrobot-api.mjs'
import { resolveImportContext, upsertTravelrobotFlightListing } from './lib/travelrobot-listing-db.mjs'
import { createPgClient } from './lib/pg-client.mjs'

const args = new Set(process.argv.slice(2))
const PING = args.has('--ping')
const DRY_RUN = args.has('--dry-run')
const limitIdx = process.argv.indexOf('--limit')
const LIMIT = limitIdx >= 0 ? Number(process.argv[limitIdx + 1]) : 0
const orgIdIdx = process.argv.indexOf('--org-id')
const ORG_ID = orgIdIdx >= 0 ? process.argv[orgIdIdx + 1] : (process.env.IMPORT_ORG_ID ?? '')
const endpointIdx = process.argv.indexOf('--endpoint')
const ENDPOINT = endpointIdx >= 0 ? process.argv[endpointIdx + 1] : undefined

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
  if (!cfg.importFlights && !PING) {
    console.warn('[uyarı] import_flights=false — panelden etkinleştirin veya yine de devam ediliyor')
  }

  const { tokenCode } = await createTravelrobotToken(cfg)
  if (PING) {
    console.log('Travelrobot token OK, uzunluk:', tokenCode.length)
    return
  }

  console.log('GetFlightList çağrılıyor…')
  let payload
  try {
    payload = await searchFlights(cfg, tokenCode, { endpoint: ENDPOINT })
  } catch (e) {
    console.error('[hata]', e.message)
    console.error(
      'Endpoint adını doğrulayın: --endpoint /Flight.svc/Rest/Json/<MethodAdı>',
      '\nAlternatifler: SearchFlight, GetAvailableFlights, GetFlightList',
    )
    process.exit(1)
  }

  let rows = pickFlightRows(payload)
  console.log(`API: ${rows.length} uçuş adayı`)
  if (LIMIT > 0) rows = rows.slice(0, LIMIT)

  if (DRY_RUN) {
    console.log('Dry-run — DB yazılmadı. İlk kayıt:', rows[0] ? JSON.stringify(rows[0]).slice(0, 300) : '(boş)')
    if (rows.length === 0) {
      console.log('Ham yanıt önizleme:', JSON.stringify(payload).slice(0, 500))
    }
    return
  }

  const client = createPgClient()
  await client.connect()
  try {
    const orgId = await resolveOrgId(client)
    const ctx = await resolveImportContext(client, orgId, 'flight')
    const status = cfg.listingStatus || 'draft'

    let created = 0, updated = 0, skipped = 0
    for (const flight of rows) {
      try {
        const result = await upsertTravelrobotFlightListing(client, ctx, flight, { status })
        if (result.action === 'created') created++
        else updated++
        process.stdout.write('.')
      } catch (e) {
        skipped++
        console.error(`\n[hata] ${e.message} — kayıt:`, JSON.stringify(flight).slice(0, 120))
      }
    }
    console.log(`\nTamamlandı: ${created} yeni, ${updated} güncellendi, ${skipped} atlandı`)
  } finally {
    await client.end()
  }
}

main().catch((e) => {
  console.error(e.message || e)
  process.exit(1)
})
