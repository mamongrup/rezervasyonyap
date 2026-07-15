#!/usr/bin/env node
/**
 * Tatilsepeti.com yurtiçi oteller — kopmaya dayanıklı batch import.
 *
 *   node scripts/import-tatilsepeti-hotels.mjs --dry-run --limit 3
 *   node scripts/import-tatilsepeti-hotels.mjs --refresh-catalog
 *   node scripts/import-tatilsepeti-hotels.mjs --status
 *   node scripts/import-tatilsepeti-hotels.mjs --retry-missing
 *   node scripts/import-tatilsepeti-hotels.mjs --retry-failed
 *   node scripts/import-tatilsepeti-hotels.mjs --batch-size 10000
 *
 * Arka plan (sunucu):
 *   ./deploy/scripts/import-tatilsepeti-hotels.sh
 *
 * Checkpoint: backups/tatilsepeti-hotel-import-state.json
 * Katalog:    backups/tatilsepeti-hotel-catalog.json
 */
import fs from 'node:fs'
import path from 'node:path'
import dns from 'node:dns'
import { fileURLToPath } from 'node:url'
import {
  TatilsepetiSession,
  fetchHotelListCatalog,
  fetchHotelDetailPackage,
  sleep,
} from './lib/tatilsepeti-hotel-api.mjs'
import {
  resolveTatilsepetiImportContext,
  upsertTatilsepetiHotelListing,
} from './lib/tatilsepeti-hotel-db.mjs'
import {
  defaultPaths,
  loadState,
  saveState,
  loadCatalog,
  saveCatalog,
  markBatchComplete,
} from './lib/tatilsepeti-import-checkpoint.mjs'
import { createPgClient } from './lib/pg-client.mjs'
import { cliLog } from './lib/cli-log.mjs'
import { createJobReporter } from './lib/sync-job-reporter.mjs'
import { nextProviderHttpHealth } from './lib/provider-http-health.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
// Bazı sunucularda Tatilsepeti'nin IPv6 adresi çözümleniyor ancak dış IPv6
// rotası çalışmıyor. curl -4 başarılıyken Node fetch bu nedenle düşebiliyor.
dns.setDefaultResultOrder('ipv4first')
const args = new Set(process.argv.slice(2))

const DRY_RUN = args.has('--dry-run')
const REFRESH_CATALOG = args.has('--refresh-catalog')
const STATUS_ONLY = args.has('--status')
const RETRY_FAILED = args.has('--retry-failed')
const RETRY_MISSING = args.has('--retry-missing')
const IS_RETRY_MODE = RETRY_FAILED || RETRY_MISSING
const SKIP_ROOM_PRICES = args.has('--skip-room-prices')

const limitIdx = process.argv.indexOf('--limit')
const LIMIT = limitIdx >= 0 ? Number(process.argv[limitIdx + 1]) : 0
const batchIdx = process.argv.indexOf('--batch-size')
const BATCH_SIZE = batchIdx >= 0 ? Number(process.argv[batchIdx + 1]) : 10000
const checkpointIdx = process.argv.indexOf('--checkpoint-every')
const CHECKPOINT_EVERY = checkpointIdx >= 0 ? Number(process.argv[checkpointIdx + 1]) : 25
const orgIdx = process.argv.indexOf('--org-id')
const ORG_ID = orgIdx >= 0 ? process.argv[orgIdx + 1] : process.env.IMPORT_ORG_ID || ''
const listPathsIdx = process.argv.indexOf('--list-paths')
const LIST_PATHS = listPathsIdx >= 0
  ? process.argv[listPathsIdx + 1].split(',').map((s) => s.trim()).filter(Boolean)
  : (process.env.TATILSEPETI_LIST_PATHS || 'yurtici-oteller').split(',').map((s) => s.trim())
const jobIdIdx = process.argv.indexOf('--job-id')
const JOB_ID = jobIdIdx >= 0 ? process.argv[jobIdIdx + 1] : (process.env.SYNC_JOB_ID || '')
const reporter = createJobReporter(JOB_ID)

