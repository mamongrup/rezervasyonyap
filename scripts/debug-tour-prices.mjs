#!/usr/bin/env node
/**
 * Sandbox: tek tur için GetTourPrices yanıt yapısını döker (cert teşhis).
 *   node scripts/debug-tour-prices.mjs
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
  isPlausibleTourBookKey,
} from './lib/travelrobot-api.mjs'
import { buildSandboxConfigAsync } from './lib/travelrobot-sandbox-config.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')

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
const rows = pickTourRows(searchPayload)
const tourRow = rows[0]
if (!tourRow) {
  console.error('SearchTour boş')
  process.exit(1)
}
const tourCode = tourRowCode(tourRow)
const attempts = await resolveTourPriceAttempts(cfg, tokenCode, tourRow, { languageCode: 'tr' })
const priceRooms = buildTourPriceRooms([{ RoomIndex: 0, Adults: 2, Children: 0 }])

let pricePayload = null
let priceRow = null
let usedAttempt = null
let usedVariant = null
let lastErr = null

for (const attempt of attempts.slice(0, 8)) {
  for (const variant of buildTourPriceRequestVariants(attempt, addDays(30), priceRooms, 'tr').slice(0, 4)) {
    try {
      const payload = await getTourPrices(cfg, tokenCode, variant)
      const rows2 = pickTourPriceRows(payload)
      if (!rows2.length) continue
      pricePayload = payload
      priceRow = rows2[0]
      usedAttempt = attempt
      usedVariant = variant
      break
    } catch (e) {
      lastErr = String(e)
    }
  }
  if (priceRow) break
}

if (!priceRow) {
  console.error('GetTourPrices başarısız:', lastErr ?? 'fiyat satırı yok')
  process.exit(1)
}

const sessionRawId = pickTourPricesSessionRawId(pricePayload)
const bookKeysRaw = pickTourPriceBookKeys(priceRow, pricePayload)
const bookKeys = bookKeysRaw.filter((k) => {
  try {
    return isPlausibleTourBookKey(k)
  } catch {
    return false
  }
})

const report = {
  tourCode,
  attempt: usedAttempt,
  variant: usedVariant,
  sessionRawId,
  sessionUuid: extractTourSessionUuid(sessionRawId),
  roomBookKeys: pickTourRoomBookKeys(priceRow, pricePayload),
  bookKeysRaw,
  bookKeys,
  bookKeysAllowCatalog: pickTourPriceBookKeys(priceRow, pricePayload, { allowCatalogCodes: true }),
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
}

const out = join(root, `debug-tour-prices-${Date.now()}.json`)
writeFileSync(out, JSON.stringify({ pricePayload, report }, null, 2))
console.log('tur:', tourCode)
console.log('sessionRawId:', report.sessionRawId)
console.log('sessionUuid:', report.sessionUuid)
console.log('bookKeys:', report.bookKeys)
console.log('packageCandidates:', report.packageCandidates.slice(0, 6))
console.log('dosya:', out)
