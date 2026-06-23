#!/usr/bin/env node
/**
 * Tüm Travelrobot oteller — batch batch otomatik backfill (elle offset yazmadan).
 *
 *   node scripts/run-travelrobot-hotel-backfill-loop.mjs --batch-size 50 --start-offset 450
 *   node scripts/run-travelrobot-hotel-backfill-loop.mjs --priceless-only --batch-size 25
 *   nohup node scripts/run-travelrobot-hotel-backfill-loop.mjs --batch-size 50 --start-offset 450 > /tmp/backfill-loop.log 2>&1 &
 *   tail -f /tmp/backfill-loop.log
 *
 * --max-batches 5  → yalnızca 5 batch (test)
 * --sleep-ms 2000  → batch arası bekleme (API nefes)
 */

import { spawn } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createPgClient } from './lib/pg-client.mjs'
import { cliLog } from './lib/cli-log.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const BACKFILL = path.join(__dirname, 'backfill-all-travelrobot-hotels.mjs')

function argValue(flag, fallback) {
  const i = process.argv.indexOf(flag)
  if (i < 0 || !process.argv[i + 1]) return fallback
  return process.argv[i + 1]
}

const BATCH = Number(argValue('--batch-size', '50'))
const START_OFFSET = Number(argValue('--start-offset', '0'))
const MAX_BATCHES = Number(argValue('--max-batches', '0'))
const SLEEP_MS = Number(argValue('--sleep-ms', '1500'))
const WITH_I18N = process.argv.includes('--with-i18n')
const NO_ROOMS = process.argv.includes('--no-with-rooms')
const PRICELESS_ONLY = process.argv.includes('--priceless-only')

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms))
}

async function countHotels() {
  const pg = createPgClient()
  await pg.connect()
  try {
    const r = await pg.query(
      `SELECT count(*)::int AS n
       FROM listings l
       JOIN product_categories pc ON pc.id = l.category_id AND pc.code = 'hotel'
       JOIN listing_hotel_details lhd ON lhd.listing_id = l.id
       WHERE l.external_provider_code = 'travelrobot'
         AND lhd.travelrobot_hotel_code IS NOT NULL
         AND trim(lhd.travelrobot_hotel_code) <> ''
         ${PRICELESS_ONLY ? `
         AND coalesce(l.first_charge_amount, 0) <= 0
         AND NOT EXISTS (
           SELECT 1 FROM listing_price_rules r
           WHERE r.listing_id = l.id
         )
         AND NOT EXISTS (
           SELECT 1 FROM listing_meal_plans m
           WHERE m.listing_id = l.id
             AND m.is_active = true
             AND m.price_per_night > 0
         )` : ''}`,
    )
    return r.rows[0]?.n ?? 0
  } finally {
    await pg.end()
  }
}

function runBatch(offset) {
  const args = [
    BACKFILL,
    '--batch-size',
    String(BATCH),
    '--offset',
    String(offset),
  ]
  if (WITH_I18N) args.push('--with-i18n')
  if (NO_ROOMS) args.push('--no-with-rooms')
  if (PRICELESS_ONLY) args.push('--priceless-only')

  return new Promise((resolve, reject) => {
    cliLog(`=== Batch offset=${offset} size=${BATCH} başlıyor ===`)
    const child = spawn(process.execPath, args, {
      stdio: 'inherit',
      env: process.env,
    })
    child.on('error', reject)
    child.on('close', (code) => {
      if (code === 0) resolve()
      else reject(new Error(`backfill exit ${code} (offset=${offset})`))
    })
  })
}

async function main() {
  cliLog(
    `Backfill döngüsü — start-offset=${START_OFFSET}, batch=${BATCH}, max-batches=${MAX_BATCHES || 'sınırsız'}, i18n=${WITH_I18N}, pricelessOnly=${PRICELESS_ONLY}`,
  )

  let offset = START_OFFSET
  let batches = 0

  while (true) {
    const total = await countHotels()
    cliLog(`Toplam otel: ${total}`)
    if (total <= 0) {
      cliLog('Tamamlandı — işlenecek otel kalmadı.')
      break
    }
    if (!PRICELESS_ONLY && offset >= total) {
      cliLog(`Tamamlandı — offset ${offset}, toplam ${total}.`)
      break
    }
    if (MAX_BATCHES > 0 && batches >= MAX_BATCHES) {
      cliLog(`max-batches (${MAX_BATCHES}) doldu — durduruldu. Sonraki offset: ${offset}`)
      break
    }

    await runBatch(PRICELESS_ONLY ? 0 : offset)
    batches++
    if (!PRICELESS_ONLY) offset += BATCH

    if (!PRICELESS_ONLY && offset >= total) {
      cliLog(`Tamamlandı — ${batches} batch, tüm oteller işlendi (toplam ${total}).`)
      cliLog('Kontrol: node scripts/audit-travelrobot-hotel-gaps.mjs --worst 20')
      break
    }

    const remaining = PRICELESS_ONLY ? Math.max(0, total - BATCH) : Math.max(0, total - offset)
    cliLog(`Kalan ~${remaining} otel — ${SLEEP_MS}ms sonra sonraki batch…`)
    if (SLEEP_MS > 0) await sleep(SLEEP_MS)
  }
}

main().catch((e) => {
  cliLog(`[FAIL] ${e.message}`)
  process.exit(1)
})
