#!/usr/bin/env node
/**
 * Sandbox: tur fiyat yanıt yapısını döker (cert ile aynı GetTourPrices döngüsü).
 *   node scripts/debug-tour-prices.mjs
 *   node scripts/debug-tour-prices.mjs --tour T66-1204-22669
 */
import { writeFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import {
  createTravelrobotToken,
  searchTours,
  pickTourRows,
  tourRowCode,
  resolveTourPriceAttempts,
  buildTourPriceRequestVariants,
  buildTourPriceRooms,
  getTourPrices,
  pickTourPriceRows,
  pickTourPricesSessionRawId,
  extractTourSessionUuid,
  pickTourPriceBookKeys,
  pickTourRoomBookKeys,
  collectTourFinalPricePackageIds,
  collectTourBookKeys,
  formatTourApiDate,
  TOUR_PRICE_DATE_OFFSETS,
} from './lib/travelrobot-api.mjs'
import { buildSandboxConfigAsync } from './lib/travelrobot-sandbox-config.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')
const tourFilter = process.argv.find((a) => a.startsWith('--tour='))?.slice(7)?.trim()

function addDays(n) {
  const d = new Date()
  d.setUTCDate(d.getUTCDate() + n)
  const dd = String(d.getUTCDate()).padStart(2, '0')
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0')
  const yyyy = d.getUTCFullYear()
  return `${dd}.${mm}.${yyyy}`
}

const cfg = await buildSandboxConfigAsync()
const { tokenCode } = await createTravelrobotToken(cfg)
const searchPayload = await searchTours(cfg, tokenCode, {
  languageCode: 'tr',
  startDate: addDays(7),
  endDate: addDays(400),
})
let rows = pickTourRows(searchPayload)
if (tourFilter) {
  rows = rows.filter((r) => tourRowCode(r) === tourFilter || String(r?.TourCode ?? '').includes(tourFilter))
}
if (!rows.length) {
  console.error('SearchTour boş veya filtre eşleşmedi:', tourFilter ?? '(tümü)')
  process.exit(1)
}

const priceRooms = buildTourPriceRooms([{ RoomIndex: 0, Adults: 2, Children: 0 }])
let pricePayload = null
let priceRow = null
let usedTour = null
let usedAttempt = null
let usedVariant = null
const errors = []

for (const tourRow of rows.slice(0, 16)) {
  const tourCode = tourRowCode(tourRow)
  let attempts = []
  try {
    attempts = await resolveTourPriceAttempts(cfg, tokenCode, tourRow, { languageCode: 'tr' })
  } catch (e) {
    errors.push({ tourCode, step: 'resolveTourPriceAttempts', error: String(e) })
    continue
  }
  if (!attempts.length) continue

  tourLoop:
  for (const attempt of attempts.slice(0, 12)) {
    const dateOffsets = formatTourApiDate(attempt.departureDate) ? [null] : TOUR_PRICE_DATE_OFFSETS
    for (const offset of dateOffsets) {
      const departureDate = offset == null ? attempt.departureDate : addDays(offset)
      const variants = buildTourPriceRequestVariants(
        attempt,
        departureDate,
        priceRooms,
        'tr',
      )
      for (const variant of variants) {
        try {
          const payload = await getTourPrices(cfg, tokenCode, variant)
          const rows2 = pickTourPriceRows(payload)
          if (!rows2.length) {
            errors.push({ tourCode, step: 'GetTourPrices', error: 'fiyat satırı yok', variant })
            continue
          }
          pricePayload = payload
          priceRow = rows2[0]
          usedTour = tourRow
          usedAttempt = attempt
          usedVariant = variant
          break tourLoop
        } catch (e) {
          errors.push({ tourCode, step: 'GetTourPrices', error: String(e), variant })
        }
      }
    }
  }
  if (priceRow) break
}

if (!priceRow) {
  console.error('GetTourPrices başarısız — son hatalar:')
  for (const e of errors.slice(-5)) console.error(' ', JSON.stringify(e))
  process.exit(1)
}

const tourCode = tourRowCode(usedTour)
const sessionRawId = pickTourPricesSessionRawId(pricePayload)
const report = {
  tourCode,
  attempt: usedAttempt,
  variant: usedVariant,
  sessionRawId,
  sessionUuid: extractTourSessionUuid(sessionRawId),
  roomBookKeys: pickTourRoomBookKeys(priceRow, pricePayload),
  bookKeysRaw: pickTourPriceBookKeys(priceRow, pricePayload),
  bookKeys: collectTourBookKeys(priceRow, pricePayload, sessionRawId),
  packageCandidates: collectTourFinalPricePackageIds(priceRow, {
    pricePayload,
    sessionPackageId: sessionRawId,
    tourCode,
    variant: usedVariant,
    attempt: usedAttempt,
  }),
  priceRowKeys: priceRow ? Object.keys(priceRow) : [],
  priceRowSample: priceRow,
  resultTopKeys: Object.keys(pricePayload?.Result ?? {}),
  attemptErrors: errors.slice(-8),
}

const out = join(root, `debug-tour-prices-${Date.now()}.json`)
writeFileSync(out, JSON.stringify({ pricePayload, report }, null, 2))
console.log('tur:', tourCode)
console.log('departureDate:', usedVariant?.departureDate)
console.log('sessionRawId:', report.sessionRawId?.slice(0, 80) + (report.sessionRawId?.length > 80 ? '…' : ''))
console.log('bookKeys:', report.bookKeys)
console.log('packageCandidates:', report.packageCandidates.slice(0, 6))
console.log('dosya:', out)
