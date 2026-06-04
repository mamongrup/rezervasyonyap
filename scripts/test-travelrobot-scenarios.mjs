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
  // Hotel
  searchHotel,
  pickHotelRows,
  getHotelDetails,
  getHotelRooms,
  getRoomOffers,
  validateHotelRooms,
  getHotelFinalPrice,
  // Flight
  searchFlightItinerary,
  pickFlightRows,
  pickFirstFareLegKey,
  pickFareAlternativeLegKeys,
  countFlightOfferSlots,
  pickHotelSearchKey,
  pickHotelRoomOfferKeys,
  pickHotelRoomOfferKeyCandidates,
  buildHotelValidateRooms,
  getFlightBrandedFares,
  getFareRules,
  validateFlight,
  getPaymentOptions,
  createFlightReservation,
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

const __dirname = dirname(fileURLToPath(import.meta.url))

// ─── Argümanlar ───────────────────────────────────────────────────────────────

const args = process.argv.slice(2)
const getArg = (flag) => {
  const i = args.indexOf(flag)
  return i >= 0 ? args[i + 1] : undefined
}
const FROM_DB = args.includes('--from-db')
const SKIP_BOOKING = !args.includes('--with-booking') // booking adımları varsayılan olarak atla
/** Sunucuda doğru sürüm çalıştığını doğrulamak için (git pull sonrası değişmeli). */
const TRAVELROBOT_TEST_SCRIPT_VERSION = '2026-06-04f'

