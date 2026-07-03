#!/usr/bin/env node
/**
 * Tatilsepeti.com yurtiçi oteller — kopmaya dayanıklı batch import.
 *
 *   node scripts/import-tatilsepeti-hotels.mjs --dry-run --limit 3
 *   node scripts/import-tatilsepeti-hotels.mjs --refresh-catalog
 *   node scripts/import-tatilsepeti-hotels.mjs --status
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

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const args = new Set(process.argv.slice(2))

const DRY_RUN = args.has('--dry-run')
const REFRESH_CATALOG = args.has('--refresh-catalog')
const STATUS_ONLY = args.has('--status')
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

const { statePath, catalogPath } = defaultPaths()
const LOG_PATH = process.env.TATILSEPETI_IMPORT_LOG || path.join(__dirname, '..', 'backups', 'tatilsepeti-hotel-import.log')

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

function printStatus(state, catalog) {
  const total = catalog?.hotels?.length ?? 0
  const done = state.nextIndex
  const remaining = Math.max(0, total - done)
  appendLog('── Tatilsepeti import durumu ──')
  appendLog(`  İlerleme: ${done}/${total} (kalan ${remaining})`)
  appendLog(`  Batch boyutu: ${state.batchSize} | tamamlanan batch: ${state.stats.batchesCompleted}`)
  appendLog(`  created=${state.stats.created} updated=${state.stats.updated} failed=${state.stats.failed}`)
  appendLog(`  son batch: ${state.lastBatchCompletedAt || '-'}`)
  appendLog(`  state: ${statePath}`)
}

async function main() {
  let state = loadState(statePath)
  state.batchSize = BATCH_SIZE
  if (!state.startedAt) state.startedAt = new Date().toISOString()

  const catalog = loadCatalog(catalogPath)
  if (STATUS_ONLY) {
    printStatus(state, catalog)
    return
  }

  const session = new TatilsepetiSession()
  const hotels = await ensureCatalog(session)
  if (!hotels.length) throw new Error('Katalog boş')

  let startIndex = state.nextIndex
  let endIndex = hotels.length
  if (LIMIT > 0) endIndex = Math.min(endIndex, startIndex + LIMIT)

  const batchStart = Math.floor(startIndex / BATCH_SIZE) * BATCH_SIZE
  const batchEnd = Math.min(batchStart + BATCH_SIZE, hotels.length)
  const effectiveEnd = LIMIT > 0 ? endIndex : batchEnd

  appendLog(
    `[run] otel ${startIndex + 1}–${effectiveEnd} / ${hotels.length} (batch ${Math.floor(startIndex / BATCH_SIZE) + 1}, boyut ${BATCH_SIZE}) dry-run=${DRY_RUN}`,
  )

  const pg = DRY_RUN ? null : createPgClient()
  if (pg) await pg.connect()
  const ctx = pg ? await resolveTatilsepetiImportContext(pg, await resolveOrgId(pg)) : null
  const status = process.env.TATILSEPETI_LISTING_STATUS || 'draft'

  let processedInRun = 0
  try {
    for (let i = startIndex; i < effectiveEnd; i++) {
      const row = hotels[i]
      const label = `[${i + 1}/${hotels.length}] ${row.hotelId} ${row.name.slice(0, 50)}`
      try {
        await sleep(Number(process.env.TATILSEPETI_DETAIL_DELAY_MS || 350))
        const pkg = await fetchHotelDetailPackage(session, row, {
          fetchRoomPrices: !SKIP_ROOM_PRICES,
          log: appendLog,
        })
        const result = await upsertTatilsepetiHotelListing(pg, ctx, pkg, {
          status,
          dryRun: DRY_RUN,
        })
        if (!DRY_RUN) {
          if (result.action === 'created') state.stats.created++
          else state.stats.updated++
        }
        state.lastHotelId = row.hotelId
        state.nextIndex = i + 1
        processedInRun++
        appendLog(
          `${label} → ${result.action} görsel:${result.imageCount} oda:${result.roomCount} tamlık:${result.completeness?.score ?? '?'}%`,
        )
      } catch (e) {
        state.stats.failed++
        state.nextIndex = i + 1
        processedInRun++
        appendLog(`${label} → HATA: ${String(e.message).slice(0, 160)}`)
      }

      if (!DRY_RUN && processedInRun % CHECKPOINT_EVERY === 0) {
        saveState(state, statePath)
      }
    }

    if (!DRY_RUN) {
      saveState(state, statePath)
      const batchNo = Math.floor((state.nextIndex - 1) / BATCH_SIZE) + 1
      if (state.nextIndex >= batchEnd || state.nextIndex >= hotels.length) {
        markBatchComplete(state, state.nextIndex, batchNo)
        saveState(state, statePath)
        appendLog(`[batch] ${batchNo} tamamlandı — index=${state.nextIndex}`)
      }
    }

    if (state.nextIndex < hotels.length && !LIMIT) {
      appendLog(`[devam] Sonraki batch için aynı komutu tekrar çalıştırın (index=${state.nextIndex})`)
    } else if (state.nextIndex >= hotels.length) {
      appendLog('[bitti] Tüm katalog işlendi.')
    }
  } finally {
    if (pg) await pg.end()
  }
}

main().catch((e) => {
  appendLog(`[FATAL] ${e.stack || e.message}`)
  process.exit(1)
})
