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
  pickTourPricesSessionPackageId,
  pickTourPriceBookKeys,
  pickTourRoomBookKeys,
  collectTourFinalPricePackageIds,
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
const attempt = attempts[0]
const variant = buildTourPriceRequestVariants(attempt, addDays(30), priceRooms, 'tr')[0]
const pricePayload = await getTourPrices(cfg, tokenCode, variant)
const priceRows = pickTourPriceRows(pricePayload)
const priceRow = priceRows[0]

const report = {
  tourCode,
  attempt,
  variant,
  sessionPackageId: pickTourPricesSessionPackageId(pricePayload),
  roomBookKeys: pickTourRoomBookKeys(priceRow, pricePayload),
  bookKeys: pickTourPriceBookKeys(priceRow, pricePayload),
  bookKeysAllowCatalog: pickTourPriceBookKeys(priceRow, pricePayload, { allowCatalogCodes: true }),
  packageCandidates: collectTourFinalPricePackageIds(priceRow, {
    pricePayload,
    sessionPackageId: pickTourPricesSessionPackageId(pricePayload),
    tourCode,
    variant,
    attempt,
  }),
  priceRowKeys: priceRow ? Object.keys(priceRow) : [],
  priceRowSample: priceRow,
  resultTopKeys: Object.keys(pricePayload?.Result ?? {}),
}

const out = join(root, `debug-tour-prices-${Date.now()}.json`)
writeFileSync(out, JSON.stringify({ pricePayload, report }, null, 2))
console.log('tur:', tourCode)
console.log('sessionPackageId:', report.sessionPackageId)
console.log('bookKeys:', report.bookKeys)
console.log('packageCandidates:', report.packageCandidates.slice(0, 6))
console.log('dosya:', out)