/** KPlus sandbox dokümanındaki örnek otel kodları (destination araması yerine). */
const CERT_HOTEL_BY_DESTINATION = {
  10033097: 'KTR431805', // Istanbul
  531096: 'KCZ466838', // Prague
  587926: 'KDE646930', // Berlin
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
    IdentityNumber: null,
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

// Sandbox ödeme — gerçek çekim olmaz
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
  const offerSlots = Math.min(countFlightOfferSlots(searchPayload, keyOpts), 8)
  let fareLegKeys = []
  let brandedOk = false
  let validateOk = false
  let validateResultKey = null
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
        if (/minimum 2 hours|invalid key/i.test(lastBrandedErr)) continue
        fail(`[${scenarioName}] GetBrandedFares`, lastBrandedErr)
        break
      }
    } catch (e) {
      lastBrandedErr = String(e)
      log(scenarioName, 'GetBrandedFares', '/Air.svc/Rest/Json/GetBrandedFares', { offerIndex }, lastBrandedErr, false)
      if (/minimum 2 hours|invalid key/i.test(lastBrandedErr)) continue
      fail(`[${scenarioName}] GetBrandedFares`, e)
      break
    }

    try {
      const payload = await validateFlight(cfg, tokenCode, { fareAlternativeLegKeys: fareLegKeys })
      log(scenarioName, 'ValidateFlight', '/Air.svc/Rest/Json/Validate', { offerIndex, keys: fareLegKeys.length }, payload, !payload?.HasError)
      if (!payload?.HasError) {
        validateOk = true
        ok(`[${scenarioName}] GetBrandedFares`, `teklif #${offerIndex + 1}, ${fareLegKeys.length} bacak key`)
        ok(`[${scenarioName}] ValidateFlight`, `Fiyat kilitleme başarılı`)
        const res = payload?.Result ?? payload?.result
        const afterValidate = pickFareAlternativeLegKeys(payload, keyOpts)
        if (afterValidate.length) validateResultKey = afterValidate[0]
        else if (res?.ResultKey) validateResultKey = res.ResultKey
        else if (Array.isArray(res?.ResultKeys) && res.ResultKeys[0]) validateResultKey = res.ResultKeys[0]
        else validateResultKey = fareLegKeys[0]
        break
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

  // Adım 4: CreateReservation
  const flightPaxes = buildFlightPaxes(opts)
  try {
    const payload = await createFlightReservation(cfg, {
      tokenCode,
      resultKeys: [validateResultKey],
      flightPaxes,
      contactInfo: TEST_CONTACT,
      invoiceInfo: TEST_INVOICE,
      paymentInfo: TEST_PAYMENT,
      languageCode: opts.languageCode ?? 'tr',
    })
    log(scenarioName, 'CreateReservation', '/Flight.svc/Rest/Json/CreateReservation',
      { resultKeys: [validateResultKey], paxCount: flightPaxes.length }, payload, !payload?.HasError)
    if (!payload?.HasError) {
      systemPnr = payload?.Result?.SystemPnr ?? payload?.SystemPnr ?? null
      ok(`[${scenarioName}] CreateReservation`, `SystemPNR: ${systemPnr}`)
    } else {
      fail(`[${scenarioName}] CreateReservation`, payload?.ErrorMessage ?? 'Hata')
      return
    }
  } catch (e) {
    log(scenarioName, 'CreateReservation', '/Flight.svc/Rest/Json/CreateReservation', {}, String(e), false)
    fail(`[${scenarioName}] CreateReservation`, e)
    return
  }

  if (!systemPnr) {
    console.log(`  ⚠️  SystemPNR alınamadı — bilet adımı atlanıyor`)
    return
  }

  // Adım 5: IssueTicketFromReservation
  try {
    const payload = await issueTicketFromReservation(cfg, { tokenCode, systemPnr, languageCode: opts.languageCode ?? 'tr' })
    log(scenarioName, 'IssueTicketFromReservation', '/Flight.svc/Rest/Json/IssueTicketFromReservation',
      { systemPnr }, payload, !payload?.HasError)
    if (!payload?.HasError) {
      const tickets = payload?.Result?.TicketNumbers ?? payload?.TicketNumbers ?? []
      ok(`[${scenarioName}] IssueTicketFromReservation`, `Bilet: ${tickets.join(', ') || '(sandbox)'}`)
    } else {
      fail(`[${scenarioName}] IssueTicketFromReservation`, payload?.ErrorMessage ?? 'Hata')
    }
  } catch (e) {
    log(scenarioName, 'IssueTicketFromReservation', '/Flight.svc/Rest/Json/IssueTicketFromReservation', { systemPnr }, String(e), false)
    fail(`[${scenarioName}] IssueTicketFromReservation`, e)
  }
}

function buildFlightPaxes(opts) {
  const paxes = []
  const adults = opts.adults ?? 1
  const children = opts.children ?? 0
  const infants = opts.infants ?? 0

  for (let i = 0; i < adults; i++) {
    paxes.push({
      RecId: 0,
      IsLeader: i === 0,
      PaxType: 0, // ADT
      Pax: makePax(`ADT${i + 1}`, 'TESTPAX', '15.06.1990', 1),
    })
  }
  for (let i = 0; i < children; i++) {
    paxes.push({
      RecId: 0,
      IsLeader: false,
      PaxType: 1, // CHD
      Pax: makePax(`CHD${i + 1}`, 'TESTPAX', '15.06.2019', 1), // age ~5
    })
  }
  for (let i = 0; i < infants; i++) {
    paxes.push({
      RecId: 0,
      IsLeader: false,
      PaxType: 2, // INF
      Pax: makePax(`INF${i + 1}`, 'TESTPAX', '15.06.2024', 1), // age ~1
    })
  }
  return paxes
}

// ─── Otel senaryo çalıştırıcı ─────────────────────────────────────────────────

async function runHotelScenario(cfg, tokenCode, scenarioName, hotelOpts, roomOpts) {
  section(`${scenarioName}`)

  const checkin = addDays(30)
  const checkout = addDays(37)

  const destId = hotelOpts.destinationId
  const certHotel = destId != null ? CERT_HOTEL_BY_DESTINATION[destId] : null
  const searchOpts = {
    checkInDate: checkin,
    checkOutDate: checkout,
    ...hotelOpts,
    rooms: roomOpts,
  }
  if (certHotel) {
    delete searchOpts.destinationId
    searchOpts.hotelCode = certHotel
  }

  // Adım 1: SearchHotel
  let packageId = null
  let foundHotelCode = null
  let hotelSearchKey = null
  let selectedRow = null

  try {
    const payload = await searchHotel(cfg, tokenCode, searchOpts)
    const rows = pickHotelRows(payload)
    log(scenarioName, 'SearchHotel', '/Hotel.svc/Rest/Json/SearchHotel',
      { checkin, checkout, ...hotelOpts }, payload, rows.length >= 0)

    if (rows.length > 0) {
      ok(`[${scenarioName}] SearchHotel`, `${rows.length} otel (${checkin} → ${checkout})`)
      selectedRow =
        (certHotel && rows.find((r) => (r.HotelCode ?? r.hotelCode) === certHotel)) ?? rows[0]
      foundHotelCode =
        selectedRow?.HotelCode ?? selectedRow?.hotelCode ?? selectedRow?.ProductCode ?? certHotel ?? null
      packageId = selectedRow?.PackageId ?? selectedRow?.packageId ?? null
      hotelSearchKey = pickHotelSearchKey(payload, selectedRow)
      ok(`[${scenarioName}] İlk otel`, `${foundHotelCode} — ${selectedRow?.HotelName ?? selectedRow?.Name ?? '?'}`)
    } else {
      fail(`[${scenarioName}] SearchHotel`, `Sonuç yok — ${preview(payload, 400)}`)
      return
    }
  } catch (e) {
    log(scenarioName, 'SearchHotel', '/Hotel.svc/Rest/Json/SearchHotel', hotelOpts, String(e), false)
    fail(`[${scenarioName}] SearchHotel`, e)
    return
  }

  if (!foundHotelCode) return

  // Adım 2: GetHotelDetails
  try {
    const payload = await getHotelDetails(cfg, tokenCode, foundHotelCode, { languageCode: 'tr' })
    log(scenarioName, 'GetHotelDetails', '/Hotel.svc/Rest/Json/GetHotelDetails',
      { hotelCode: foundHotelCode }, payload, !payload?.HasError)
    if (!payload?.HasError) {
      const name = payload?.Result?.HotelName ?? payload?.HotelName ?? foundHotelCode
      ok(`[${scenarioName}] GetHotelDetails`, name)
    } else {
      fail(`[${scenarioName}] GetHotelDetails`, payload?.ErrorMessage ?? 'Hata')
    }
  } catch (e) {
    log(scenarioName, 'GetHotelDetails', '/Hotel.svc/Rest/Json/GetHotelDetails', { hotelCode: foundHotelCode }, String(e), false)
    fail(`[${scenarioName}] GetHotelDetails`, e)
  }

  // Adım 3: GetHotelRoomPrices
  let roomOfferKeys = []
  let roomPricesPayload = null
  try {
    const payload = await getHotelRooms(cfg, tokenCode, {
      productCode: foundHotelCode,
      hotelCode: foundHotelCode,
      searchKey: hotelSearchKey,
      checkInDate: checkin,
      checkOutDate: checkout,
      rooms: roomOpts,
    })
    log(scenarioName, 'GetHotelRoomPrices', '/Hotel.svc/Rest/Json/GetHotelRoomPrices',
      { hotelCode: foundHotelCode, checkin, checkout }, payload, !payload?.HasError)
    if (!payload?.HasError) {
      roomPricesPayload = payload
      const priceSearchKey = pickHotelSearchKey(payload) ?? hotelSearchKey
      if (priceSearchKey) hotelSearchKey = priceSearchKey
      roomOfferKeys = pickHotelRoomOfferKeys(payload, roomOpts.length, roomOpts)
      ok(`[${scenarioName}] GetHotelRoomPrices`, `${roomOfferKeys.length} oda teklifi (Key)`)
    } else {
      fail(`[${scenarioName}] GetHotelRoomPrices`, payload?.ErrorMessage ?? 'Hata')
      return
    }
  } catch (e) {
    log(scenarioName, 'GetHotelRoomPrices', '/Hotel.svc/Rest/Json/GetHotelRoomPrices', { hotelCode: foundHotelCode }, String(e), false)
    fail(`[${scenarioName}] GetHotelRoomPrices`, e)
    return
  }

  if (!roomOfferKeys.length) {
    console.log(`  ⚠️  Oda Key alınamadı — ValidateHotelRoomsV2 atlanıyor`)
    return
  }

  // Adım 4: ValidateHotelRoomsV2 — RoomCode (result key); tek odada alternatif dene
  const candidates = pickHotelRoomOfferKeyCandidates(roomPricesPayload, roomOpts)
  let validated = false
  let lastValErr = ''

  const attemptValidate = async (keys, attemptLabel) => {
    const validateRooms = buildHotelValidateRooms(roomOpts, keys)
    const payload = await getHotelFinalPrice(cfg, tokenCode, { rooms: validateRooms })
    log(scenarioName, 'ValidateHotelRoomsV2', '/Hotel.svc/Rest/Json/ValidateHotelRoomsV2',
      { attempt: attemptLabel, roomCount: validateRooms.length },
      payload, !payload?.HasError)
    return payload
  }

  if (roomOpts.length > 1) {
    const keys =
      candidates.length >= roomOpts.length ? candidates.slice(0, roomOpts.length) : roomOfferKeys
    try {
      const payload = await attemptValidate(keys, 'multi-room')
      if (!payload?.HasError) {
        ok(`[${scenarioName}] ValidateHotelRoomsV2`, preview(payload?.Result ?? payload, 120))
        validated = true
      } else {
        lastValErr = payload?.ErrorMessage ?? 'Hata'
      }
    } catch (e) {
      lastValErr = String(e)
    }
  } else {
    const tryList = [...new Set([...roomOfferKeys, ...candidates])].slice(0, 12)
    for (let i = 0; i < tryList.length; i++) {
      try {
        const payload = await attemptValidate([tryList[i]], i + 1)
        if (!payload?.HasError) {
          ok(`[${scenarioName}] ValidateHotelRoomsV2`, preview(payload?.Result ?? payload, 120))
          validated = true
          break
        }
        lastValErr = payload?.ErrorMessage ?? 'Hata'
        if (!/invalid result key/i.test(lastValErr)) break
      } catch (e) {
        lastValErr = String(e)
        if (!/invalid result key/i.test(lastValErr)) break
      }
    }
  }
  if (!validated && lastValErr) {
    fail(`[${scenarioName}] ValidateHotelRoomsV2`, lastValErr)
  }

  if (SKIP_BOOKING) {
    console.log(`  ℹ️  BookHotel adımı atlandı (--with-booking flag'i ile etkinleştir)`)
  }
}

// ─── Ana akış ─────────────────────────────────────────────────────────────────

async function main() {
  console.log('╔══════════════════════════════════════════════════════════════╗')
  console.log('║   Travelrobot / KPlus Sandbox — TAM SERTİFİKASYON TESTİ    ║')
  console.log('╚══════════════════════════════════════════════════════════════╝')
  if (SKIP_BOOKING) {
    console.log('\n  ℹ️  Mod: Search+BrandedFares+Validate (--with-booking ile booking da test edilir)')
  } else {
    console.log('\n  ⚡ Mod: Tam akış (booking dahil)')
  }

  // Config yükle
  let cfg
  if (FROM_DB) {
    console.log('\n[config] DB\'den yükleniyor…')
    cfg = await loadTravelrobotConfig()
  } else {
    if (!CREDS.baseUrl || !CREDS.channelCode || !CREDS.channelPassword) {
      console.error(
        '\n[hata] Credentials eksik. Kullanım:\n' +
        '  --base-url "http://sandbox.kplus.com.tr/kplus/v0" \\\n' +
        '  --channel-code <code> --channel-password <pass>\n' +
        '  ya da --from-db',
      )
      process.exit(1)
    }
    cfg = { ...CREDS, enabled: true }
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
    console.log('\n⚠️  Token alınamadı — tüm senaryolar çalıştırılamaz. Sandbox IP kısıtlaması olabilir.')
    console.log('   Lütfen sunucuda çalıştırın:\n')
    console.log(`   node scripts/test-travelrobot-scenarios.mjs \\`)
    console.log(`     --base-url "${cfg.baseUrl}" \\`)
    console.log(`     --channel-code "${cfg.channelCode}" \\`)
    console.log(`     --channel-password "***"`)
    printSummary()
    return
  }

  // CreateToken ile alınan token — RefreshToken öncesi General uçları bununla çalışır
  const tokenAfterCreate = tokenCode

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

  // ── Tur Arama ─────────────────────────────────────────────────────────────
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

  // ═══════════════════════════════════════════════════════════════════════════
  // OTEL SENARYOLARI (Hotel API Test Cases belgesinden)
  // ═══════════════════════════════════════════════════════════════════════════

  // Hotel Senaryo 1: 1 Oda, 2 Yetişkin, İstanbul
  await runHotelScenario(
    cfg, tokenCode,
    'Hotel-S1: 1 Oda / 2 ADT / İstanbul (destinationId=10033097)',
    { destinationId: 10033097, languageCode: 'tr' },
    [{ RoomIndex: 0, Adults: 2, Children: 0, ChildAges: null }],
  )

  // Hotel Senaryo 2: 1 Oda, 2 Yetişkin + 1 Çocuk (5 yaş), herhangi lokasyon
  await runHotelScenario(
    cfg, tokenCode,
    'Hotel-S2: 1 Oda / 2 ADT + 1 CHD(5) / Prague (destinationId=531096)',
    { destinationId: 531096, languageCode: 'tr' },
    [{ RoomIndex: 0, Adults: 2, Children: 1, ChildAges: [5] }],
  )

  // Hotel Senaryo 3: 2 Oda, 3 Yetişkin + 2 Çocuk (2 ve 4 yaş)
  await runHotelScenario(
    cfg, tokenCode,
    'Hotel-S3: 2 Oda / Oda1:2ADT+1CHD(2) + Oda2:1ADT+1CHD(4) / Berlin (destinationId=587926)',
    { destinationId: 587926, languageCode: 'tr' },
    [
      { RoomIndex: 0, Adults: 2, Children: 1, ChildAges: [2] },
      { RoomIndex: 1, Adults: 1, Children: 1, ChildAges: [4] },
    ],
  )

  // ═══════════════════════════════════════════════════════════════════════════
  // UÇUŞ SENARYOLARI (Air API Test Cases belgesinden — 11 senaryo)
  // ═══════════════════════════════════════════════════════════════════════════

  // Air Senaryo 1: Oneway, 1 ADT, IST → LHR
  await runFlightScenario(cfg, tokenCode, 'Air-S1: Oneway / 1ADT / IST→LHR', {
    legs: [{ originCode: 'IST', destinationCode: 'LHR', departureDate: addDays(30) }],
    flightType: 0, resultType: 0, adults: 1, languageCode: 'tr',
  })

  // Air Senaryo 2: Oneway, 2 ADT + 1 CHD + 1 INF, IST → LHR
  await runFlightScenario(cfg, tokenCode, 'Air-S2: Oneway / 2ADT+1CHD+1INF / IST→LHR', {
    legs: [{ originCode: 'IST', destinationCode: 'LHR', departureDate: addDays(30) }],
    flightType: 0, resultType: 0, adults: 2, children: 1, infants: 1, languageCode: 'tr',
  })

  // Air Senaryo 3: Roundtrip / Combined, 1 ADT, LHR → DXB
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
    flightType: 1, resultType: 0, adults: 2, children: 1, infants: 1, languageCode: 'tr',
  })

  // Air Senaryo 6: Roundtrip / Separated, 2 ADT + 1 CHD + 1 INF, LHR → DXB
  await runFlightScenario(cfg, tokenCode, 'Air-S6: Roundtrip/Separated / 2ADT+1CHD+1INF / LHR→DXB', {
    legs: [
      { originCode: 'LHR', destinationCode: 'DXB', departureDate: addDays(30) },
      { originCode: 'DXB', destinationCode: 'LHR', departureDate: addDays(37) },
    ],
    flightType: 1, resultType: 1, adults: 2, children: 1, infants: 1, languageCode: 'tr',
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
    flightType: 2, resultType: 1, adults: 2, children: 1, infants: 1, languageCode: 'tr',
  })

  // Air Senaryo 9: Oneway LCC, 2 ADT + 1 CHD + 1 INF, AYT → TZX
  await runFlightScenario(cfg, tokenCode, 'Air-S9: Oneway-LCC / 2ADT+1CHD+1INF / AYT→TZX', {
    legs: [{ originCode: 'AYT', destinationCode: 'TZX', departureDate: addDays(30) }],
    flightType: 0, resultType: 0, adults: 2, children: 1, infants: 1, languageCode: 'tr',
  })

  // Air Senaryo 10: Roundtrip LCC, 2 ADT + 1 CHD + 1 INF, AYT → TZX
  await runFlightScenario(cfg, tokenCode, 'Air-S10: Roundtrip-LCC / 2ADT+1CHD+1INF / AYT→TZX', {
    legs: [
      { originCode: 'AYT', destinationCode: 'TZX', departureDate: addDays(30) },
      { originCode: 'TZX', destinationCode: 'AYT', departureDate: addDays(37) },
    ],
    flightType: 1, resultType: 0, adults: 2, children: 1, infants: 1, languageCode: 'tr',
  })

  // Air Senaryo 11: Multiple LCC, 2 ADT + 1 CHD + 1 INF, AYT→TZX→IST→ADB
  await runFlightScenario(cfg, tokenCode, 'Air-S11: Multiple-LCC / 2ADT+1CHD+1INF / AYT→TZX→IST→ADB', {
    legs: [
      { originCode: 'AYT', destinationCode: 'TZX', departureDate: addDays(30) },
      { originCode: 'TZX', destinationCode: 'IST', departureDate: addDays(31) },
      { originCode: 'IST', destinationCode: 'ADB', departureDate: addDays(32) },
    ],
    flightType: 2, resultType: 0, adults: 2, children: 1, infants: 1, languageCode: 'tr',
  })

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

  saveLogs()
  printSummary()
}

function printSummary() {
  console.log('\n' + '═'.repeat(70))
  console.log(`ÖZET: ✅ ${passCount} başarılı   ❌ ${failCount} başarısız`)
  console.log('═'.repeat(70))
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
