#!/usr/bin/env node
/**
 * Travelrobot / KPlus sandbox senaryo testi — TAM SERTİFİKASYON PAKETI
 *
 * Belgeler:
 *   - Travelrobot Air API Test Cases (3).docx
 *   - Travelrobot Hotel API Test Cases (5).docx
 *   - TRAVELROBOT API ERROR REPORTING FORM (6).docx
 *
 * Kullanım (base URL mutlaka /v0 ile bitmeli):
 *   node scripts/test-travelrobot-scenarios.mjs \
 *     --base-url "http://sandbox.kplus.com.tr/kplus/v0" \
 *     --channel-code "Test_011425" \
 *     --channel-password "ajv1bRJZuSnrd_2o*"
 *
 * Panel'de kaydedilmişse:
 *   node scripts/test-travelrobot-scenarios.mjs --from-db
 *
 * Sertifikasyon (sandbox Test_* kanalı — canlı DB ayarından bağımsız):
 *   node scripts/test-travelrobot-scenarios.mjs --sandbox --with-booking --only flights
 *
 * Hotel API Test Cases (PDF) — tam akış + System PNR + adım logları:
 *   node scripts/test-travelrobot-scenarios.mjs --from-db --with-booking --only hotels
 *   node scripts/test-travelrobot-scenarios.mjs --from-db --with-booking --only hotel-s1
 *   node scripts/test-travelrobot-scenarios.mjs --from-db --with-booking --only air-s2
 *
 * Tour PNR sertifikasyon (sandbox):
 *   node scripts/test-travelrobot-scenarios.mjs --sandbox --with-booking --only tours
 *   node scripts/test-travelrobot-scenarios.mjs --sandbox --with-booking --only tour-s1
 *
 * Çıktılar:
 *   - Konsol: özet ✅/❌
 *   - travelrobot-test-log-YYYYMMDD-HHmmss.json: tam istek/yanıt logları
 *   - travelrobot-test-summary-YYYYMMDD-HHmmss.txt: hızlı özet
 */

import { writeFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

import {
  createTravelrobotToken,
  loadTravelrobotConfig,
  // General
  refreshToken,
  getCurrencies,
  getCountries,
  // Tour
  searchTours,
  pickTourRows,
  tourRowCode,
  tourRowAlternativeCode,
  getTourPrices,
  getTourFinalPrice,
  getTourPaymentOptions,
  bookTour,
  getTourBooking,
  buildTourPriceRooms,
  buildTourFinalPriceRooms,
  buildTourRoomPaxes,
  pickTourPriceRows,
  pickTourBookResultKeys,
  pickTourPackageId,
  resolveTourPriceAttempts,
  buildTourPriceRequestVariants,
  // Hotel
  searchHotel,
  pickHotelRows,
  getHotelDetails,
  getHotelRooms,
  getRoomOffers,
  validateHotelRooms,
  getHotelFinalPrice,
  bookHotel,
  getHotelBooking,
  pickHotelBookResultKeys,
  resolveHotelPaymentAttempts,
  buildHotelBookRequest,
  buildHotelRoomPaxes,
  // Flight
  searchFlightItinerary,
  pickFlightRows,
  pickFirstFareLegKey,
  pickFareAlternativeLegKeys,
  pickFlightBookResultKeys,
  countFlightOfferSlots,
  pickHotelSearchKey,
  pickHotelRoomOfferKeys,
  pickHotelRoomOfferKeyCandidates,
  pickHotelRoomCombinationSets,
  hotelPayloadShapeFromRow,
  buildHotelValidateRooms,
  getFlightBrandedFares,
  getFareRules,
  validateFlight,
  getPaymentOptions,
  createFlightReservation,
  extractFlightPassengerRefs,
  attachPassengerRefsToFlightPaxes,
  issueTicketFromReservation,
  issueTicketDirect,
  // Transfer
  searchTransfer,
  pickTransferRows,
} from './lib/travelrobot-api.mjs'

import {
  authenticateStatic,
  getAllHotelCodes,
  getDestinations,
  getStaticCountries,
  getHotelContent,
} from './lib/travelrobot-static-api.mjs'

import {
  CERT_HOTEL_BY_DESTINATION,
  CERT_HOTEL_FALLBACKS,
  TRAVELROBOT_SANDBOX_HOTELS,
} from './lib/travelrobot-sandbox-ids.mjs'
import { buildSandboxConfigAsync, isSandboxBaseUrl } from './lib/travelrobot-sandbox-config.mjs'
import { loadBackendEnvFile } from './lib/load-backend-env.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))

// ─── Argümanlar ───────────────────────────────────────────────────────────────

const args = process.argv.slice(2)
const getArg = (flag) => {
  const i = args.indexOf(flag)
  return i >= 0 ? args[i + 1] : undefined
}
const FROM_DB = args.includes('--from-db')
const USE_SANDBOX = args.includes('--sandbox')
const SKIP_BOOKING = !args.includes('--with-booking') // booking adımları varsayılan olarak atla
const ONLY = getArg('--only')?.toLowerCase() ?? ''
const ONLY_HOTEL_S1 = ONLY === 'hotel-s1' || ONLY === 's1'
const ONLY_AIR_S2 = ONLY === 'air-s2' || ONLY === 's2'
const ONLY_AIR_LCC = ONLY === 'air-lcc' || ONLY === 'lcc'
const RUN_HOTELS = !ONLY || ONLY === 'hotels' || ONLY === 'hotel' || ONLY_HOTEL_S1
const RUN_FLIGHTS =
  !ONLY || ONLY === 'flights' || ONLY === 'flight' || ONLY === 'air' || ONLY_AIR_S2 || ONLY_AIR_LCC
const ONLY_TOUR_S1 = ONLY === 'tour-s1' || ONLY === 'tours1'
const RUN_TOURS = !ONLY || ONLY === 'tours' || ONLY === 'tour' || ONLY_TOUR_S1
const RUN_STATIC = !ONLY || ONLY === 'static'
const RUN_GENERAL = !ONLY && !ONLY_HOTEL_S1
/** Sunucuda doğru sürüm çalıştığını doğrulamak için (git pull sonrası değişmeli). */
const TRAVELROBOT_TEST_SCRIPT_VERSION = '2026-06-12-cert-tour-pnr-v2'
/** Başarılı Air-S1 book yanıtında dönen sandbox TC (TEST/TRAVELER + pasaport). */
const KPLUS_DEFAULT_TC = '11111111110'

function generateValidTcKimlik(seed = 1) {
  const n = 100000000 + ((seed * 7919 + 1234567) % 899999999)
  const base = String(n).padStart(9, '0').slice(0, 9)
  const d = [...base].map(Number)
  const odd = d[0] + d[2] + d[4] + d[6] + d[8]
  const even = d[1] + d[3] + d[5] + d[7]
  let d10 = (odd * 7 - even) % 10
  if (d10 < 0) d10 += 10
  const d11 = (d.reduce((s, x) => s + x, 0) + d10) % 10
  return base + String(d10) + String(d11)
}

function sandboxTcKimlik(index = 0) {
  if (index === 0) return KPLUS_DEFAULT_TC
  return generateValidTcKimlik(index)
}

/** Air-S1 book formatı: benzersiz TC + pasaport (yurt içi LCC). */
function applyKplusDomesticIdentity(flightPaxes, opts = {}) {
  let tcIdx = opts.tcStartIndex ?? 0
  return (flightPaxes ?? []).map((entry, i) => {
    const copy = { ...entry, Pax: { ...entry.Pax } }
    const paxType = Number(entry.PaxType ?? entry.FlightPaxType ?? 0)
    if (opts.infantNoTc === true && paxType === 2) {
      copy.Pax.IdentityNumber = null
    } else {
      copy.Pax.IdentityNumber = sandboxTcKimlik(tcIdx++)
    }
    copy.Pax.PassportNumber = copy.Pax.PassportNumber ?? `AA${String(100001 + i).slice(-6)}`
    copy.Pax.PassportValidityDate = copy.Pax.PassportValidityDate ?? '01.01.2030'
    return copy
  })
}
/** Sandbox stoğu için alternatif giriş tarihleri (gün). */
const HOTEL_CERT_DATE_OFFSETS = [14, 21, 30, 45, 60, 75, 90, 120]
/** İstanbul S1: erken tarih + kısa konaklama (sandbox stoğu). */
const HOTEL_S1_DATE_OFFSETS = [7, 10, 14, 21, 30, 45, 60, 90]
const HOTEL_S1_STAY_NIGHTS = [3, 5, 7]
/** KPlus Hotel API Test Cases PDF — System PNR özeti (Client Notes ile birlikte gönderilir). */
const HOTEL_CERT_RESULTS = []
const AIR_CERT_RESULTS = []
const TOUR_CERT_RESULTS = []
const TOUR_CERT_DATE_OFFSETS = [30, 45, 60, 90, 120, 150]

function rankHotelRowsForPricing(rows, preferredHotel, fallbackCodes = []) {
  const prefer = new Set([preferredHotel, ...fallbackCodes].filter(Boolean))
  return [...rows].sort((a, b) => {
    const ac = prefer.has(a.HotelCode ?? a.hotelCode) ? 0 : 1
    const bc = prefer.has(b.HotelCode ?? b.hotelCode) ? 0 : 1
    return ac - bc
  })
}

const CREDS = {
  baseUrl: getArg('--base-url') ?? process.env.TRAVELROBOT_BASE_URL ?? '',
  channelCode: getArg('--channel-code') ?? process.env.TRAVELROBOT_CHANNEL_CODE ?? '',
  channelPassword: getArg('--channel-password') ?? process.env.TRAVELROBOT_CHANNEL_PASSWORD ?? '',
}

// ─── Log altyapısı ────────────────────────────────────────────────────────────

const LOG_ENTRIES = []
const SUMMARY_LINES = []
let passCount = 0
let failCount = 0

const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
const logFile = join(__dirname, '..', `travelrobot-test-log-${ts}.json`)
const summaryFile = join(__dirname, '..', `travelrobot-test-summary-${ts}.txt`)

function log(scenario, method, endpoint, requestBody, responseBody, success, note = '') {
  LOG_ENTRIES.push({
    timestamp: new Date().toISOString(),
    scenario,
    method,
    endpoint,
    request: requestBody,
    response: responseBody,
    success,
    note,
  })
}

function ok(label, detail = '') {
  passCount++
  const line = `  ✅ ${label}${detail ? `  →  ${detail}` : ''}`
  console.log(line)
  SUMMARY_LINES.push(line)
}

function fail(label, err) {
  failCount++
  const line = `  ❌ ${label}  →  ${String(err).slice(0, 300)}`
  console.log(line)
  SUMMARY_LINES.push(line)
}

function section(title) {
  const line = `\n${'─'.repeat(70)}\n📋 ${title}\n${'─'.repeat(70)}`
  console.log(line)
  SUMMARY_LINES.push(line)
}

function preview(obj, maxLen = 200) {
  if (!obj) return '(boş)'
  return JSON.stringify(obj).slice(0, maxLen)
}

function saveLogs() {
  try {
    writeFileSync(logFile, JSON.stringify(LOG_ENTRIES, null, 2), 'utf8')
    writeFileSync(summaryFile, SUMMARY_LINES.join('\n'), 'utf8')
    console.log(`\n📁 Tam log: ${logFile}`)
    console.log(`📄 Özet  : ${summaryFile}`)
  } catch (e) {
    console.warn('Log kaydedilemedi:', e.message)
  }
}

// ─── Tarih yardımcısı ─────────────────────────────────────────────────────────

function addDays(n) {
  const d = new Date()
  d.setUTCDate(d.getUTCDate() + n)
  const dd = String(d.getUTCDate()).padStart(2, '0')
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0')
  return `${dd}.${mm}.${d.getUTCFullYear()}`
}

// ─── Test pax verisi (Postman koleksiyonu formatında) ─────────────────────────

function formatDobFromDate(d) {
  const dd = String(d.getUTCDate()).padStart(2, '0')
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0')
  return `${dd}.${mm}.${d.getUTCFullYear()}`
}

function infantDateOfBirth(monthsOld = 10) {
  const d = new Date()
  d.setUTCMonth(d.getUTCMonth() - monthsOld)
  return formatDobFromDate(d)
}

function ageFromDob(dob) {
  const m = /^(\d{2})\.(\d{2})\.(\d{4})$/.exec(String(dob ?? ''))
  if (!m) return 0
  const birth = new Date(Date.UTC(Number(m[3]), Number(m[2]) - 1, Number(m[1])))
  const now = new Date()
  let age = now.getUTCFullYear() - birth.getUTCFullYear()
  const md = now.getUTCMonth() - birth.getUTCMonth()
  if (md < 0 || (md === 0 && now.getUTCDate() < birth.getUTCDate())) age--
  return Math.max(0, age)
}

function makePax(firstName, lastName, dob, gender = 1, nationality = 'TR', passport = null) {
  return {
    PaxId: 0,
    PreviousPaxId: 0,
    EmployeeId: null,
    FirstName: firstName,
    LastName: lastName,
    DateOfBirth: dob,
    Email: null,
    MobilePhone: null,
    NationalityCode: nationality,
    IdentityNumber: nationality === 'TR' ? '11111111110' : null,
    PassportNumber: passport ?? 'AA123456',
    PassportValidityDate: '01.01.2030',
    HESCode: null,
    GenderType: gender, // 1=Male, 0=Female
    StatusType: 0,
    ReferenceId: null,
    Age: 0,
  }
}

const TEST_CONTACT = {
  RecId: 0,
  FirstName: 'TEST',
  LastName: 'TRAVELER',
  Phone: '+90 555 555 5555',
  Email: 'developer@kplus.com.tr',
  GenderType: 1,
  StatusType: 0,
}

const TEST_INVOICE = {
  RecId: 0,
  InvoiceInfoType: 1,
  InvoiceInfoTitle: 'Invoice',
  TaxOffice: '',
  TaxNumber: '',
  CompanyName: 'TEST COMPANY',
  FirstName: null,
  LastName: null,
  PostalCode: '34000',
  CityCode: 'IST',
  CityName: 'Istanbul',
  CountryCode: null,
  Address: 'Test Address',
  StatusType: 0,
}

// Sandbox uçuş/otel book — acente kredisi (sandbox varsayılan)
const AIR_TEST_PAYMENT = {
  PaymentType: 2,
  PaymentItemId: '1',
  PaymentCommissionType: 0,
  PaymentDescription: null,
  HasWorkMultiCurrency: false,
}

// Sandbox otel book — acente kredisi (kart bilgisi gerekmez)
const HOTEL_TEST_PAYMENT = {
  PaymentType: 2,
  PaymentItemId: '1',
  PaymentCommissionType: 0,
  PaymentDescription: null,
  HasWorkMultiCurrency: false,
}

// Sandbox tur book — otel ile aynı (acente kredisi)
const TOUR_TEST_PAYMENT = HOTEL_TEST_PAYMENT

// Sandbox ödeme — uçuş vb. (kart test)
const TEST_PAYMENT = {
  PaymentItemId: '1',
  CardInfo: {
    Email: 'developer@kplus.com.tr',
    IpAdress: '127.0.0.1',
    CardHolderName: 'TEST TRAVELER',
    CardNumber: '4444444444444444',
    CardExpMonth: 12,
    CardExpYear: 2030,
    Cv2: '123',
    Is3D: false,
    ReturnUrl: 'http://localhost:3000/payment/return',
    CardId: null,
    SaveCard: false,
  },
  PaymentType: 0,
  PaymentCommissionType: 0,
  PaymentDescription: null,
  HasWorkMultiCurrency: false,
}

function makeFlightCertPax(firstName, lastName, dob, gender = 1, passport = null, certOpts = {}) {
  const pax = makePax(firstName, lastName, dob, gender, 'TR', passport)
  if (certOpts.useTcKimlik === true && certOpts.tcIndex != null) {
    pax.IdentityNumber = sandboxTcKimlik(certOpts.tcIndex)
  } else {
    pax.IdentityNumber = null
  }
  return pax
}

const FLIGHT_BOOK_RETRY_ERR =
  /passenger count|passenger type|invalid payment|invalid key|invalid first name|invalid identity/i

async function tryCreateFlightBook(cfg, bookOpts) {
  const variants = bookOpts.paxVariants ?? [{ label: 'default', flightPaxes: bookOpts.flightPaxes, mapPaxes: true }]
  let lastPayload = null
  let lastVariant = null
  let lastFlightPaxes = null
  for (const variant of variants) {
    lastFlightPaxes = variant.flightPaxes
    let payload
    try {
      payload = await createFlightReservation(cfg, {
        ...bookOpts,
        flightPaxes: variant.flightPaxes,
        mapPaxes: variant.mapPaxes ?? true,
        useFlightPaxType: variant.useFlightPaxType,
      })
    } catch (e) {
      const err = String(e)
      lastPayload = { HasError: true, ErrorMessage: err }
      lastVariant = variant.label
      if (!FLIGHT_BOOK_RETRY_ERR.test(err)) {
        return { payload: lastPayload, variant: lastVariant, flightPaxes: lastFlightPaxes, fatal: true }
      }
      continue
    }
    if (!payload?.HasError && (payload?.Result?.Booking?.SystemPnr ?? payload?.Result?.SystemPnr)) {
      return { payload, variant: variant.label, flightPaxes: variant.flightPaxes }
    }
    const err = payload?.ErrorMessage ?? ''
    lastPayload = payload
    lastVariant = variant.label
    if (!FLIGHT_BOOK_RETRY_ERR.test(err)) {
      return { payload, variant: variant.label, flightPaxes: lastFlightPaxes, fatal: true }
    }
  }
  return lastPayload ? { payload: lastPayload, variant: lastVariant, flightPaxes: lastFlightPaxes } : null
}

// ─── Uçuş senaryo çalıştırıcı ────────────────────────────────────────────────

async function runFlightScenario(cfg, tokenCode, scenarioName, opts) {
  section(`${scenarioName}`)
  let resultKey = null
  let systemPnr = null
  let searchPayload = null

  // Adım 1: SearchAvailability
  try {
    const payload = await searchFlightItinerary(cfg, tokenCode, opts)
    searchPayload = payload
    const rows = pickFlightRows(payload)
    log(scenarioName, 'SearchItinerary', '/Flight.svc/Rest/Json/SearchItinerary', opts, payload, rows.length >= 0)

    if (rows.length > 0) {
      ok(`[${scenarioName}] SearchItinerary`, `${rows.length} sonuç`)
      resultKey = pickFirstFareLegKey(payload, { resultType: opts.resultType })
      const first = rows[0]
      const airline = first?.AirlineName ?? first?.airlineName ?? first?.Airline ?? '?'
      const price = first?.TotalPrice ?? first?.totalPrice ?? first?.Price ?? '?'
      ok(`[${scenarioName}] İlk sonuç`, `${airline} — ${price}`)
    } else if (!payload?.HasError) {
      const sr = payload?.Result?.SearchResults ?? payload?.Result?.searchResults
      const srLen = Array.isArray(sr) ? sr.length : 0
      console.log(
        `  ℹ️  [${scenarioName}] SearchAvailability: boş (SearchResults=${srLen}, sandbox uçuş stoğu yok)`,
      )
      SUMMARY_LINES.push(`  ℹ️  ${scenarioName}: uçuş stoğu boş (sandbox)`)
      return
    } else {
      fail(`[${scenarioName}] SearchItinerary`, payload?.ErrorMessage ?? preview(payload, 400))
      return
    }
  } catch (e) {
    log(scenarioName, 'SearchItinerary', '/Flight.svc/Rest/Json/SearchItinerary', opts, String(e), false)
    fail(`[${scenarioName}] SearchItinerary`, e)
    return
  }

  const keyOpts = { resultType: opts.resultType, offerIndex: 0 }
  const offerSlots = Math.min(countFlightOfferSlots(searchPayload, keyOpts), 20)
  let fareLegKeys = []
  let brandedOk = false
  let validateOk = false
  let validatePayload = null
  let bookResultKeys = []
  let validatedOfferIndex = 0
  let lastBrandedErr = ''
  let lastValidateErr = ''

  for (let offerIndex = 0; offerIndex < offerSlots; offerIndex++) {
    fareLegKeys = pickFareAlternativeLegKeys(searchPayload, { ...keyOpts, offerIndex })
    if (!fareLegKeys.length) continue

    let brandedPayload = null
    try {
      brandedPayload = await getFlightBrandedFares(cfg, tokenCode, {
        fareAlternativeLegKeys: fareLegKeys,
      })
      log(scenarioName, 'GetBrandedFares', '/Air.svc/Rest/Json/GetBrandedFares',
        { offerIndex, keys: fareLegKeys.length }, brandedPayload, !brandedPayload?.HasError)
      if (!brandedPayload?.HasError) {
        brandedOk = true
        const brandedKeys = pickFareAlternativeLegKeys(brandedPayload, keyOpts)
        if (brandedKeys.length) fareLegKeys = brandedKeys
      } else {
        lastBrandedErr = brandedPayload?.ErrorMessage ?? 'Hata'
        if (/minimum 2 hours|invalid key|availability not found/i.test(lastBrandedErr)) continue
        fail(`[${scenarioName}] GetBrandedFares`, lastBrandedErr)
        break
      }
    } catch (e) {
      lastBrandedErr = String(e)
      log(scenarioName, 'GetBrandedFares', '/Air.svc/Rest/Json/GetBrandedFares', { offerIndex }, lastBrandedErr, false)
      if (/minimum 2 hours|invalid key|availability not found/i.test(lastBrandedErr)) continue
      fail(`[${scenarioName}] GetBrandedFares`, e)
      break
    }

    try {
      const payload = await validateFlight(cfg, tokenCode, { fareAlternativeLegKeys: fareLegKeys })
      log(scenarioName, 'ValidateFlight', '/Air.svc/Rest/Json/Validate', { offerIndex, keys: fareLegKeys.length }, payload, !payload?.HasError)
      if (!payload?.HasError) {
        validateOk = true
        validatePayload = payload
        validatedOfferIndex = offerIndex
        bookResultKeys = pickFlightBookResultKeys(payload, fareLegKeys, keyOpts)
        ok(`[${scenarioName}] GetBrandedFares`, `teklif #${offerIndex + 1}, ${fareLegKeys.length} bacak key`)
        ok(`[${scenarioName}] ValidateFlight`, `Fiyat kilitleme başarılı (${bookResultKeys.length} ResultKey)`)
        if (!SKIP_BOOKING) {
          const flightPaxesTry = buildFlightPaxes(opts)
          const { variants: paxVariants, passengerRefs } = buildFlightBookPaxVariants(opts, validatePayload)
          try {
            const bookHit = await tryCreateFlightBook(cfg, {
              tokenCode,
              resultKeys: bookResultKeys,
              flightPaxes: flightPaxesTry,
              paxVariants,
              passengerRefCount: passengerRefs.length,
              contactInfo: buildFlightContact(flightPaxesTry),
              invoiceInfo: TEST_INVOICE,
              paymentInfo: AIR_TEST_PAYMENT,
              bookingNote: `rezervasyonyap.tr sandbox certification — ${scenarioName}`,
              languageCode: opts.languageCode ?? 'tr',
            })
            if (bookHit?.payload && !bookHit.payload?.HasError) {
              systemPnr =
                bookHit.payload?.Result?.Booking?.SystemPnr ?? bookHit.payload?.Result?.SystemPnr ?? null
              if (systemPnr) break
            }
            if (bookHit?.fatal) break
          } catch (e) {
            if (FLIGHT_BOOK_RETRY_ERR.test(String(e))) continue
          }
        } else {
          break
        }
        continue
      }
      lastValidateErr = payload?.ErrorMessage ?? 'Hata'
      if (/invalid key/i.test(lastValidateErr)) continue
      fail(`[${scenarioName}] ValidateFlight`, lastValidateErr)
      return
    } catch (e) {
      lastValidateErr = String(e)
      if (/invalid key/i.test(lastValidateErr)) continue
      fail(`[${scenarioName}] ValidateFlight`, e)
      return
    }
  }

  if (!fareLegKeys.length) {
    console.log(`  ⚠️  FareAlternativeLeg Key alınamadı — sonraki adımlar atlanıyor`)
    return
  }
  if (!brandedOk && opts.resultType === 0 && (opts.flightType === 2 || (opts.legs?.length ?? 0) > 2)) {
    const sepOpts = { resultType: 1, offerIndex: 0 }
    const sepSlots = Math.min(countFlightOfferSlots(searchPayload, sepOpts), 12)
    for (let offerIndex = 0; offerIndex < sepSlots && !brandedOk; offerIndex++) {
      fareLegKeys = pickFareAlternativeLegKeys(searchPayload, { ...sepOpts, offerIndex })
      if (!fareLegKeys.length) continue
      try {
        const brandedPayload = await getFlightBrandedFares(cfg, tokenCode, { fareAlternativeLegKeys: fareLegKeys })
        if (!brandedPayload?.HasError) {
          brandedOk = true
          const brandedKeys = pickFareAlternativeLegKeys(brandedPayload, sepOpts)
          if (brandedKeys.length) fareLegKeys = brandedKeys
          const valPayload = await validateFlight(cfg, tokenCode, { fareAlternativeLegKeys: fareLegKeys })
          if (!valPayload?.HasError) {
            validateOk = true
            validatePayload = valPayload
            validatedOfferIndex = offerIndex
            bookResultKeys = pickFlightBookResultKeys(valPayload, fareLegKeys, sepOpts)
            ok(`[${scenarioName}] GetBrandedFares`, `Separated fallback, teklif #${offerIndex + 1}`)
            ok(`[${scenarioName}] ValidateFlight`, `Fiyat kilitleme başarılı`)
            break
          }
          brandedOk = false
        }
      } catch {
        /* next */
      }
    }
  }

  if (!brandedOk) {
    fail(`[${scenarioName}] GetBrandedFares`, lastBrandedErr || 'Uygun teklif bulunamadı')
    return
  }
  if (!validateOk) {
    fail(`[${scenarioName}] ValidateFlight`, lastValidateErr || 'Uygun teklif bulunamadı')
    return
  }

  if (SKIP_BOOKING) {
    console.log(`  ℹ️  Booking adımları atlandı (--with-booking flag'i ile etkinleştir)`)
    return
  }

  const clientNotes = `rezervasyonyap.tr sandbox certification — ${scenarioName}`
  const flightPaxes = buildFlightPaxes(opts)
  const flightContact = buildFlightContact(flightPaxes)
  const leaderLastName = flightPaxes[0]?.Pax?.LastName ?? 'SMITH'
  const certRow = {
    scenario: scenarioName,
    systemPnr: null,
    pnr: null,
    ticketNumbers: [],
    directSystemPnr: null,
    directPnr: null,
    directTicketNumbers: [],
    clientNotes,
  }

  const extractAirPnr = (payload) => {
    const booking = payload?.Result?.Booking ?? payload?.Result?.booking ?? payload?.Result ?? {}
    return {
      systemPnr: booking?.SystemPnr ?? booking?.systemPnr ?? payload?.Result?.SystemPnr ?? payload?.SystemPnr ?? null,
      pnr: booking?.Pnr ?? booking?.pnr ?? payload?.Result?.Pnr ?? payload?.Pnr ?? null,
      tickets: booking?.TicketNumbers ?? booking?.ticketNumbers ?? payload?.Result?.TicketNumbers ?? [],
    }
  }

  // Adım 4: CreateReservation (Book) — validate döngüsünde yapılmadıysa
  if (!systemPnr) {
    try {
      const { variants: paxVariants, passengerRefs } = buildFlightBookPaxVariants(opts, validatePayload)
      const bookHit = await tryCreateFlightBook(cfg, {
        tokenCode,
        resultKeys: bookResultKeys,
        flightPaxes,
        paxVariants,
        passengerRefCount: passengerRefs.length,
        contactInfo: flightContact,
        invoiceInfo: TEST_INVOICE,
        paymentInfo: AIR_TEST_PAYMENT,
        agentReferenceInfo: `RY-${Date.now()}-air`,
        bookingNote: clientNotes,
        languageCode: opts.languageCode ?? 'tr',
      })
      const payload = bookHit?.payload ?? null
      log(scenarioName, 'CreateReservation', '/Air.svc/Rest/Json/Book',
        {
          resultKeys: bookResultKeys,
          paxCount: flightPaxes.length,
          passengerRefCount: passengerRefs.length,
          variant: bookHit?.variant,
          paxIdentity: (bookHit?.flightPaxes ?? flightPaxes)?.map((e) => ({
            type: e.PaxType ?? e.FlightPaxType,
            tc: e.Pax?.IdentityNumber ?? null,
            passport: e.Pax?.PassportNumber ?? null,
          })),
        },
        payload,
        !payload?.HasError)
      if (payload && !payload?.HasError) {
        const refs = extractAirPnr(payload)
        systemPnr = refs.systemPnr
        certRow.systemPnr = refs.systemPnr
        certRow.pnr = refs.pnr
        ok(`[${scenarioName}] CreateReservation`,
          `SystemPNR: ${systemPnr ?? '(yok)'}  PNR: ${refs.pnr ?? '(yok)'}${bookHit?.variant ? ` (${bookHit.variant})` : ''}`)
      } else {
        fail(`[${scenarioName}] CreateReservation`, payload?.ErrorMessage ?? 'Hata')
        return
      }
    } catch (e) {
      log(scenarioName, 'CreateReservation', '/Air.svc/Rest/Json/Book',
        { resultKeys: bookResultKeys }, String(e), false)
      fail(`[${scenarioName}] CreateReservation`, e)
      return
    }
  } else {
    certRow.systemPnr = systemPnr
    ok(`[${scenarioName}] CreateReservation`, `SystemPNR: ${systemPnr} (teklif retry)`)
  }

  if (!systemPnr) {
    console.log(`  ⚠️  SystemPNR alınamadı — bilet adımları atlanıyor`)
    return
  }

  // Adım 5: IssueTicketFromReservation
  try {
    const payload = await issueTicketFromReservation(cfg, {
      tokenCode,
      systemPnr,
      lastName: leaderLastName,
      paymentInfo: AIR_TEST_PAYMENT,
      languageCode: opts.languageCode ?? 'tr',
    })
    log(scenarioName, 'IssueTicketFromReservation', '/Air.svc/Rest/Json/ReservationToTicket',
      { systemPnr, lastName: leaderLastName }, payload, !payload?.HasError)
    if (!payload?.HasError) {
      const refs = extractAirPnr(payload)
      const tickets = Array.isArray(refs.tickets) ? refs.tickets : []
      certRow.ticketNumbers = tickets
      ok(`[${scenarioName}] IssueTicketFromReservation`, `Bilet: ${tickets.join(', ') || '(sandbox)'}`)
    } else {
      const msg = payload?.ErrorMessage ?? 'Hata'
      console.log(`  ⚠️  [${scenarioName}] IssueTicketFromReservation atlandı (sandbox): ${msg}`)
      SUMMARY_LINES.push(`  ⚠️  ${scenarioName}: IssueTicketFromReservation — ${msg}`)
    }
  } catch (e) {
    log(scenarioName, 'IssueTicketFromReservation', '/Air.svc/Rest/Json/ReservationToTicket',
      { systemPnr }, String(e), false)
    console.log(`  ⚠️  [${scenarioName}] IssueTicketFromReservation: ${String(e).slice(0, 120)}`)
  }

  // Adım 6: IssueTicketDirect — farklı teklif ile ikinci validate
  const directOfferIndex = validatedOfferIndex + 1 < offerSlots ? validatedOfferIndex + 1 : validatedOfferIndex
  const directKeyOpts = { ...keyOpts, offerIndex: directOfferIndex }
  let directKeys = pickFareAlternativeLegKeys(searchPayload, directKeyOpts)
  if (directKeys.length) {
    try {
      const brandedDirect = await getFlightBrandedFares(cfg, tokenCode, { fareAlternativeLegKeys: directKeys })
      if (!brandedDirect?.HasError) {
        const bk = pickFareAlternativeLegKeys(brandedDirect, directKeyOpts)
        if (bk.length) directKeys = bk
      }
      const valDirect = await validateFlight(cfg, tokenCode, { fareAlternativeLegKeys: directKeys })
      log(scenarioName, 'ValidateFlight (direct)', '/Air.svc/Rest/Json/Validate',
        { offerIndex: directOfferIndex, keys: directKeys.length }, valDirect, !valDirect?.HasError)
      if (!valDirect?.HasError) {
        const directResultKeys = pickFlightBookResultKeys(valDirect, directKeys, directKeyOpts)
        const { variants: directPaxVariants } = buildFlightBookPaxVariants(opts, valDirect)
        const directPaxes = directPaxVariants[0]?.flightPaxes ?? flightPaxes
        const directPayload = await issueTicketDirect(cfg, {
          tokenCode,
          resultKeys: directResultKeys,
          flightPaxes: directPaxes,
          mapPaxes: true,
          useFlightPaxType: true,
          contactInfo: flightContact,
          invoiceInfo: TEST_INVOICE,
          paymentInfo: AIR_TEST_PAYMENT,
          agentReferenceInfo: `RY-DIRECT-${Date.now()}`,
          bookingNote: clientNotes,
          languageCode: opts.languageCode ?? 'tr',
        })
        log(scenarioName, 'IssueTicketDirect', '/Air.svc/Rest/Json/IssueTicketDirect',
          { resultKeys: directResultKeys }, directPayload, !directPayload?.HasError)
        if (!directPayload?.HasError) {
          const refs = extractAirPnr(directPayload)
          certRow.directSystemPnr = refs.systemPnr
          certRow.directPnr = refs.pnr
          certRow.directTicketNumbers = Array.isArray(refs.tickets) ? refs.tickets : []
          ok(`[${scenarioName}] IssueTicketDirect`,
            `SystemPNR: ${refs.systemPnr ?? '(yok)'}  Bilet: ${certRow.directTicketNumbers.join(', ') || '(sandbox)'}`)
        } else {
          console.log(`  ⚠️  [${scenarioName}] IssueTicketDirect atlandı: ${directPayload?.ErrorMessage ?? 'Hata'}`)
        }
      }
    } catch (e) {
      log(scenarioName, 'IssueTicketDirect', '/Air.svc/Rest/Json/IssueTicketDirect', {}, String(e), false)
      console.log(`  ⚠️  [${scenarioName}] IssueTicketDirect: ${String(e).slice(0, 120)}`)
    }
  }

  if (certRow.systemPnr) AIR_CERT_RESULTS.push(certRow)
}

/** KPlus sandbox onaylı yolcu isimleri (LCC dahil). */
function applyFlightCertNames(flightPaxes, certOpts = {}) {
  let tcIdx = certOpts.tcStartIndex ?? 0
  return (flightPaxes ?? []).map((entry) => {
    const copy = { ...entry, Pax: { ...entry.Pax } }
    const paxType = Number(entry.PaxType ?? entry.FlightPaxType ?? 0)
    const passport = copy.Pax?.PassportNumber ?? 'AA123456'
    const paxCertOpts = {
      useTcKimlik: certOpts.useTcKimlik === true,
      tcIndex: tcIdx++,
    }
    if (paxType === 0 && entry.IsLeader) {
      copy.Pax = makeFlightCertPax('TEST', 'TRAVELER', '15.06.1990', 1, passport, paxCertOpts)
      copy.Pax.Age = 30
    } else if (paxType === 0) {
      copy.Pax = makeFlightCertPax('TEST', 'GUEST', '15.06.1992', 1, passport, paxCertOpts)
      copy.Pax.Age = 30
    } else if (paxType === 1) {
      const age = Number(copy.Pax?.Age ?? copy.Pax?.ChildAge ?? 5)
      const y = new Date().getUTCFullYear() - age
      copy.Pax = makeFlightCertPax('TIM', 'TRAVELER', `15.06.${y}`, 1, passport, paxCertOpts)
      copy.Pax.Age = age
      copy.Pax.ChildAge = age
    } else if (paxType === 2) {
      const dob = copy.Pax?.DateOfBirth ?? infantDateOfBirth(10)
      copy.Pax = makeFlightCertPax('BABY', 'TRAVELER', dob, 1, passport, paxCertOpts)
      copy.Pax.Age = Math.min(1, ageFromDob(dob))
    }
    return copy
  })
}

function buildFlightPaxes(opts) {
  const paxes = []
  const adults = opts.adults ?? 1
  const children = opts.children ?? 0
  const infants = opts.infants ?? 0
  const useCertNames = opts.useCertNames === true
  const useTcKimlik = opts.useTcKimlik === true
  const adultNames = useCertNames
    ? [
        ['TEST', 'TRAVELER'],
        ['TEST', 'GUEST'],
        ['TEST', 'GUEST2'],
        ['TEST', 'GUEST3'],
      ]
    : [
        ['JOHN', 'SMITH'],
        ['MARY', 'SMITH'],
        ['ALEX', 'BROWN'],
        ['TEST', 'TRAVELER'],
      ]
  const childNames = useCertNames
    ? [['TIM', 'TRAVELER'], ['ANN', 'TRAVELER'], ['KATE', 'TRAVELER']]
    : [['TIM', 'SMITH'], ['ANN', 'SMITH'], ['KATE', 'BROWN']]
  const childAges = opts.childAges ?? [5, 5, 5]
  let paxSeq = 0

  for (let i = 0; i < adults; i++) {
    const [fn, ln] = adultNames[i] ?? (useCertNames ? ['TEST', 'TRAVELER'] : ['JOHN', 'SMITH'])
    const pax = makeFlightCertPax(
      fn,
      ln,
      i === 0 ? '15.06.1990' : '15.06.1992',
      1,
      `AA${String(100001 + paxSeq).slice(-6)}`,
      { useTcKimlik, tcIndex: paxSeq },
    )
    pax.Age = 30
    paxSeq++
    paxes.push({ RecId: 0, IsLeader: i === 0, PaxType: 0, Pax: pax })
  }
  const leaderLast = paxes[0]?.Pax?.LastName ?? (useCertNames ? 'TRAVELER' : 'SMITH')
  for (let i = 0; i < children; i++) {
    const [fn, ln] = childNames[i] ?? [useCertNames ? 'TIM' : 'TIM', leaderLast]
    const age = Number(childAges[i] ?? 5)
    const birthYear = new Date().getUTCFullYear() - age
    const pax = makeFlightCertPax(
      fn,
      ln,
      `15.06.${birthYear}`,
      1,
      `AA${String(100001 + paxSeq).slice(-6)}`,
      { useTcKimlik, tcIndex: paxSeq },
    )
    pax.Age = age
    pax.ChildAge = age
    paxSeq++
    paxes.push({ RecId: 0, IsLeader: false, PaxType: 1, Pax: pax })
  }
  for (let i = 0; i < infants; i++) {
    const dob = infantDateOfBirth(10)
    const pax = makeFlightCertPax(
      'BABY',
      leaderLast,
      dob,
      1,
      `AA${String(100001 + paxSeq).slice(-6)}`,
      { useTcKimlik, tcIndex: paxSeq },
    )
    pax.Age = Math.min(1, ageFromDob(dob))
    paxSeq++
    paxes.push({ RecId: 0, IsLeader: false, PaxType: 2, Pax: pax })
  }
  return paxes
}

/** Validate PassengerRef + Stoplight/legacy pax formatlarını sırayla dene. */
function buildFlightBookPaxVariants(opts, validatePayload = null) {
  const standard = buildFlightPaxes(opts)
  const paxCount = standard.length
  const passengerRefs = validatePayload ? extractFlightPassengerRefs(validatePayload, paxCount) : []
  const withRefs = passengerRefs.length
    ? attachPassengerRefsToFlightPaxes(standard, passengerRefs)
    : standard
  const certNames = applyFlightCertNames(withRefs, { useTcKimlik: false })
  const certNamesTc = applyFlightCertNames(withRefs, { useTcKimlik: true })

  const variantEntry = (label, flightPaxes, mapPaxes, useFlightPaxType = true) => ({
    label,
    flightPaxes,
    mapPaxes,
    useFlightPaxType,
  })

  const variants = []
  if (opts.useCertNames === true) {
    if (opts.useTcKimlik === true) {
      const kplusS1 = applyKplusDomesticIdentity(certNames)
      const kplusS1InfantNoTc = applyKplusDomesticIdentity(certNames, { infantNoTc: true })
      variants.push(
        variantEntry('kplus-s1-tc+passport+refs', kplusS1, true, true),
        variantEntry('kplus-s1-tc+passport+legacy', kplusS1, false),
        variantEntry('kplus-s1-tc+passport+inf-no-tc', kplusS1InfantNoTc, true, true),
        variantEntry('cert-tc+flight-pax-type+refs', certNamesTc, true, true),
        variantEntry('cert-tc+pax-type+refs', certNamesTc, true, false),
        variantEntry('cert-tc+legacy+refs', certNamesTc, false),
      )
    }
    variants.push(
      variantEntry('cert-names+flight-pax-type+refs', certNames, true, true),
      variantEntry('cert-names+pax-type+refs', certNames, true, false),
      variantEntry('cert-names+legacy+refs', certNames, false),
    )
  }
  variants.push(
    variantEntry('flight-pax-type+refs', withRefs, true, true),
    variantEntry('pax-type+refs', withRefs, true, false),
    variantEntry('legacy+refs', withRefs, false),
  )
  if (paxCount > 1 && opts.useCertNames !== true) {
    variants.push(variantEntry('flight-pax-type+refs-test-names', certNames, true, true))
  }
  return { variants, passengerRefs }
}

function buildFlightContact(flightPaxes) {
  const leader = flightPaxes.find((p) => p.IsLeader)?.Pax ?? flightPaxes[0]?.Pax
  return {
    ...TEST_CONTACT,
    FirstName: leader?.FirstName ?? TEST_CONTACT.FirstName,
    LastName: leader?.LastName ?? TEST_CONTACT.LastName,
  }
}

function leaderContactFromPaxes(hotelRoomPaxes) {
  for (const room of hotelRoomPaxes) {
    const leader = room.Paxes?.find((p) => p.IsLeader)
    const pax = leader?.Pax ?? room.Paxes?.[0]?.Pax
    if (pax) {
      return {
        ...TEST_CONTACT,
        FirstName: pax.FirstName ?? TEST_CONTACT.FirstName,
        LastName: pax.LastName ?? TEST_CONTACT.LastName,
      }
    }
  }
  return TEST_CONTACT
}

function makeHotelCertPax(fn, ln, dob, gender = 1) {
  const pax = makePax(fn, ln, dob, gender)
  pax.IdentityNumber = null
  return pax
}

/** KPlus BookHotel — Postman/debug ile uyumlu yolcu setleri (TC kimlik gönderilmez). */
function buildHotelBookPaxVariants(roomOpts) {
  const standard = buildHotelRoomPaxes(roomOpts, makeHotelCertPax)
  const variants = [{ label: 'cert-pax', paxes: standard }]

  const hasChild = roomOpts.some((r) => Number(r.Children ?? r.children ?? 0) > 0)
  if (hasChild || roomOpts.length > 1) {
    const cert = buildHotelRoomPaxes(roomOpts, makeHotelCertPax)
    for (const room of cert) {
      const leader = room.Paxes?.find((p) => p.IsLeader)?.Pax
      const leaderLast = leader?.LastName ?? 'TRAVELER'
      let adultIdx = 0
      for (const entry of room.Paxes ?? []) {
        if (Number(entry.PaxType) === 0) {
          entry.Pax = makeHotelCertPax(
            'TEST',
            adultIdx === 0 ? 'TRAVELER' : 'GUEST',
            adultIdx === 0 ? '15.06.1990' : '15.06.1992',
          )
          adultIdx++
        } else if (Number(entry.PaxType) === 1) {
          const age = Number(entry.Pax?.Age ?? entry.Pax?.ChildAge ?? 5)
          const y = new Date().getUTCFullYear() - age
          entry.Pax = makeHotelCertPax('TIM', leaderLast, `15.06.${y}`, 1)
          entry.Pax.Age = age
          entry.Pax.ChildAge = age
        }
      }
    }
    variants.push({ label: 'cert-names', paxes: cert })
    variants.push({
      label: 'room-index-1',
      paxes: cert.map((r) => ({ ...r, RoomIndex: Number(r.RoomIndex ?? 0) + 1 })),
    })
  }

  return variants
}

/** debug-hotel-book.mjs ile birebir: TEST/TRAVELER isimleri, tek oda. */
function buildCanonicalHotelBookPaxes(roomOpts) {
  const paxes = buildHotelRoomPaxes(roomOpts, makeHotelCertPax)
  if (!paxes.length) return paxes
  const room0 = paxes[0]
  const adults = room0.Paxes?.filter((p) => Number(p.PaxType) === 0) ?? []
  if (adults[0]) adults[0].Pax = makeHotelCertPax('TEST', 'TRAVELER', '15.06.1990')
  if (adults[1]) adults[1].Pax = makeHotelCertPax('TEST', 'GUEST', '15.06.1992')
  for (const entry of room0.Paxes ?? []) {
    if (Number(entry.PaxType) === 1) {
      const age = Number(entry.Pax?.Age ?? entry.Pax?.ChildAge ?? 5)
      const y = new Date().getUTCFullYear() - age
      entry.Pax = makeHotelCertPax('TIM', 'TRAVELER', `15.06.${y}`, 1)
      entry.Pax.Age = age
      delete entry.Pax.ChildAge
    }
  }
  return paxes
}

function validatePaxModesForHotel(roomOpts) {
  const hasChild = roomOpts.some((r) => Number(r.Children ?? r.children ?? 0) > 0)
  if (hasChild) return [false, true]
  if (roomOpts.length > 1) return [false, true]
  return [false]
}

// ─── Otel senaryo çalıştırıcı ─────────────────────────────────────────────────

function buildCertTryHotelList(destId, preferredHotel, searchRows) {
  const fallbacks = destId != null ? CERT_HOTEL_FALLBACKS[destId] ?? [] : []
  const certCodes = new Set(
    TRAVELROBOT_SANDBOX_HOTELS.filter((h) => String(h.destinationId) === String(destId)).map((h) => h.code),
  )
  const otherDestCertCodes = new Set(
    TRAVELROBOT_SANDBOX_HOTELS.filter(
      (h) => h.destinationId != null && String(h.destinationId) !== String(destId),
    ).map((h) => h.code),
  )
  const certPriority = [...new Set([preferredHotel, ...fallbacks, ...certCodes].filter(Boolean))]
  const syntheticRows = certPriority.map((code) => {
    const fromSearch = searchRows.find((r) => (r.HotelCode ?? r.hotelCode) === code)
    return fromSearch ?? { HotelCode: code, HotelName: code, _certSynthetic: true }
  })
  let ranked = rankHotelRowsForPricing([...syntheticRows, ...searchRows], preferredHotel, fallbacks)
  ranked = ranked.filter((row) => !otherDestCertCodes.has(row?.HotelCode ?? row?.hotelCode))
  if (certCodes.size > 0) {
    const certOnly = ranked.filter((row) => certCodes.has(row?.HotelCode ?? row?.hotelCode))
    const nonCert = ranked.filter((row) => !certCodes.has(row?.HotelCode ?? row?.hotelCode))
    ranked = certOnly.length ? [...certOnly, ...nonCert] : ranked
  }
  const seen = new Set()
  const out = []
  for (const row of ranked) {
    const c = row?.HotelCode ?? row?.hotelCode
    if (!c || seen.has(c)) continue
    seen.add(c)
    out.push(row)
    if (out.length >= 30) break
  }
  return out
}

/** Sertifika otelleri boşsa destinasyondaki diğer otelleri dene (İstanbul S1). */
function buildDestinationWideTryList(searchRows, certCodes, limit = 25) {
  const seen = new Set()
  const out = []
  for (const row of searchRows) {
    const c = row?.HotelCode ?? row?.hotelCode ?? row?.ProductCode
    if (!c || seen.has(c)) continue
    seen.add(c)
    out.push(row)
    if (out.length >= limit) break
  }
  if (!out.length) return []
  const cert = out.filter((r) => certCodes.has(r?.HotelCode ?? r?.hotelCode))
  const other = out.filter((r) => !certCodes.has(r?.HotelCode ?? r?.hotelCode))
  return [...cert, ...other]
}

function makeTourCertPax(firstName, lastName, dob, gender = 1) {
  return makePax(firstName, lastName, dob, gender, 'TR', 'AA123456')
}

async function runTourScenario(cfg, tokenCode, scenarioName, roomOpts, searchOpts = {}) {
  section(`${scenarioName}`)

  const clientNotes = `rezervasyonyap.tr sandbox certification — ${scenarioName}`
  let searchRows = []
  try {
    const payload = await searchTours(cfg, tokenCode, {
      languageCode: searchOpts.languageCode ?? 'tr',
      startDate: searchOpts.startDate ?? addDays(7),
      endDate: searchOpts.endDate ?? addDays(400),
    })
    searchRows = pickTourRows(payload)
    log(scenarioName, 'SearchTour', '/Tour.svc/Rest/Json/SearchTour', searchOpts, payload, searchRows.length >= 0)
    if (!searchRows.length) {
      if (!payload?.HasError) {
        console.log(`  ℹ️  [${scenarioName}] SearchTour: boş katalog (sandbox)`)
        SUMMARY_LINES.push(`  ℹ️  ${scenarioName}: tur katalog boş`)
      } else {
        fail(`[${scenarioName}] SearchTour`, payload?.ErrorMessage ?? preview(payload, 400))
      }
      return
    }
    ok(`[${scenarioName}] SearchTour`, `${searchRows.length} tur`)
  } catch (e) {
    log(scenarioName, 'SearchTour', '/Tour.svc/Rest/Json/SearchTour', {}, String(e), false)
    fail(`[${scenarioName}] SearchTour`, e)
    return
  }

  const priceRooms = buildTourPriceRooms(roomOpts)
  const finalRooms = buildTourFinalPriceRooms(roomOpts)
  const tourRoomPaxes = buildTourRoomPaxes(roomOpts, makeTourCertPax)
  const tryTours = searchRows.slice(0, Math.min(searchRows.length, searchOpts.maxTours ?? 8))

  let booked = false
  let lastPriceErr = ''

  for (const tourRow of tryTours) {
    if (booked) break
    const tourCode = tourRowCode(tourRow)
    if (!tourCode && !tourRowAlternativeCode(tourRow)) continue

    let attempts = []
    try {
      attempts = await resolveTourPriceAttempts(cfg, tokenCode, tourRow, {
        languageCode: searchOpts.languageCode ?? 'tr',
      })
    } catch (e) {
      lastPriceErr = String(e)
      continue
    }
    if (!attempts.length) {
      lastPriceErr = `fiyat denemesi üretilemedi (${tourCode || '?'})`
      continue
    }

    attemptLoop:
    for (const attempt of attempts.slice(0, 12)) {
      if (booked) break

      const dateOffsets = attempt.departureDate ? [null] : TOUR_CERT_DATE_OFFSETS
      for (const offset of dateOffsets) {
        if (booked) break
        const departureDate = offset == null ? attempt.departureDate : addDays(offset)
        const variants = buildTourPriceRequestVariants(
          attempt,
          departureDate,
          priceRooms,
          searchOpts.languageCode ?? 'tr',
        )

        for (const variant of variants) {
          if (booked) break
          let pricePayload = null
          let priceRows = []
          try {
            pricePayload = await getTourPrices(cfg, tokenCode, variant)
            priceRows = pickTourPriceRows(pricePayload)
            log(
              scenarioName,
              'GetTourPrices',
              '/Tour.svc/Rest/Json/GetTourPrices',
              { tourCode, attempt: attempt.source, variant, departureDate },
              pricePayload,
              priceRows.length >= 0,
            )
          } catch (e) {
            lastPriceErr = String(e)
            continue
          }

          if (!priceRows.length) {
            lastPriceErr = pricePayload?.ErrorMessage ?? 'fiyat satırı yok'
            continue
          }

          ok(
            `[${scenarioName}] GetTourPrices`,
            `${tourCode} — ${departureDate} — ${priceRows.length} satır (${attempt.source})`,
          )

          for (const priceRow of priceRows.slice(0, 4)) {
            if (booked) break
            const packageId =
              pickTourPackageId(priceRow) ??
              attempt.packageId ??
              variant.id ??
              variant.tourAlternativeCode ??
              tourCode
            if (!packageId) continue

            let finalPayload = null
            try {
              finalPayload = await getTourFinalPrice(cfg, tokenCode, {
                packageId,
                tourRooms: finalRooms,
              })
              log(
                scenarioName,
                'GetTourFinalPrice',
                '/Tour.svc/Rest/Json/GetTourFinalPrice',
                { packageId, departureDate },
                finalPayload,
                !finalPayload?.HasError,
              )
            } catch (e) {
              lastPriceErr = String(e)
              continue
            }
            if (finalPayload?.HasError) {
              lastPriceErr = finalPayload?.ErrorMessage ?? 'GetTourFinalPrice hata'
              continue
            }

            const resultKeys = pickTourBookResultKeys(finalPayload, priceRow)
            if (!resultKeys.length) {
              lastPriceErr = 'ResultKeys alınamadı'
              continue
            }
            ok(
              `[${scenarioName}] GetTourFinalPrice`,
              `${tourCode} — ${departureDate} — ${resultKeys.length} key`,
            )

            if (SKIP_BOOKING) {
              console.log(`  ℹ️  BookTour adımı atlandı (--with-booking flag'i ile etkinleştir)`)
              return
            }

            let paymentInfo = TOUR_TEST_PAYMENT
            try {
              const payPayload = await getTourPaymentOptions(cfg, tokenCode, { packageId })
              log(
                scenarioName,
                'GetPaymentOptions',
                '/Tour.svc/Rest/Json/GetPaymentOptions',
                { packageId },
                payPayload,
                !payPayload?.HasError,
              )
              const items = payPayload?.Result?.PaymentOptions ?? payPayload?.Result ?? []
              const first = Array.isArray(items) ? items[0] : null
              if (first?.PaymentItemId != null) {
                paymentInfo = {
                  ...TOUR_TEST_PAYMENT,
                  PaymentItemId: String(first.PaymentItemId),
                  PaymentType: first.PaymentType != null ? Number(first.PaymentType) : TOUR_TEST_PAYMENT.PaymentType,
                }
              }
            } catch {
              /* varsayılan ödeme */
            }

            try {
              const bookPayload = await bookTour(cfg, {
                tokenCode,
                resultKeys,
                tourRoomPaxes,
                contactInfo: TEST_CONTACT,
                invoiceInfo: TEST_INVOICE,
                paymentInfo,
                bookingNote: clientNotes,
                agentReferenceInfo: `RY-${Date.now()}-tour`,
                languageCode: searchOpts.languageCode ?? 'tr',
              })
              log(scenarioName, 'BookTour', '/Tour.svc/Rest/Json/BookTour',
                { resultKeys, tourCode, departureDate }, bookPayload, !bookPayload?.HasError)

              if (bookPayload?.HasError) {
                lastPriceErr = bookPayload?.ErrorMessage ?? 'BookTour hata'
                if (!/invalid|availability|passenger|balance|yetersiz/i.test(lastPriceErr)) break attemptLoop
                continue
              }

              const booking = bookPayload?.Result?.Booking ?? bookPayload?.Result?.booking ?? bookPayload?.Result ?? {}
              const systemPnr =
                booking?.SystemPnr ??
                booking?.systemPnr ??
                bookPayload?.Result?.SystemPnr ??
                bookPayload?.SystemPnr ??
                null
              ok(`[${scenarioName}] BookTour`, `SystemPNR: ${systemPnr ?? '(yok)'}`)

              let verifiedSystemPnr = null
              let pnrVerified = null
              if (systemPnr) {
                try {
                  const verifyPayload = await getTourBooking(cfg, tokenCode, {
                    systemPnr,
                    lastName: TEST_CONTACT.LastName,
                  })
                  verifiedSystemPnr =
                    verifyPayload?.Result?.Booking?.SystemPnr ??
                    verifyPayload?.Result?.SystemPnr ??
                    null
                  pnrVerified =
                    verifiedSystemPnr != null &&
                    String(verifiedSystemPnr).trim().toUpperCase() === String(systemPnr).trim().toUpperCase()
                  log(
                    scenarioName,
                    'GetTourBooking',
                    '/Tour.svc/Rest/Json/GetBooking',
                    { systemPnr, lastName: TEST_CONTACT.LastName },
                    verifyPayload,
                    pnrVerified === true,
                  )
                  if (pnrVerified) {
                    ok(`[${scenarioName}] PNR doğrulama`, `GetTourBooking eşleşti: ${verifiedSystemPnr}`)
                  }
                } catch (e) {
                  log(scenarioName, 'GetTourBooking', '/Tour.svc/Rest/Json/GetBooking', { systemPnr }, String(e), false)
                }
              }

              TOUR_CERT_RESULTS.push({
                scenario: scenarioName,
                systemPnr,
                tourCode: tourCode || attempt.tourAlternativeCode || variant.tourAlternativeCode,
                departureDate,
                resultKeys,
                pnrVerified,
                verifiedSystemPnr,
                clientNotes,
              })
              booked = true
              break attemptLoop
            } catch (e) {
              lastPriceErr = String(e)
              continue
            }
          }
        }
      }
    }
  }

  if (!booked && !SKIP_BOOKING) {
    fail(`[${scenarioName}] BookTour`, lastPriceErr || 'Uygun tur/fiyat bulunamadı')
  }
}

async function runHotelScenario(cfg, tokenCode, scenarioName, hotelOpts, roomOpts) {
  section(`${scenarioName}`)

  const destId = hotelOpts.destinationId
  const preferredHotel = destId != null ? CERT_HOTEL_BY_DESTINATION[destId] : null

  let packageId = null
  let foundHotelCode = null
  let hotelSearchKey = null
  let selectedRow = null
  let searchPayload = null
  let roomOfferKeys = []
  let roomPricesPayload = null
  let triedHotels = 0
  let triedCodes = []
  let winningCheckin = null
  let winningCheckout = null

  const dateOffsets = hotelOpts.dateOffsets ?? HOTEL_CERT_DATE_OFFSETS
  const stayNightsList = hotelOpts.stayNights ?? [7]
  const preferDestinationSearch = Boolean(hotelOpts.preferDestinationSearch)
  const certCodesForDest = new Set(
    TRAVELROBOT_SANDBOX_HOTELS.filter((h) => String(h.destinationId) === String(destId)).map((h) => h.code),
  )

  for (const startOffset of dateOffsets) {
    if (roomOfferKeys.length) break

    for (const stayNights of stayNightsList) {
      if (roomOfferKeys.length) break

    const checkin = addDays(startOffset)
    const checkout = addDays(startOffset + stayNights)
    const baseSearch = {
      checkInDate: checkin,
      checkOutDate: checkout,
      ...hotelOpts,
      rooms: roomOpts,
    }
    delete baseSearch.dateOffsets
    delete baseSearch.stayNights
    delete baseSearch.preferDestinationSearch

    let searchRows = []
    try {
      let payload = null
      let rows = []
      let searchMode = 'destination'

      let destPayload = null
      let destRows = []
      try {
        destPayload = await searchHotel(cfg, tokenCode, baseSearch)
        destRows = pickHotelRows(destPayload)
      } catch {
        /* destination araması opsiyonel */
      }

      if (preferDestinationSearch && destRows.length) {
        payload = destPayload
        rows = destRows
        searchMode = 'destination-first'
      } else if (preferredHotel) {
        payload = await searchHotel(cfg, tokenCode, {
          ...baseSearch,
          destinationId: destId,
          hotelCode: preferredHotel,
          showMultipleRate: true,
        })
        rows = pickHotelRows(payload)
        if (rows.length) searchMode = 'hotelCode-primary'
      }

      if (!rows.length && destRows.length) {
        payload = destPayload
        rows = destRows
        searchMode = 'destination'
      } else if (destRows.length > rows.length) {
        payload = destPayload
        rows = destRows
        searchMode = 'destination-wide'
      }

      if (!rows.length && preferredHotel) {
        payload = await searchHotel(cfg, tokenCode, {
          ...baseSearch,
          destinationId: undefined,
          hotelCode: preferredHotel,
          showMultipleRate: true,
        })
        rows = pickHotelRows(payload)
        searchMode = 'hotelCode-fallback'
      }

      searchPayload = payload
      searchRows = rows
      log(scenarioName, 'SearchHotel', '/Hotel.svc/Rest/Json/SearchHotel',
        {
          checkin,
          checkout,
          searchMode,
          preferredHotel,
          dateOffset: startOffset,
          stayNights,
        },
        payload,
        rows.length >= 0,
      )

      if (rows.length > 0) {
        ok(
          `[${scenarioName}] SearchHotel`,
          `${rows.length} otel (${checkin} → ${checkout}, ${stayNights} gece, ${searchMode})`,
        )
      } else {
        log(scenarioName, 'SearchHotel', '/Hotel.svc/Rest/Json/SearchHotel',
          { dateOffset: startOffset, stayNights }, 'Sonuç yok — sonraki tarih denenecek', false)
        continue
      }
    } catch (e) {
      log(scenarioName, 'SearchHotel', '/Hotel.svc/Rest/Json/SearchHotel',
        { dateOffset: startOffset, stayNights }, String(e), false)
      continue
    }

    let tryHotels = buildCertTryHotelList(destId, preferredHotel, searchRows)
    if (preferDestinationSearch && searchRows.length > tryHotels.length) {
      const wide = buildDestinationWideTryList(searchRows, certCodesForDest, 25)
      if (wide.length > tryHotels.length) tryHotels = wide
    }
    triedHotels = 0
    triedCodes = []

    for (const row of tryHotels) {
      const code = row?.HotelCode ?? row?.hotelCode ?? row?.ProductCode ?? null
      if (!code) continue
      triedHotels++
      triedCodes.push(code)
      let sk = pickHotelSearchKey(searchPayload, row)
      if (!sk && row?._certSynthetic) {
        try {
          const hSearch = await searchHotel(cfg, tokenCode, {
            ...baseSearch,
            destinationId: destId,
            hotelCode: code,
            showMultipleRate: true,
          })
          sk = pickHotelSearchKey(hSearch, { HotelCode: code })
          if (sk) searchPayload = hSearch
        } catch {
          /* fall through */
        }
      }
      if (!sk) continue
      try {
        let payload = null
        let keys = []
        const inlineHotel = hotelPayloadShapeFromRow(row)
        const inlineRooms = inlineHotel.Rooms
        if (Array.isArray(inlineRooms) && inlineRooms.length) {
          keys = pickHotelRoomOfferKeys(
            { Result: { Hotels: [inlineHotel] } },
            roomOpts.length,
            roomOpts,
          )
        }
        if (!keys.length) {
          payload = await getHotelRooms(cfg, tokenCode, {
            productCode: code,
            hotelCode: code,
            searchKey: sk,
            checkInDate: checkin,
            checkOutDate: checkout,
            rooms: roomOpts,
          })
          log(scenarioName, 'GetHotelRoomPrices', '/Hotel.svc/Rest/Json/GetHotelRoomPrices',
            { hotelCode: code, try: triedHotels, dateOffset: startOffset }, payload, !payload?.HasError)
          if (payload?.HasError) continue
          keys = pickHotelRoomOfferKeys(payload, roomOpts.length, roomOpts)
        } else {
          log(scenarioName, 'GetHotelRoomPrices', '/Hotel.svc/Rest/Json/GetHotelRoomPrices',
            { hotelCode: code, try: triedHotels, dateOffset: startOffset, source: 'search-inline' },
            { inlineKeys: keys.length }, true)
        }
        if (!keys.length) continue
        foundHotelCode = code
        selectedRow = row
        hotelSearchKey = pickHotelSearchKey(payload) ?? sk
        roomPricesPayload = payload ?? { Result: { Hotels: [inlineHotel] } }
        roomOfferKeys = keys
        packageId = row?.PackageId ?? row?.packageId ?? null
        winningCheckin = checkin
        winningCheckout = checkout
        ok(
          `[${scenarioName}] İlk otel (oda teklifi)`,
          `${code} — ${row?.HotelName ?? row?.Name ?? '?'} (${triedHotels}. deneme, ${checkin}→${checkout})`,
        )
        break
      } catch {
        continue
      }
    }
    }
  }

  if (!roomOfferKeys.length) {
    fail(
      `[${scenarioName}] GetHotelRoomPrices`,
      `${triedHotels} otelde oda teklifi yok — denenen: ${triedCodes.slice(0, 12).join(', ')}${triedCodes.length > 12 ? '…' : ''} (tarih offset: ${dateOffsets.join(',')} gün; konaklama: ${stayNightsList.join('/')} gece)`,
    )
    return
  }

  try {
    const payload = await getHotelDetails(cfg, tokenCode, foundHotelCode, { languageCode: 'tr' })
    log(scenarioName, 'GetHotelDetails', '/Hotel.svc/Rest/Json/GetHotelDetails',
      { hotelCode: foundHotelCode }, payload, !payload?.HasError)
    if (!payload?.HasError) {
      ok(`[${scenarioName}] GetHotelDetails`, payload?.Result?.HotelName ?? foundHotelCode)
    } else {
      fail(`[${scenarioName}] GetHotelDetails`, payload?.ErrorMessage ?? 'Hata')
    }
  } catch (e) {
    log(scenarioName, 'GetHotelDetails', '/Hotel.svc/Rest/Json/GetHotelDetails', { hotelCode: foundHotelCode }, String(e), false)
    fail(`[${scenarioName}] GetHotelDetails`, e)
  }

  ok(`[${scenarioName}] GetHotelRoomPrices`, `${roomOfferKeys.length} oda teklifi (Key)`)

  // Adım 4: ValidateHotelRoomsV2 — RoomCode (result key); tek odada alternatif dene
  const candidates = pickHotelRoomOfferKeyCandidates(roomPricesPayload, roomOpts)
  let validated = false
  let lastValErr = ''
  let validatePayload = null
  let validatedKeys = []

  const attemptValidate = async (keys, attemptLabel, includePaxes) => {
    const validateRooms = buildHotelValidateRooms(roomOpts, keys, { includePaxes })
    const payload = await getHotelFinalPrice(cfg, tokenCode, { rooms: validateRooms })
    log(scenarioName, 'ValidateHotelRoomsV2', '/Hotel.svc/Rest/Json/ValidateHotelRoomsV2',
      { attempt: attemptLabel, includePaxes, roomCount: validateRooms.length },
      payload, !payload?.HasError)
    return payload
  }

  const isRetriableValidateErr = (msg) =>
    /invalid result key|availability not found/i.test(String(msg))
  const isRetriableBookErr = (msg) =>
    /passenger count|passenger type|invalid first name|invalid key|incompatible|invalid data|geçersiz json|http 500|soap fault/i.test(
      String(msg),
    )
  const isDefinitiveBookErr = (msg) =>
    /balance is not enough|insufficient balance|yetersiz bakiye/i.test(String(msg))

  const validateAttempts = []
  const seenValidateSets = new Set()
  const pushValidateSet = (keys) => {
    if (!Array.isArray(keys) || !keys.length) return
    const k = JSON.stringify(keys)
    if (seenValidateSets.has(k)) return
    seenValidateSets.add(k)
    validateAttempts.push(keys)
  }

  if (roomOpts.length > 1) {
    const comboSets = pickHotelRoomCombinationSets(roomPricesPayload, roomOpts)
    for (const set of comboSets.slice(0, 10)) pushValidateSet(set)
    if (candidates.length >= roomOpts.length) {
      pushValidateSet(candidates.slice(0, roomOpts.length))
    }
    pushValidateSet(roomOfferKeys)
  } else {
    for (const k of [...new Set([...roomOfferKeys, ...candidates])].slice(0, 12)) {
      pushValidateSet([k])
    }
  }

  const clientNotes = `rezervasyonyap.tr sandbox certification — ${scenarioName}`
  let booked = false
  let lastBookErr = ''

  const paxModes = validatePaxModesForHotel(roomOpts)

  for (let ai = 0; ai < validateAttempts.length; ai++) {
    const keys = validateAttempts[ai]
    for (let pi = 0; pi < paxModes.length; pi++) {
      const includePaxes = paxModes[pi]
      let payload
      try {
        payload = await attemptValidate(keys, `${ai + 1}-${includePaxes ? 'pax' : 'key'}`, includePaxes)
      } catch (e) {
        lastValErr = String(e)
        if (!isRetriableValidateErr(lastValErr)) break
        continue
      }
      if (payload?.HasError) {
        lastValErr = payload?.ErrorMessage ?? 'Hata'
        if (!isRetriableValidateErr(lastValErr)) break
        continue
      }

      validated = true
      validatePayload = payload
      validatedKeys = keys
      ok(`[${scenarioName}] ValidateHotelRoomsV2`, preview(payload?.Result ?? payload, 120))

      if (SKIP_BOOKING) {
        console.log(`  ℹ️  BookHotel adımı atlandı (--with-booking flag'i ile etkinleştir)`)
        return
      }

      const primaryKeys = pickHotelBookResultKeys(validatePayload, validatedKeys)
      if (!primaryKeys.length) {
        lastBookErr = 'ResultKeys alınamadı (validate yanıtı)'
        continue
      }

      const agentReference = `RY-${Date.now()}-${foundHotelCode ?? 'hotel'}`
      const bookPaxes = buildCanonicalHotelBookPaxes(roomOpts)
      const paymentAttempts = await resolveHotelPaymentAttempts(cfg, tokenCode, primaryKeys)
      const paymentPool = [...paymentAttempts]
      if (!paymentPool.some((p) => String(p.info?.PaymentType) === '0')) {
        paymentPool.push({ label: 'card-0', info: { ...TEST_PAYMENT } })
      }
      const bookAttempts = paymentPool.slice(0, 5).map((pay) => ({
        label: `stoplight-${pay.label}`,
        resultKeys: primaryKeys,
        hotelRoomPaxes: bookPaxes,
        paymentInfo: pay.info,
        contactInfo: TEST_CONTACT,
      }))

      outerBook:
      for (const attempt of bookAttempts) {
        const bookRequestBody = buildHotelBookRequest({
          tokenCode,
          resultKeys: attempt.resultKeys,
          hotelRoomPaxes: attempt.hotelRoomPaxes,
          contactInfo: attempt.contactInfo,
          invoiceInfo: TEST_INVOICE,
          paymentInfo: attempt.paymentInfo,
        })
        const bookRequest = {
          attempt: attempt.label,
          body: bookRequestBody,
          hotelCode: foundHotelCode,
          validateAttempt: `${ai + 1}-${includePaxes ? 'pax' : 'key'}`,
        }

        try {
          const bookPayload = await bookHotel(cfg, {
            tokenCode,
            resultKeys: attempt.resultKeys,
            hotelRoomPaxes: attempt.hotelRoomPaxes,
            contactInfo: attempt.contactInfo,
            invoiceInfo: TEST_INVOICE,
            paymentInfo: attempt.paymentInfo,
          })
          log(scenarioName, 'BookHotel', '/Hotel.svc/Rest/Json/BookHotel', bookRequest, bookPayload, !bookPayload?.HasError)
          if (!bookPayload?.HasError) {
            const booking = bookPayload?.Result?.Booking ?? bookPayload?.Result?.booking ?? null
            const systemPnr =
              booking?.SystemPnr ??
              booking?.systemPnr ??
              bookPayload?.Result?.SystemPnr ??
              bookPayload?.Result?.systemPnr ??
              bookPayload?.SystemPnr ??
              bookPayload?.systemPnr ??
              null
            ok(`[${scenarioName}] BookHotel`, `SystemPNR: ${systemPnr ?? '(yok)'}`)

            let verifiedSystemPnr = null
            let pnrVerified = null
            if (systemPnr) {
              try {
                const verifyPayload = await getHotelBooking(cfg, tokenCode, {
                  systemPnr,
                  lastName: TEST_CONTACT.LastName,
                })
                verifiedSystemPnr =
                  verifyPayload?.Result?.Booking?.SystemPnr ??
                  verifyPayload?.Result?.SystemPnr ??
                  verifyPayload?.Result?.systemPnr ??
                  null
                pnrVerified =
                  verifiedSystemPnr != null &&
                  String(verifiedSystemPnr).trim().toUpperCase() ===
                    String(systemPnr).trim().toUpperCase()
                log(
                  scenarioName,
                  'GetHotelBooking',
                  '/Hotel.svc/Rest/Json/GetHotelBooking',
                  { systemPnr, lastName: TEST_CONTACT.LastName },
                  verifyPayload,
                  pnrVerified === true,
                )
                if (pnrVerified) {
                  ok(`[${scenarioName}] PNR doğrulama`, `GetHotelBooking SystemPNR eşleşti: ${verifiedSystemPnr}`)
                } else {
                  fail(
                    `[${scenarioName}] PNR doğrulama`,
                    verifiedSystemPnr
                      ? `BookHotel=${systemPnr} ≠ GetHotelBooking=${verifiedSystemPnr}`
                      : 'GetHotelBooking yanıtında SystemPNR yok',
                  )
                }
              } catch (e) {
                log(
                  scenarioName,
                  'GetHotelBooking',
                  '/Hotel.svc/Rest/Json/GetHotelBooking',
                  { systemPnr },
                  String(e),
                  false,
                )
                fail(`[${scenarioName}] PNR doğrulama`, String(e))
              }
            }

            HOTEL_CERT_RESULTS.push({
              scenario: scenarioName,
              hotelCode: foundHotelCode,
              resultKeys: attempt.resultKeys ?? [attempt.packageId],
              systemPnr,
              verifiedSystemPnr,
              pnrVerified,
              clientNotes,
              agentReference,
            })
            booked = true
            break outerBook
          }
          lastBookErr = bookPayload?.ErrorMessage ?? preview(bookPayload, 300)
          log(scenarioName, 'BookHotel', '/Hotel.svc/Rest/Json/BookHotel', bookRequest, bookPayload, false)
          if (/balance is not enough|insufficient balance|yetersiz bakiye/i.test(lastBookErr)) continue
          if (isDefinitiveBookErr(lastBookErr) || !isRetriableBookErr(lastBookErr)) break outerBook
        } catch (e) {
          lastBookErr = String(e)
          log(scenarioName, 'BookHotel', '/Hotel.svc/Rest/Json/BookHotel', bookRequest, lastBookErr, false)
          if (/balance is not enough|insufficient balance|yetersiz bakiye/i.test(lastBookErr)) continue
          if (isDefinitiveBookErr(lastBookErr) || !isRetriableBookErr(lastBookErr)) break outerBook
        }
      }
      if (booked) break
      if (isDefinitiveBookErr(lastBookErr) && !/balance is not enough|insufficient balance|yetersiz bakiye/i.test(lastBookErr)) break
    }
    if (booked) break
    if (isDefinitiveBookErr(lastBookErr) && !/balance is not enough|insufficient balance|yetersiz bakiye/i.test(lastBookErr)) break
  }

  if (!validated && lastValErr) {
    fail(`[${scenarioName}] ValidateHotelRoomsV2`, lastValErr)
    return
  }
  if (!validated) return

  if (!SKIP_BOOKING && !booked) {
    fail(`[${scenarioName}] BookHotel`, lastBookErr || 'Tüm oda adayları denendi')
  }
}

// ─── Ana akış ─────────────────────────────────────────────────────────────────

async function main() {
  console.log('╔══════════════════════════════════════════════════════════════╗')
  console.log('║   Travelrobot / KPlus Sandbox — TAM SERTİFİKASYON TESTİ    ║')
  console.log('╚══════════════════════════════════════════════════════════════╝')
  if (SKIP_BOOKING) {
    console.log('\n  ℹ️  Mod: Search+Validate (--with-booking ile BookHotel/CreateReservation dahil)')
  } else {
    console.log('\n  ⚡ Mod: Tam akış (booking + System PNR dahil)')
  }
  if (ONLY) console.log(`  📌 Filtre: --only ${ONLY}`)

  loadBackendEnvFile()

  // Config yükle
  let cfg
  if (USE_SANDBOX) {
    console.log('\n[config] Sandbox test kanalı (KPlus sertifikasyon)…')
    cfg = await buildSandboxConfigAsync(getArg)
    console.log(`[config] Kanal: ${cfg.channelCode}  base: ${cfg.baseUrl}`)
  } else if (FROM_DB) {
    console.log('\n[config] DB\'den yükleniyor…')
    cfg = await loadTravelrobotConfig()
    if (CREDS.baseUrl || CREDS.channelCode || CREDS.channelPassword) {
      cfg = {
        ...cfg,
        ...(CREDS.baseUrl ? { baseUrl: CREDS.baseUrl.replace(/\/$/, '') } : {}),
        ...(CREDS.channelCode ? { channelCode: CREDS.channelCode } : {}),
        ...(CREDS.channelPassword ? { channelPassword: CREDS.channelPassword } : {}),
      }
    }
  } else {
    if (!CREDS.baseUrl || !CREDS.channelCode || !CREDS.channelPassword) {
      console.error(
        '\n[hata] Credentials eksik. Kullanım:\n' +
        '  --sandbox  (TRAVELROBOT_SANDBOX_CHANNEL_* env)\n' +
        '  --base-url "http://sandbox.kplus.com.tr/kplus/v0" \\\n' +
        '  --channel-code <code> --channel-password <pass>\n' +
        '  ya da --from-db',
      )
      process.exit(1)
    }
    cfg = { ...CREDS, enabled: true }
  }

  if (!USE_SANDBOX && SKIP_BOOKING === false && !isSandboxBaseUrl(cfg.baseUrl)) {
    console.warn(
      '\n⚠️  UYARI: --with-booking canlı API ile çalışıyor. Sertifikasyon için --sandbox kullanın.\n',
    )
  }

  // /v0 eksikse uyar
  if (!cfg.baseUrl.includes('/v0')) {
    console.warn(
      `\n⚠️  UYARI: baseUrl '${cfg.baseUrl}' içinde '/v0' yok.\n` +
      `   Beklenen format: http://sandbox.kplus.com.tr/kplus/v0\n`,
    )
  }

  console.log(`\n[config] Script sürüm: ${TRAVELROBOT_TEST_SCRIPT_VERSION}`)
  console.log(`[config] Base URL   : ${cfg.baseUrl}`)
  console.log(`[config] ChannelCode: ${cfg.channelCode}`)
  console.log(`[config] Password   : ${'*'.repeat(Math.min(cfg.channelPassword?.length ?? 0, 16))}`)

  // ── Token ─────────────────────────────────────────────────────────────────
  section('S0 — CreateToken (Kimlik Doğrulama)')
  let tokenCode = null
  try {
    const result = await createTravelrobotToken(cfg)
    tokenCode = result.tokenCode
    log('S0-CreateToken', 'CreateTokenV2', '/General.svc/Rest/Json/CreateTokenV2',
      { channelCredential: { ChannelCode: cfg.channelCode, ChannelPassword: '****' } },
      result.raw, true)
    ok('CreateToken', `TokenCode uzunluğu: ${tokenCode.length} karakter`)
  } catch (e) {
    log('S0-CreateToken', 'CreateTokenV2', '/General.svc/Rest/Json/CreateTokenV2', {}, String(e), false)
    fail('CreateToken', e)
    saveLogs()
    const isProdUrl = /api\.kplus\.com\.tr/i.test(cfg.baseUrl)
    const isSandboxCreds = /^Test_/i.test(cfg.channelCode ?? '')
    console.log('\n⚠️  Token alınamadı — tüm senaryolar çalıştırılamaz.')
    if (isProdUrl && isSandboxCreds) {
      console.log('   Sandbox kanalı (Test_*) canlı URL ile çalışmaz. Sandbox için:')
      console.log('   --base-url "http://sandbox.kplus.com.tr/kplus/v0"')
      console.log('   Canlı API için KPlus\'tan üretim ChannelCode + IP whitelist gerekir.')
    } else {
      console.log('   Olası nedenler: IP whitelist, yanlış şifre, ağ/DNS. Sunucuda deneyin:')
    }
    console.log('')
    console.log(`   node scripts/test-travelrobot-scenarios.mjs \\`)
    console.log(`     --base-url "${cfg.baseUrl}" \\`)
    console.log(`     --channel-code "${cfg.channelCode}" \\`)
    console.log(`     --channel-password "***"`)
    printSummary()
    return
  }

  // CreateToken ile alınan token — RefreshToken öncesi General uçları bununla çalışır
  const tokenAfterCreate = tokenCode

  if (RUN_GENERAL) {
  // ── General API: GetCurrencies (RefreshToken ÖNCESİ) ─────────────────────
  section('S0c — GetCurrencies (Para Birimleri)')
  try {
    const payload = await getCurrencies(cfg, tokenAfterCreate)
    log('S0c-GetCurrencies', 'GetCurrencies', '/General.svc/Rest/Json/GetCurrencies', {}, payload, !payload?.HasError)
    const list = payload?.Result ?? payload?.Currencies ?? []
    if (!payload?.HasError) {
      ok('GetCurrencies', `${Array.isArray(list) ? list.length : '?'} para birimi`)
    } else {
      fail('GetCurrencies', payload?.ErrorMessage ?? 'Hata')
    }
  } catch (e) {
    log('S0c-GetCurrencies', 'GetCurrencies', '/General.svc/Rest/Json/GetCurrencies', {}, String(e), false)
    fail('GetCurrencies', e)
  }

  // ── General API: GetCountries (RefreshToken ÖNCESİ) ───────────────────────
  section('S0d — GetCountries (Ülkeler — General API)')
  try {
    const payload = await getCountries(cfg, tokenAfterCreate, { culture: 'en' })
    log('S0d-GetCountries', 'GetCountries', '/General.svc/Rest/Json/GetCountries', {}, payload, !payload?.HasError)
    const list = payload?.Result ?? payload?.Countries ?? []
    if (!payload?.HasError) {
      ok('GetCountries', `${Array.isArray(list) ? list.length : '?'} ülke`)
    } else {
      fail('GetCountries', payload?.ErrorMessage ?? 'Hata')
    }
  } catch (e) {
    log('S0d-GetCountries', 'GetCountries', '/General.svc/Rest/Json/GetCountries', {}, String(e), false)
    fail('GetCountries', e)
  }

  // ── General API: RefreshToken ─────────────────────────────────────────────
  section('S0b — RefreshToken (Token Yenileme)')
  try {
    const result = await refreshToken(cfg, { tokenCode: tokenAfterCreate })
    log('S0b-RefreshToken', 'RefreshToken', '/General.svc/Rest/Json/RefreshToken',
      { tokenCode: '(current)' }, result.raw, true)
    ok('RefreshToken', `Yeni TokenCode uzunluğu: ${result.tokenCode.length} karakter`)
    tokenCode = result.tokenCode
  } catch (e) {
    log('S0b-RefreshToken', 'RefreshToken', '/General.svc/Rest/Json/RefreshToken', {}, String(e), false)
    fail('RefreshToken', e)
  }
  }

  if (RUN_TOURS) {
  // ═══════════════════════════════════════════════════════════════════════════
  // TUR SENARYOLARI — SearchTour → GetTourPrices → GetTourFinalPrice → BookTour
  // ═══════════════════════════════════════════════════════════════════════════

  if (SKIP_BOOKING) {
    section('S1 — SearchTour (Tur Katalog)')
    try {
      const payload = await searchTours(cfg, tokenCode, {
        languageCode: 'tr',
        startDate: addDays(7),
        endDate: addDays(400),
      })
      const rows = pickTourRows(payload)
      log('S1-SearchTour', 'SearchTour', '/Tour.svc/Rest/Json/SearchTour',
        { languageCode: 'tr' }, payload, rows.length >= 0)
      if (rows.length > 0) {
        ok('SearchTour', `${rows.length} tur`)
        const f = rows[0]
        const tour = f?.Tour ?? f?.tour ?? f
        ok('İlk tur', `${tour?.TourCode ?? tour?.Code ?? '?'} — ${tour?.Name ?? tour?.TourName ?? '?'}`)
      } else if (!payload?.HasError) {
        console.log(`  ℹ️  SearchTour: HasError=false ama liste boş (sandbox katalog sınırlı) — ${preview(payload, 200)}`)
        SUMMARY_LINES.push('  ℹ️  SearchTour: boş katalog (sandbox)')
      } else {
        fail('SearchTour', payload?.ErrorMessage ?? preview(payload, 400))
      }
    } catch (e) {
      log('S1-SearchTour', 'SearchTour', '/Tour.svc/Rest/Json/SearchTour', {}, String(e), false)
      fail('SearchTour', e)
    }
  } else {
    await runTourScenario(
      cfg,
      tokenCode,
      'Tour-S1: 2 ADT / tek oda',
      [{ RoomIndex: 0, Adults: 2, Children: 0, ChildAges: null }],
    )

    if (!ONLY_TOUR_S1) {
      await runTourScenario(
        cfg,
        tokenCode,
        'Tour-S2: 2 ADT + 1 CHD(5) / tek oda',
        [{ RoomIndex: 0, Adults: 2, Children: 1, ChildAges: [5] }],
      )

      await runTourScenario(
        cfg,
        tokenCode,
        'Tour-S3: 2 ADT + 1 CHD(8) / tek oda',
        [{ RoomIndex: 0, Adults: 2, Children: 1, ChildAges: [8] }],
      )
    }
  }
  }

  if (RUN_HOTELS) {
  // ═══════════════════════════════════════════════════════════════════════════
  // OTEL SENARYOLARI (Hotel API Test Cases PDF — Search + Book + System PNR)
  // ═══════════════════════════════════════════════════════════════════════════

  // Hotel Senaryo 1: 1 ROOM – 2 ADT – ISTANBUL
  await runHotelScenario(
    cfg, tokenCode,
    'Hotel-S1: 1 Oda / 2 ADT / İstanbul (destinationId=10033097)',
    {
      destinationId: 10033097,
      languageCode: 'tr',
      preferDestinationSearch: true,
      dateOffsets: HOTEL_S1_DATE_OFFSETS,
      stayNights: HOTEL_S1_STAY_NIGHTS,
    },
    [{ RoomIndex: 0, Adults: 2, Children: 0, ChildAges: null }],
  )

  if (!ONLY_HOTEL_S1) {
    // Hotel Senaryo 2: 1 Oda, 2 Yetişkin + 1 Çocuk (5 yaş), Prague sandbox
    await runHotelScenario(
      cfg, tokenCode,
      'Hotel-S2: 1 Oda / 2 ADT + 1 CHD(5) / Prague (destinationId=531096)',
      { destinationId: 531096, languageCode: 'tr' },
      [{ RoomIndex: 0, Adults: 2, Children: 1, ChildAges: [5] }],
    )

    // Hotel Senaryo 3: 2 Oda, 3 Yetişkin + 2 Çocuk (2 ve 4 yaş), Berlin
    await runHotelScenario(
      cfg, tokenCode,
      'Hotel-S3: 2 Oda / Oda1:2ADT+1CHD(2) + Oda2:1ADT+1CHD(4) / Berlin (destinationId=587926)',
      { destinationId: 587926, languageCode: 'tr' },
      [
        { RoomIndex: 0, Adults: 2, Children: 1, ChildAges: [2] },
        { RoomIndex: 1, Adults: 1, Children: 1, ChildAges: [4] },
      ],
    )
  }
  }

  if (RUN_FLIGHTS) {
  // ═══════════════════════════════════════════════════════════════════════════
  // UÇUŞ SENARYOLARI (Air API Test Cases belgesinden — 11 senaryo)
  // ═══════════════════════════════════════════════════════════════════════════

  if (!ONLY_AIR_S2 && !ONLY_AIR_LCC) {
  // Air Senaryo 1: Oneway, 1 ADT, IST → LHR
  await runFlightScenario(cfg, tokenCode, 'Air-S1: Oneway / 1ADT / IST→LHR', {
    legs: [{ originCode: 'IST', destinationCode: 'LHR', departureDate: addDays(30) }],
    flightType: 0, resultType: 0, adults: 1, languageCode: 'tr',
  })
  }

  if (!ONLY_AIR_LCC) {
  // Air Senaryo 2: Oneway, 2 ADT + 1 CHD + 1 INF, IST → LHR
  await runFlightScenario(cfg, tokenCode, 'Air-S2: Oneway / 2ADT+1CHD+1INF / IST→LHR', {
    legs: [{ originCode: 'IST', destinationCode: 'LHR', departureDate: addDays(30) }],
    flightType: 0, resultType: 0, adults: 2, children: 1, infants: 1, childAges: [5], languageCode: 'tr',
  })
  }

  if (ONLY_AIR_S2) {
    /* --only air-s2 */
  } else if (ONLY_AIR_LCC) {
  // Air Senaryo 9–11: LCC (sandbox onaylı TEST/TRAVELER isimleri)
  await runFlightScenario(cfg, tokenCode, 'Air-S9: Oneway-LCC / 2ADT+1CHD+1INF / AYT→TZX', {
    legs: [{ originCode: 'AYT', destinationCode: 'TZX', departureDate: addDays(30) }],
    flightType: 0, resultType: 0, adults: 2, children: 1, infants: 1, childAges: [5], useCertNames: true, useTcKimlik: true, languageCode: 'tr',
  })
  await runFlightScenario(cfg, tokenCode, 'Air-S10: Roundtrip-LCC / 2ADT+1CHD+1INF / AYT→TZX', {
    legs: [
      { originCode: 'AYT', destinationCode: 'TZX', departureDate: addDays(30) },
      { originCode: 'TZX', destinationCode: 'AYT', departureDate: addDays(37) },
    ],
    flightType: 1, resultType: 0, adults: 2, children: 1, infants: 1, childAges: [5], useCertNames: true, useTcKimlik: true, languageCode: 'tr',
  })
  await runFlightScenario(cfg, tokenCode, 'Air-S11: Multiple-LCC / 2ADT+1CHD+1INF / AYT→TZX→IST→ADB', {
    legs: [
      { originCode: 'AYT', destinationCode: 'TZX', departureDate: addDays(30) },
      { originCode: 'TZX', destinationCode: 'IST', departureDate: addDays(31) },
      { originCode: 'IST', destinationCode: 'ADB', departureDate: addDays(32) },
    ],
    flightType: 2, resultType: 0, adults: 2, children: 1, infants: 1, childAges: [5], useCertNames: true, useTcKimlik: true, languageCode: 'tr',
  })
  } else if (
  // Air Senaryo 3: Roundtrip / Combined, 1 ADT, LHR → DXB
  true) {
  await runFlightScenario(cfg, tokenCode, 'Air-S3: Roundtrip/Combined / 1ADT / LHR→DXB', {
    legs: [
      { originCode: 'LHR', destinationCode: 'DXB', departureDate: addDays(30) },
      { originCode: 'DXB', destinationCode: 'LHR', departureDate: addDays(37) },
    ],
    flightType: 1, resultType: 0, adults: 1, languageCode: 'tr',
  })

  // Air Senaryo 4: Roundtrip / Separated, 1 ADT, LHR → DXB
  await runFlightScenario(cfg, tokenCode, 'Air-S4: Roundtrip/Separated / 1ADT / LHR→DXB', {
    legs: [
      { originCode: 'LHR', destinationCode: 'DXB', departureDate: addDays(30) },
      { originCode: 'DXB', destinationCode: 'LHR', departureDate: addDays(37) },
    ],
    flightType: 1, resultType: 1, adults: 1, languageCode: 'tr',
  })

  // Air Senaryo 5: Roundtrip / Combined, 2 ADT + 1 CHD + 1 INF, LHR → DXB
  await runFlightScenario(cfg, tokenCode, 'Air-S5: Roundtrip/Combined / 2ADT+1CHD+1INF / LHR→DXB', {
    legs: [
      { originCode: 'LHR', destinationCode: 'DXB', departureDate: addDays(30) },
      { originCode: 'DXB', destinationCode: 'LHR', departureDate: addDays(37) },
    ],
    flightType: 1, resultType: 0, adults: 2, children: 1, infants: 1, childAges: [5], languageCode: 'tr',
  })

  // Air Senaryo 6: Roundtrip / Separated, 2 ADT + 1 CHD + 1 INF, LHR → DXB
  await runFlightScenario(cfg, tokenCode, 'Air-S6: Roundtrip/Separated / 2ADT+1CHD+1INF / LHR→DXB', {
    legs: [
      { originCode: 'LHR', destinationCode: 'DXB', departureDate: addDays(30) },
      { originCode: 'DXB', destinationCode: 'LHR', departureDate: addDays(37) },
    ],
    flightType: 1, resultType: 1, adults: 2, children: 1, infants: 1, childAges: [5], languageCode: 'tr',
  })

  // Air Senaryo 7: Multiple / Combined, 1 ADT, CDG→FCO→LHR→BCN
  await runFlightScenario(cfg, tokenCode, 'Air-S7: Multiple/Combined / 1ADT / CDG→FCO→LHR→BCN', {
    legs: [
      { originCode: 'CDG', destinationCode: 'FCO', departureDate: addDays(30) },
      { originCode: 'FCO', destinationCode: 'LHR', departureDate: addDays(31) },
      { originCode: 'LHR', destinationCode: 'BCN', departureDate: addDays(32) },
    ],
    flightType: 2, resultType: 0, adults: 1, languageCode: 'tr',
  })

  // Air Senaryo 8: Multiple / Separated, 2 ADT + 1 CHD + 1 INF, CDG→FCO→LHR→BCN
  await runFlightScenario(cfg, tokenCode, 'Air-S8: Multiple/Separated / 2ADT+1CHD+1INF / CDG→FCO→LHR→BCN', {
    legs: [
      { originCode: 'CDG', destinationCode: 'FCO', departureDate: addDays(30) },
      { originCode: 'FCO', destinationCode: 'LHR', departureDate: addDays(31) },
      { originCode: 'LHR', destinationCode: 'BCN', departureDate: addDays(32) },
    ],
    flightType: 2, resultType: 1, adults: 2, children: 1, infants: 1, childAges: [5], languageCode: 'tr',
  })

  // Air Senaryo 9: Oneway LCC, 2 ADT + 1 CHD + 1 INF, AYT → TZX
  await runFlightScenario(cfg, tokenCode, 'Air-S9: Oneway-LCC / 2ADT+1CHD+1INF / AYT→TZX', {
    legs: [{ originCode: 'AYT', destinationCode: 'TZX', departureDate: addDays(30) }],
    flightType: 0, resultType: 0, adults: 2, children: 1, infants: 1, childAges: [5], useCertNames: true, useTcKimlik: true, languageCode: 'tr',
  })

  // Air Senaryo 10: Roundtrip LCC, 2 ADT + 1 CHD + 1 INF, AYT → TZX
  await runFlightScenario(cfg, tokenCode, 'Air-S10: Roundtrip-LCC / 2ADT+1CHD+1INF / AYT→TZX', {
    legs: [
      { originCode: 'AYT', destinationCode: 'TZX', departureDate: addDays(30) },
      { originCode: 'TZX', destinationCode: 'AYT', departureDate: addDays(37) },
    ],
    flightType: 1, resultType: 0, adults: 2, children: 1, infants: 1, childAges: [5], useCertNames: true, useTcKimlik: true, languageCode: 'tr',
  })

  // Air Senaryo 11: Multiple LCC, 2 ADT + 1 CHD + 1 INF, AYT→TZX→IST→ADB
  await runFlightScenario(cfg, tokenCode, 'Air-S11: Multiple-LCC / 2ADT+1CHD+1INF / AYT→TZX→IST→ADB', {
    legs: [
      { originCode: 'AYT', destinationCode: 'TZX', departureDate: addDays(30) },
      { originCode: 'TZX', destinationCode: 'IST', departureDate: addDays(31) },
      { originCode: 'IST', destinationCode: 'ADB', departureDate: addDays(32) },
    ],
    flightType: 2, resultType: 0, adults: 2, children: 1, infants: 1, childAges: [5], useCertNames: true, useTcKimlik: true, languageCode: 'tr',
  })
  }
  }

  if (RUN_GENERAL) {
  // ═══════════════════════════════════════════════════════════════════════════
  // TRANSFER SENARYOLARI
  // ═══════════════════════════════════════════════════════════════════════════

  section('Transfer-S1: SearchTransfer (Taksim → IST Havalimanı)')
  try {
    // Gerçek şema: Points[].PickUpPoint/DropOffPoint = { PlaceId, GeoLocation }
    // Örnek noktalar Stoplight Transfer örneğinden (Taksim ↔ IST Havalimanı).
    const transferPoints = [
      {
        Date: `${addDays(7)} 14:00`,
        PickUpPoint: {
          PlaceId: 'ChIJY71WBmW3yhQRw7YgjLJYoIw',
          GeoLocation: { Latitude: 41.0370014, Longitude: 28.9763369 },
        },
        DropOffPoint: {
          PlaceId: 'ChIJqZW8Cvb_n0ARBuUkyCzgDDg',
          GeoLocation: { Latitude: 41.2567349, Longitude: 28.740408 },
        },
      },
    ]
    const payload = await searchTransfer(cfg, tokenCode, {
      points: transferPoints,
      searchType: 0,
      adults: 2,
      languageCode: 'tr',
    })
    const rows = pickTransferRows(payload)
    log('Transfer-S1', 'SearchTransfer', '/Transfer.svc/Rest/Json/SearchTransfer',
      { points: transferPoints }, payload, rows.length >= 0)
    if (rows.length > 0) {
      ok('SearchTransfer Taksim→IST', `${rows.length} teklif bulundu`)
      const first = rows[0]
      const resultKey = first?.ResultKey ?? first?.resultKey ?? first?.OfferId ?? null
      ok('İlk transfer teklifi', `ResultKey: ${String(resultKey).slice(0, 40)}…`)
    } else {
      fail('SearchTransfer Taksim→IST', `Sonuç yok (sandbox kısıtlı olabilir) — ${preview(payload, 400)}`)
    }
  } catch (e) {
    log('Transfer-S1', 'SearchTransfer', '/Transfer.svc/Rest/Json/SearchTransfer', {}, String(e), false)
    fail('SearchTransfer Taksim→IST', e)
  }
  }

  if (RUN_STATIC) {
  // ═══════════════════════════════════════════════════════════════════════════
  // STATIC CONTENT API SENARYOLARI
  // ═══════════════════════════════════════════════════════════════════════════

  section('StaticContent-S1: Authentication')
  let staticToken = null
  try {
    const result = await authenticateStatic(cfg)
    staticToken = result.token
    log('StaticContent-S1', 'Authenticate', 'https://static.travelchain.online/api/token/authenticate',
      { user: cfg.staticUser ?? cfg.channelCode }, result.raw, true)
    ok('StaticContent Auth', `Token: ${staticToken.length} karakter`)
  } catch (e) {
    log('StaticContent-S1', 'Authenticate', 'https://static.travelchain.online/api/token/authenticate', {}, String(e), false)
    const msg = String(e)
    if (msg.includes('401') || msg.includes('Credentials')) {
      console.log(
        '  ℹ️  Static Content API, KPlus ChannelCode/Password ile çalışmaz — ayrı static user/pwd gerekir (TRAVELROBOT_STATIC_USER/PASSWORD).',
      )
      SUMMARY_LINES.push('  ℹ️  StaticContent Auth atlandı (ayrı kimlik bilgisi gerekli)')
    } else {
      fail('StaticContent Auth', e)
    }
  }

  if (staticToken) {
    const STATIC_BASE = 'https://static.travelchain.online/api'

    section('StaticContent-S2: getCountries (Statik)')
    try {
      const payload = await getStaticCountries(cfg, staticToken)
      log('StaticContent-S2', 'GET', `${STATIC_BASE}/country/getCountries`, {}, payload, true)
      const list = payload?.Result ?? payload?.Countries ?? payload ?? []
      ok('getCountries (Static)', `${Array.isArray(list) ? list.length : '?'} ülke`)
    } catch (e) {
      log('StaticContent-S2', 'GET', `${STATIC_BASE}/country/getCountries`, {}, String(e), false)
      fail('getCountries (Static)', e)
    }

    section('StaticContent-S3: getDestinations (Destinasyonlar)')
    try {
      const payload = await getDestinations(cfg, staticToken, { countryCode: 'TR' })
      log('StaticContent-S3', 'POST', `${STATIC_BASE}/hotel/getDestinations`, { CountryCode: 'TR' }, payload, true)
      const list = payload?.Result ?? payload?.Destinations ?? payload ?? []
      ok('getDestinations', `${Array.isArray(list) ? list.length : '?'} destinasyon`)
    } catch (e) {
      log('StaticContent-S3', 'POST', `${STATIC_BASE}/hotel/getDestinations`, {}, String(e), false)
      fail('getDestinations', e)
    }

    section('StaticContent-S4: getAllHotelCodes (Tüm Otel Kodları)')
    try {
      const payload = await getAllHotelCodes(cfg, staticToken)
      log('StaticContent-S4', 'GET', `${STATIC_BASE}/hotel/getAllHotelCodes`, {}, payload, true)
      const list = payload?.Result ?? payload?.HotelCodes ?? payload ?? []
      ok('getAllHotelCodes', `${Array.isArray(list) ? list.length : '?'} kod`)
    } catch (e) {
      log('StaticContent-S4', 'GET', `${STATIC_BASE}/hotel/getAllHotelCodes`, {}, String(e), false)
      fail('getAllHotelCodes', e)
    }

    section('StaticContent-S5: getHotels (Otel içeriği — test kodları)')
    try {
      const codes = ['KTR431805', 'KTR672265']
      const payload = await getHotelContent(cfg, staticToken, codes)
      log('StaticContent-S5', 'POST', `${STATIC_BASE}/hotel/getHotels`, { Codes: codes }, payload, true)
      const list = payload?.Result ?? payload?.Hotels ?? payload ?? []
      ok('getHotels', `${Array.isArray(list) ? list.length : '?'} otel içeriği`)
    } catch (e) {
      log('StaticContent-S5', 'POST', `${STATIC_BASE}/hotel/getHotels`, {}, String(e), false)
      fail('getHotels', e)
    }
  }
  }

  saveLogs()
  printSummary()
}

function printSummary() {
  console.log('\n' + '═'.repeat(70))
  console.log(`ÖZET: ✅ ${passCount} başarılı   ❌ ${failCount} başarısız`)
  console.log('═'.repeat(70))
  if (AIR_CERT_RESULTS.length > 0) {
    console.log('\n✈️  AIR API TEST CASES — KPlus formu için:')
    console.log('─'.repeat(70))
    for (const row of AIR_CERT_RESULTS) {
      console.log(`  Senaryo          : ${row.scenario}`)
      console.log(`  System PNR       : ${row.systemPnr ?? '(alınamadı)'}`)
      console.log(`  PNR              : ${row.pnr ?? '(alınamadı)'}`)
      console.log(`  Ticket(s)        : ${row.ticketNumbers?.join(', ') || '(yok)'}`)
      console.log(`  Direct SystemPNR : ${row.directSystemPnr ?? '(yok)'}`)
      console.log(`  Direct Ticket(s) : ${row.directTicketNumbers?.join(', ') || '(yok)'}`)
      console.log(`  Client Notes     : ${row.clientNotes}`)
      console.log('─'.repeat(70))
      SUMMARY_LINES.push(
        `AIR CERT | ${row.scenario} | SystemPNR: ${row.systemPnr ?? '-'} | PNR: ${row.pnr ?? '-'}`,
      )
    }
  }
  if (TOUR_CERT_RESULTS.length > 0) {
    console.log('\n🚌 TOUR API — KPlus formu için:')
    console.log('─'.repeat(70))
    for (const row of TOUR_CERT_RESULTS) {
      console.log(`  Senaryo     : ${row.scenario}`)
      console.log(`  System PNR  : ${row.systemPnr ?? '(alınamadı)'}`)
      console.log(`  Tur kodu    : ${row.tourCode ?? '-'}`)
      console.log(`  Kalkış      : ${row.departureDate ?? '-'}`)
      if (row.verifiedSystemPnr != null) {
        console.log(`  Doğrulama   : ${row.pnrVerified ? '✅ eşleşti' : '❌ uyuşmaz'} (${row.verifiedSystemPnr})`)
      }
      console.log(`  Client Notes: ${row.clientNotes}`)
      console.log('─'.repeat(70))
      SUMMARY_LINES.push(
        `TOUR CERT | ${row.scenario} | SystemPNR: ${row.systemPnr ?? '-'} | Tour: ${row.tourCode ?? '-'}`,
      )
    }
  }
  if (HOTEL_CERT_RESULTS.length > 0) {
    console.log('\n📋 HOTEL API TEST CASES — KPlus formu için:')
    console.log('─'.repeat(70))
    for (const row of HOTEL_CERT_RESULTS) {
      console.log(`  Senaryo     : ${row.scenario}`)
      console.log(`  System PNR  : ${row.systemPnr ?? '(alınamadı)'}`)
      if (row.verifiedSystemPnr != null) {
        console.log(`  Doğrulama   : ${row.pnrVerified ? '✅ eşleşti' : '❌ uyuşmaz'} (${row.verifiedSystemPnr})`)
      }
      console.log(`  Client Notes: ${row.clientNotes}`)
      console.log(`  Agent Ref   : ${row.agentReference}`)
      console.log(`  Hotel       : ${row.hotelCode}  ResultKeys: ${(row.resultKeys ?? []).length}`)
      console.log('─'.repeat(70))
      SUMMARY_LINES.push(
        `HOTEL CERT | ${row.scenario} | SystemPNR: ${row.systemPnr ?? '-'} | Verified: ${row.pnrVerified === true ? row.verifiedSystemPnr : row.pnrVerified === false ? 'MISMATCH' : 'skip'} | Notes: ${row.clientNotes}`,
      )
    }
  }
  if (failCount === 0) {
    console.log('\n🎉 Tüm senaryolar geçti!\n')
  }
  console.log('\nSertifikasyon gönderimi için log dosyalarını kullanın:')
  console.log(`  ${logFile}`)
  console.log(`  ${summaryFile}`)
  console.log('\nImport komutları (token sonrası çalıştırın):')
  console.log('  node scripts/import-travelrobot-tours.mjs --dry-run --limit 5')
  console.log('  node scripts/import-travelrobot-hotels.mjs --dry-run --limit 5')
}

main().catch((e) => {
  console.error('\n[kritik hata]', e.message || e)
  saveLogs()
  process.exit(1)
})