const { statePath, catalogPath } = defaultPaths()
const LOG_PATH = process.env.TATILSEPETI_IMPORT_LOG || path.join(__dirname, '..', 'backups', 'tatilsepeti-hotel-import.log')

function isNetworkFailure(error) {
  const message = `${error?.message || ''} ${error?.cause?.message || ''} ${error?.cause?.cause?.code || ''}`
  return /fetch failed|ağ bağlantısı|ECONN|ETIMEDOUT|ENETUNREACH|EHOSTUNREACH|UND_ERR|socket/i.test(message)
}

function appendLog(line) {
  fs.mkdirSync(path.dirname(LOG_PATH), { recursive: true })
  fs.appendFileSync(LOG_PATH, `${new Date().toISOString()} ${line}\n`)
  cliLog(line)
}

async function resolveOrgId(pg) {
  if (ORG_ID) return ORG_ID
  const r = await pg.query(`SELECT id::text FROM organizations ORDER BY created_at LIMIT 1`)
  if (!r.rows[0]) throw new Error('organizations kaydı yok; --org-id <uuid>')
  return r.rows[0].id
}

async function ensureCatalog(session) {
  let catalog = loadCatalog(catalogPath)
  if (catalog && !REFRESH_CATALOG) {
    appendLog(`[katalog] önbellek: ${catalog.hotels.length} otel (${catalog.fetchedAt})`)
    return catalog.hotels
  }
  appendLog(`[katalog] Tatilsepeti listesi çekiliyor: ${LIST_PATHS.join(', ')}`)
  const hotels = await fetchHotelListCatalog(session, LIST_PATHS, appendLog)
  catalog = {
    fetchedAt: new Date().toISOString(),
    listPaths: LIST_PATHS,
    hotels,
  }
  saveCatalog(catalog, catalogPath)
  appendLog(`[katalog] kaydedildi: ${hotels.length} otel → ${catalogPath}`)
  return hotels
}

async function countTatilsepetiInDb(pg) {
  const r = await pg.query(
    `SELECT count(*)::int AS n FROM listings WHERE external_provider_code = 'tatilsepeti'`,
  )
  return r.rows[0]?.n ?? 0
}

async function loadExistingTatilsepetiRefs(pg) {
  const r = await pg.query(
    `SELECT external_listing_ref FROM listings
     WHERE external_provider_code = 'tatilsepeti'
       AND external_listing_ref IS NOT NULL`,
  )
  return new Set(r.rows.map((row) => String(row.external_listing_ref)))
}

async function printStatus(state, catalog) {
  const total = catalog?.hotels?.length ?? 0
  const done = state.nextIndex
  const remaining = Math.max(0, total - done)
  appendLog('── Tatilsepeti import durumu ──')
  appendLog(`  İlerleme: ${done}/${total} (kalan ${remaining})`)
  appendLog(`  Batch boyutu: ${state.batchSize} | tamamlanan batch: ${state.stats.batchesCompleted}`)
  appendLog(`  created=${state.stats.created} updated=${state.stats.updated} failed=${state.stats.failed}`)
  appendLog(`  failed kayıt: ${(state.failedHotelIds || []).length}`)
  appendLog(`  son batch: ${state.lastBatchCompletedAt || '-'}`)
  appendLog(`  state: ${statePath}`)
  try {
    const pg = createPgClient()
    await pg.connect()
    try {
      const inDb = await countTatilsepetiInDb(pg)
      appendLog(`  DB'de tatilsepeti otel: ${inDb} / katalog ${total}`)
      appendLog(`  eksik (yaklaşık): ${Math.max(0, total - inDb)}`)
    } finally {
      await pg.end()
    }
  } catch (e) {
    appendLog(`  DB sayımı atlandı: ${e.message}`)
  }
}

