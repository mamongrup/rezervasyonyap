#!/usr/bin/env node
/**
 * Sandbox: tur fiyat yanıt yapısını döker.
 *   node scripts/debug-tour-prices.mjs --tour=T66-1204-22669
 *   node scripts/debug-tour-prices.mjs --tour=T66-1204-22669 --quick
 *
 * --tour=CODE  → SearchTour atlanır (hızlı)
 * --quick      → az attempt/tarih, GetTourDetails atlanır, 45s timeout
 */
import { writeFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import {
  createTravelrobotToken,
  searchTours,
  pickTourRows,
  tourRowCode,
  collectTourPriceAttemptsFromRow,
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
  isStrictTourBookResultKey,
  pickTourVariantBookKeys,
  resolveTourFinalPrice,
  pickTourFinalPriceBookRefs,
  formatTourApiDate,
  TOUR_PRICE_DATE_OFFSETS,
} from './lib/travelrobot-api.mjs'
import { buildSandboxConfigAsync } from './lib/travelrobot-sandbox-config.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')
const argv = process.argv.slice(2)
const quick = argv.includes('--quick')
const tourFilter =
  argv.find((a) => a.startsWith('--tour='))?.slice(7)?.trim() ||
  (argv.includes('--tour') ? argv[argv.indexOf('--tour') + 1] : null)

const API_TIMEOUT_MS = quick ? 45000 : 90000
const DATE_OFFSETS = quick ? [30, 45, 60] : TOUR_PRICE_DATE_OFFSETS

function log(msg) {
  console.error(`[debug] ${msg}`)
}

function addDays(n) {
  const d = new Date()
  d.setUTCDate(d.getUTCDate() + n)
  const dd = String(d.getUTCDate()).padStart(2, '0')
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0')
  const yyyy = d.getUTCFullYear()
  return `${dd}.${mm}.${yyyy}`
}

log('sandbox config yükleniyor…')
const cfg = await buildSandboxConfigAsync()
log('token…')
const { tokenCode } = await createTravelrobotToken(cfg)

let rows = []
if (tourFilter) {
  log(`--tour=${tourFilter}: SearchTour atlanıyor`)
  rows = [{ TourCode: tourFilter, TourAlternativeCode: tourFilter }]
} else {
  log('SearchTour…')
  const searchPayload = await searchTours(cfg, tokenCode, {
    languageCode: 'tr',
    startDate: addDays(7),
    endDate: addDays(400),
    timeoutMs: API_TIMEOUT_MS,
  })
  rows = pickTourRows(searchPayload)
}
if (!rows.length) {
  console.error('Tur satırı yok:', tourFilter ?? '(tümü)')
  process.exit(1)
}

const priceRooms = buildTourPriceRooms([{ RoomIndex: 0, Adults: 2, Children: 0 }])
let pricePayload = null
let priceRow = null
let usedTour = null
let usedAttempt = null
let usedVariant = null
const errors = []
let tries = 0
const maxTries = quick ? 24 : 80

for (const tourRow of rows.slice(0, quick ? 1 : 8)) {
  const tourCode = tourRowCode(tourRow)
  let attempts = []
  try {
    if (tourFilter && quick) {
      attempts = collectTourPriceAttemptsFromRow(tourRow)
      if (!attempts.length) {
        attempts = [{ tourAlternativeCode: tourFilter, departureDate: null, source: 'cli' }]
      }
    } else {
      log(`${tourCode}: fiyat attempt listesi…`)
      attempts = await resolveTourPriceAttempts(cfg, tokenCode, tourRow, {
        languageCode: 'tr',
        skipTourDetails: quick,
        timeoutMs: API_TIMEOUT_MS,
      })
    }
  } catch (e) {
    errors.push({ tourCode, step: 'resolveTourPriceAttempts', error: String(e) })
    continue
  }
  if (!attempts.length) continue

  tourLoop:
  for (const attempt of attempts.slice(0, quick ? 3 : 8)) {
    const dateOffsets = formatTourApiDate(attempt.departureDate) ? [null] : DATE_OFFSETS
    for (const offset of dateOffsets) {
      const departureDate = offset == null ? attempt.departureDate : addDays(offset)
      const variants = buildTourPriceRequestVariants(
        attempt,
        departureDate,
        priceRooms,
        'tr',
      ).slice(0, quick ? 2 : 5)
      for (const variant of variants) {
        if (++tries > maxTries) {
          log(`deneme limiti (${maxTries}) — durduruluyor`)
          break tourLoop
        }
        log(`GetTourPrices #${tries} ${tourCode} ${variant.departureDate ?? '?'}`)
        try {
          const payload = await getTourPrices(cfg, tokenCode, {
            ...variant,
            timeoutMs: API_TIMEOUT_MS,
          })
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
let finalPriceResolve = null
try {
  finalPriceResolve = await resolveTourFinalPrice(cfg, tokenCode, priceRow, {
    pricePayload,
    tourCode,
    variant: usedVariant,
    attempt: usedAttempt,
    requireFinalPriceForBook: true,
    skipTourExtras: true,
    quick: true,
  })
} catch (e) {
  finalPriceResolve = { error: String(e) }
}

const report = {
  tourCode,
  attempt: usedAttempt,
  variant: usedVariant,
  sessionRawId,
  sessionUuid: extractTourSessionUuid(sessionRawId),
  roomBookKeys: pickTourRoomBookKeys(priceRow, pricePayload),
  bookKeysRaw: pickTourPriceBookKeys(priceRow, pricePayload),
  bookKeys: collectTourBookKeys(priceRow, pricePayload, sessionRawId),
  strictBookKeys: collectTourBookKeys(priceRow, pricePayload, sessionRawId).filter(
    isStrictTourBookResultKey,
  ),
  variantBookKeys: pickTourVariantBookKeys(priceRow, pricePayload, sessionRawId),
  finalPriceKeys: finalPriceResolve?.resultKeys ?? [],
  finalPricePackageId: finalPriceResolve?.packageId ?? null,
  finalPriceSkipped: finalPriceResolve?.skippedFinalPrice === true,
  finalPriceError: finalPriceResolve?.error ?? null,
  finalPriceResultTopKeys: Object.keys(
    finalPriceResolve?.payload?.Result ?? finalPriceResolve?.payload?.result ?? {},
  ),
  finalPriceBookRefs: pickTourFinalPriceBookRefs(
    finalPriceResolve?.payload,
    sessionRawId,
    finalPriceResolve?.packageId,
  ),
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
writeFileSync(
  out,
  JSON.stringify(
    { pricePayload, finalPricePayload: finalPriceResolve?.payload ?? null, report },
    null,
    2,
  ),
)
console.log('tur:', tourCode)
console.log('departureDate:', usedVariant?.departureDate)
console.log('sessionRawId:', report.sessionRawId?.slice(0, 80) + (report.sessionRawId?.length > 80 ? '…' : ''))
console.log('bookKeys (fiyat):', report.bookKeys)
console.log('strictBookKeys (@/tour:/|254):', report.strictBookKeys)
console.log('variantBookKeys (|254):', report.variantBookKeys)
console.log('finalPriceKeys (book):', report.finalPriceKeys)
console.log('finalPricePackageId:', report.finalPricePackageId)
console.log('finalPriceResultTopKeys:', report.finalPriceResultTopKeys)
console.log('finalPriceBookRefs:', report.finalPriceBookRefs)
console.log('packageCandidates:', report.packageCandidates.slice(0, 6))
console.log('dosya:', out)
