/**
 * Travelrobot (KPlus) tek geçişte tur + otel + uçuş import.
 *
 * Panel "İmport Başlat" ve zamanlayıcı bu scripti çağırır; böylece tek job ile
 * üç ürün tipi de içe aktarılır (önceden yalnızca tur geliyordu).
 *
 * Hangi modüllerin çalışacağı panel ayarlarına bağlıdır:
 *   listing_api_providers.travelrobot.{import_tours, import_hotels, import_flights}
 * (Yönetim → İlan API sağlayıcıları → Travelrobot)
 *
 *   node scripts/import-travelrobot-all.mjs --ping
 *   node scripts/import-travelrobot-all.mjs --dry-run --limit 5
 *   node scripts/import-travelrobot-all.mjs --only hotels
 *   node scripts/import-travelrobot-all.mjs --org-id <uuid>
 *
 * Env: DATABASE_URL / PG* (backend.env), INTERNAL_API_ORIGIN (progress raporu),
 *      TRAVELROBOT_HOTEL_DESTINATION_ID (otel arama destinasyonu — opsiyonel)
 */

import {
  createTravelrobotToken,
  loadTravelrobotConfig,
  searchTours,
  pickTourRows,
  searchHotels,
  pickHotelRows,
  searchFlights,
  pickFlightRows,
} from './lib/travelrobot-api.mjs'
import { DEFAULT_HOTEL_DESTINATION_ID } from './lib/travelrobot-sandbox-ids.mjs'
import {
  resolveImportContext,
  upsertTravelrobotTourListing,
  upsertTravelrobotHotelListing,
  upsertTravelrobotFlightListing,
} from './lib/travelrobot-listing-db.mjs'
import { enrichTravelrobotHotelRows } from './lib/travelrobot-hotel-enrich.mjs'
import { createPgClient } from './lib/pg-client.mjs'
import { createJobReporter } from './lib/sync-job-reporter.mjs'

const args = new Set(process.argv.slice(2))
const PING = args.has('--ping')
const DRY_RUN = args.has('--dry-run')
const SKIP_STATIC = args.has('--skip-static')
const WITH_ROOMS = args.has('--with-rooms') || args.has('--no-with-rooms')
  ? args.has('--with-rooms')
  : null
const limitIdx = process.argv.indexOf('--limit')
const LIMIT = limitIdx >= 0 ? Number(process.argv[limitIdx + 1]) : 0
const orgIdIdx = process.argv.indexOf('--org-id')
const ORG_ID = orgIdIdx >= 0 ? process.argv[orgIdIdx + 1] : (process.env.IMPORT_ORG_ID ?? '')
const onlyIdx = process.argv.indexOf('--only')
const ONLY = onlyIdx >= 0 ? String(process.argv[onlyIdx + 1] || '').toLowerCase() : ''

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

/** Modül listesi — config bayraklarına ve --only filtresine göre. */
function plannedModules(cfg) {
  const all = [
    {
      key: 'tour',
      label: 'Tur',
      enabled: cfg.importTours,
      category: 'tour',
      search: (token) => searchTours(cfg, token),
      pick: pickTourRows,
      upsert: upsertTravelrobotTourListing,
    },
    {
      key: 'hotel',
      label: 'Otel',
      enabled: cfg.importHotels,
      category: 'hotel',
      search: (token) =>
        searchHotels(cfg, token, {
          destinationId:
            process.env.TRAVELROBOT_HOTEL_DESTINATION_ID || DEFAULT_HOTEL_DESTINATION_ID,
        }),
      pick: pickHotelRows,
      upsert: upsertTravelrobotHotelListing,
    },
    {
      key: 'flight',
      label: 'Uçuş',
      enabled: cfg.importFlights,
      category: 'flight',
      search: (token) => searchFlights(cfg, token),
      pick: pickFlightRows,
      upsert: upsertTravelrobotFlightListing,
    },
  ]
  if (ONLY) {
    const onlySet = new Set(
      ONLY.split(',').map((s) => s.trim().replace(/s$/, '')), // tours→tour
    )
    return all.filter((m) => onlySet.has(m.key))
  }
  return all
}