async function hotelsForRun(hotels, state, pg) {
  if (RETRY_MISSING) {
    if (!pg) throw new Error('--retry-missing için DB gerekli (dry-run ile kullanılamaz)')
    const existing = await loadExistingTatilsepetiRefs(pg)
    const filtered = hotels.filter((h) => !existing.has(String(h.hotelId)))
    appendLog(`[retry-missing] DB'de yok: ${filtered.length} / katalog ${hotels.length}`)
    return filtered
  }
  if (RETRY_FAILED) {
    const ids = new Set((state.failedHotelIds || []).map((x) => String(x.hotelId)))
    if (!ids.size) {
      appendLog('[retry-failed] failedHotelIds boş — --retry-missing deneyin')
      return []
    }
    const filtered = hotels.filter((h) => ids.has(String(h.hotelId)))
    appendLog(`[retry-failed] ${filtered.length} otel yeniden denenecek`)
    return filtered
  }
  return hotels
}

async function main() {
  let state = loadState(statePath)
  if (!state.failedHotelIds) state.failedHotelIds = []
  state.batchSize = BATCH_SIZE
  if (!state.startedAt) state.startedAt = new Date().toISOString()

  const catalog = loadCatalog(catalogPath)
  if (STATUS_ONLY) {
    await printStatus(state, catalog)
    return
  }

  const session = new TatilsepetiSession()
  const catalogHotels = await ensureCatalog(session)

  const pg = DRY_RUN && !RETRY_MISSING ? null : createPgClient()
  if (pg) await pg.connect()

  let hotels
  try {
    hotels = await hotelsForRun(catalogHotels, state, pg)
  } catch (e) {
    if (pg) await pg.end()
    throw e
  }

  if (!hotels.length) {
    if (pg) await pg.end()
    appendLog(IS_RETRY_MODE ? '[bitti] Yeniden denenecek otel yok.' : 'Katalog boş')
    return
  }

  let startIndex = IS_RETRY_MODE ? 0 : state.nextIndex
  let endIndex = hotels.length
  if (LIMIT > 0) endIndex = Math.min(endIndex, startIndex + LIMIT)

  const batchStart = Math.floor(startIndex / BATCH_SIZE) * BATCH_SIZE
  const batchEnd = Math.min(batchStart + BATCH_SIZE, catalogHotels.length)
  const effectiveEnd =
    LIMIT > 0 ? endIndex : IS_RETRY_MODE ? hotels.length : Math.max(startIndex, batchEnd)

  await reporter.start(hotels.length)

  appendLog(
    `[run] otel ${startIndex + 1}–${effectiveEnd} / ${hotels.length} (batch ${Math.floor(startIndex / BATCH_SIZE) + 1}, boyut ${BATCH_SIZE}) dry-run=${DRY_RUN}`,
  )

  const ctx =
    pg && !DRY_RUN ? await resolveTatilsepetiImportContext(pg, await resolveOrgId(pg)) : null
  const status = process.env.TATILSEPETI_LISTING_STATUS || 'draft'

  let processedInRun = 0
  try {
    for (let i = startIndex; i < effectiveEnd; i++) {
      const row = hotels[i]
      const label = `[${i + 1}/${hotels.length}] ${row.hotelId} ${row.name.slice(0, 50)}`
      try {
        await sleep(Number(process.env.TATILSEPETI_DETAIL_DELAY_MS || 1200))
        const pkg = await fetchHotelDetailPackage(session, row, {
          fetchRoomPrices: !SKIP_ROOM_PRICES,
          log: appendLog,
        })
        const result = await upsertTatilsepetiHotelListing(pg, ctx, pkg, {
          status,
          dryRun: DRY_RUN,
        })
        const hadProvider400 = Number(state.providerConsecutiveDetail400 || 0) > 0
        state.providerConsecutiveDetail400 = 0
        if (!DRY_RUN) {
          if (result.action === 'created') state.stats.created++
          else state.stats.updated++
        }
        state.lastHotelId = row.hotelId
        if (!IS_RETRY_MODE) state.nextIndex = i + 1
        state.failedHotelIds = (state.failedHotelIds || []).filter(
          (x) => String(x.hotelId) !== String(row.hotelId),
        )
        processedInRun++
        appendLog(
          `${label} → ${result.action} görsel:${result.imageCount} oda:${result.roomCount} tamlık:${result.completeness?.score ?? '?'}%`,
        )
        if (hadProvider400 && !DRY_RUN) saveState(state, statePath)
      } catch (e) {
        const providerHealth = nextProviderHttpHealth(
          state.providerConsecutiveDetail400,
          e,
          Number(process.env.TATILSEPETI_CONSECUTIVE_400_LIMIT || 3),
        )
        state.providerConsecutiveDetail400 = providerHealth.consecutive400
        // Sağlayıcı bağlantısı topluca kesildiğinde oteli başarısız sayıp
        // checkpoint'i ilerletme. Arka plan çalıştırıcısı bekledikten sonra
        // aynı otelden güvenli biçimde devam eder.
        if (isNetworkFailure(e) || providerHealth.shouldPause) {
          if (!DRY_RUN) saveState(state, statePath)
          const reason = providerHealth.status
            ? `HTTP ${providerHealth.status}; ardışık400=${providerHealth.consecutive400}`
            : 'ağ bağlantısı'
          appendLog(`${label} → SAĞLAYICI BEKLEMESİ (${reason}): ${String(e.message).slice(0, 200)}`)
          throw new Error(`provider_network_cooldown:${e.message}`, { cause: e })
        }
        state.stats.failed++
        if (!IS_RETRY_MODE) state.nextIndex = i + 1
        state.failedHotelIds = state.failedHotelIds || []
        if (!state.failedHotelIds.some((x) => String(x.hotelId) === String(row.hotelId))) {
          state.failedHotelIds.push({
            hotelId: row.hotelId,
            index: i,
            error: String(e.message).slice(0, 200),
            at: new Date().toISOString(),
          })
        }
        processedInRun++
        appendLog(`${label} → HATA: ${String(e.message).slice(0, 160)}`)
        // SIGTERM/SSH kesintisinde son hata listesi kaybolmasın.
        if (!DRY_RUN) saveState(state, statePath)
      }

      if (!DRY_RUN && processedInRun % CHECKPOINT_EVERY === 0) {
        saveState(state, statePath)
      }
      await reporter.step('', IS_RETRY_MODE ? processedInRun : state.nextIndex, hotels.length)
    }

    if (!DRY_RUN) {
      saveState(state, statePath)
      if (!IS_RETRY_MODE) {
        const batchNo = Math.floor((state.nextIndex - 1) / BATCH_SIZE) + 1
        if (state.nextIndex >= batchEnd || state.nextIndex >= catalogHotels.length) {
          markBatchComplete(state, state.nextIndex, batchNo)
          saveState(state, statePath)
          appendLog(`[batch] ${batchNo} tamamlandı — index=${state.nextIndex}`)
        }
      }
    }

    if (IS_RETRY_MODE) {
      appendLog(
        `[retry] bitti — kalan hatalı: ${(state.failedHotelIds || []).length}`,
      )
    } else if (state.nextIndex < catalogHotels.length && !LIMIT) {
      appendLog(`[devam] Sonraki batch için aynı komutu tekrar çalıştırın (index=${state.nextIndex})`)
    } else if (state.nextIndex >= catalogHotels.length) {
      appendLog('[bitti] Tüm katalog işlendi.')
      if ((state.failedHotelIds || []).length) {
        appendLog(
          `[bilgi] ${state.failedHotelIds.length} hatalı otel — --retry-failed veya --retry-missing`,
        )
      }
    }
    await reporter.done(
      `Tatil Sepeti tamam: ${state.stats.created} yeni, ${state.stats.updated} güncelleme, ${state.stats.failed} hata.`,
    )
  } finally {
    if (pg) await pg.end()
  }
}

main().catch(async (e) => {
  await reporter.fail(e.message || String(e))
  appendLog(`[FATAL] ${e.stack || e.message}`)
  process.exit(1)
})