function resolveWithRooms(cfg) {
  if (WITH_ROOMS != null) return WITH_ROOMS
  return cfg.importHotelRooms !== false
}

/** Static API görselleri + isteğe bağlı otel bazlı SearchHotel (oda/fiyat). */
async function enrichHotelRows(cfg, tokenCode, rows) {
  return enrichTravelrobotHotelRows(cfg, tokenCode, rows, {
    withRooms: resolveWithRooms(cfg),
    skipStatic: SKIP_STATIC,
    log: (msg) => reporter.log(msg),
  })
}

async function main() {
  const cfg = await loadTravelrobotConfig()
  if (!cfg.enabled && !PING) {
    console.warn('[uyarı] Travelrobot panelde kapalı (enabled=false) — yine de devam ediliyor')
  }

  const { tokenCode } = await createTravelrobotToken(cfg)
  if (PING) {
    console.log('Travelrobot token OK, uzunluk:', tokenCode.length)
    return
  }

  const modules = plannedModules(cfg)
  const active = modules.filter((m) => m.enabled || ONLY)
  const skipped = modules.filter((m) => !m.enabled && !ONLY)

  await reporter.start(0)
  if (skipped.length) {
    await reporter.log(
      `Pasif (panelde kapalı): ${skipped.map((m) => m.label).join(', ')} — etkinleştir: Yönetim → İlan API sağlayıcıları → Travelrobot`,
    )
  }
  if (!active.length) {
    await reporter.done('Çalıştırılacak modül yok (tümü kapalı).')
    return
  }

  // 1) Tüm aktif modüller için arama yap, satırları topla
  const collected = []
  for (const m of active) {
    try {
      await reporter.log(`${m.label}: arama yapılıyor…`)
      const payload = await m.search(tokenCode)
      let rows = m.pick(payload)
      if (m.key === 'hotel') rows = await enrichHotelRows(cfg, tokenCode, rows)
      if (LIMIT > 0) rows = rows.slice(0, LIMIT)
      await reporter.log(`${m.label}: ${rows.length} aday`)
      collected.push({ module: m, rows })
    } catch (e) {
      console.error(`[hata] ${m.label} arama: ${e.message}`)
      await reporter.log(`${m.label}: arama hatası — ${String(e.message).slice(0, 120)}`)
      collected.push({ module: m, rows: [] })
    }
  }

  const total = collected.reduce((s, c) => s + c.rows.length, 0)

  if (DRY_RUN) {
    const summary = collected.map((c) => `${c.module.label}=${c.rows.length}`).join(', ')
    await reporter.done(`Dry-run — DB yazılmadı. Toplam: ${total} (${summary})`)
    return
  }

  // 2) DB'ye yaz
  const client = createPgClient()
  await client.connect()
  try {
    const orgId = await resolveOrgId(client)
    const status = cfg.listingStatus || 'draft'
    await reporter.start(total)

    let done = 0
    const tally = { created: 0, updated: 0, skipped: 0 }
    for (const { module: m, rows } of collected) {
      if (!rows.length) continue
      const ctx = await resolveImportContext(client, orgId, m.category)
      for (const row of rows) {
        done++
        try {
          const result = await m.upsert(client, ctx, row, { status })
          if (result.action === 'created') tally.created++
          else tally.updated++
          const extra =
            m.key === 'hotel' && (result.imageCount || result.roomCount)
              ? ` (${result.imageCount ?? 0} görsel, ${result.roomCount ?? 0} oda)`
              : ''
          await reporter.step(
            `[${m.label} ${done}/${total}] ${result.action}: ${result.slug || row.id || ''}${extra}`,
            done,
            total,
          )
        } catch (e) {
          tally.skipped++
          console.error(`\n[hata] ${m.label}: ${e.message}`)
          await reporter.step(`[${m.label} ${done}/${total}] hata: ${String(e.message).slice(0, 80)}`, done, total)
        }
      }
    }
    await reporter.done(`Tamamlandı: ${tally.created} yeni, ${tally.updated} güncellendi, ${tally.skipped} atlandı (toplam ${total})`)
  } finally {
    await client.end()
  }
}

main().catch(async (e) => {
  await reporter.fail(e.message || String(e))
  process.exit(1)
})
