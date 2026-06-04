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
  // Tour
  searchTours,
  pickTourRows,
  // Hotel
  searchHotel,
  pickHotelRows,
  getHotelDetails,
  getHotelRooms,
  getHotelFinalPrice,
  // Flight
  searchFlightItinerary,
  pickFlightRows,
  getFlightBrandedFares,
  getFareRules,
  validateFlight,
  getPaymentOptions,
  createFlightReservation,
  issueTicketFromReservation,
  issueTicketDirect,
} from './lib/travelrobot-api.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))

// ─── Argümanlar ───────────────────────────────────────────────────────────────

const args = process.argv.slice(2)
const getArg = (flag) => {
  const i = args.indexOf(flag)
  return i >= 0 ? args[i + 1] : undefined
}
const FROM_DB = args.includes('--from-db')
const SKIP_BOOKING = !args.includes('--with-booking') // booking adımları varsayılan olarak atla

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

  // Adım 1: SearchItinerary
  try {
    const payload = await searchFlightItinerary(cfg, tokenCode, opts)
    const rows = pickFlightRows(payload)
    log(scenarioName, 'SearchItinerary', '/Flight.svc/Rest/Json/SearchItinerary', opts, payload, rows.length >= 0)

    if (rows.length > 0) {
      ok(`[${scenarioName}] SearchItinerary`, `${rows.length} sonuç`)
      // İlk sonucun result key'ini al
      const first = rows[0]
      resultKey =
        first?.ResultKey ?? first?.resultKey ?? first?.Key ?? first?.key ??
        (Array.isArray(first?.ResultKeys) ? first.ResultKeys[0] : null) ??
        null
      const airline = first?.AirlineName ?? first?.airlineName ?? first?.Airline ?? '?'
      const price = first?.TotalPrice ?? first?.totalPrice ?? first?.Price ?? '?'
      ok(`[${scenarioName}] İlk sonuç`, `${airline} — ${price}`)
    } else {
      fail(`[${scenarioName}] SearchItinerary`, `Sonuç boş (sandbox kısıtlı olabilir) — ${preview(payload, 400)}`)
      return // Devam edemeyiz
    }
  } catch (e) {
    log(scenarioName, 'SearchItinerary', '/Flight.svc/Rest/Json/SearchItinerary', opts, String(e), false)
    fail(`[${scenarioName}] SearchItinerary`, e)
    return
  }

  if (!resultKey) {
    console.log(`  ⚠️  ResultKey alınamadı — sonraki adımlar atlanıyor`)
    return
  }

  // Adım 2: GetBrandedFares
  let brandedFareResultKey = resultKey
  try {
    const payload = await getFlightBrandedFares(cfg, tokenCode, { resultKey, languageCode: opts.languageCode ?? 'tr' })
    log(scenarioName, 'GetBrandedFares', '/Flight.svc/Rest/Json/GetBrandedFares', { resultKey }, payload, !payload?.HasError)
    if (!payload?.HasError) {
      ok(`[${scenarioName}] GetBrandedFares`, preview(payload, 150))
      // Mevcut key veya branded fare key
      const bf = payload?.Result ?? payload?.result
      if (bf?.ResultKey) brandedFareResultKey = bf.ResultKey
    } else {
      fail(`[${scenarioName}] GetBrandedFares`, payload?.ErrorMessage ?? 'Hata')
    }
  } catch (e) {
    log(scenarioName, 'GetBrandedFares', '/Flight.svc/Rest/Json/GetBrandedFares', { resultKey }, String(e), false)
    fail(`[${scenarioName}] GetBrandedFares`, e)
  }

  // Adım 3: ValidateFlight
  let validateResultKey = brandedFareResultKey
  try {
    const resultKeys = [validateResultKey]
    const payload = await validateFlight(cfg, tokenCode, { resultKeys, languageCode: opts.languageCode ?? 'tr' })
    log(scenarioName, 'ValidateFlight', '/Flight.svc/Rest/Json/ValidateFlight', { resultKeys }, payload, !payload?.HasError)
    if (!payload?.HasError) {
      ok(`[${scenarioName}] ValidateFlight`, `Fiyat kilitleme başarılı`)
      // Validate sonrası yeni resultKey olabilir
      const res = payload?.Result ?? payload?.result
      if (res?.ResultKey) validateResultKey = res.ResultKey
      else if (Array.isArray(res?.ResultKeys) && res.ResultKeys[0]) validateResultKey = res.ResultKeys[0]
    } else {
      fail(`[${scenarioName}] ValidateFlight`, payload?.ErrorMessage ?? 'Hata')
      return // Validate olmadan booking yapma
    }
  } catch (e) {
    log(scenarioName, 'ValidateFlight', '/Flight.svc/Rest/Json/ValidateFlight', { resultKeys: [validateResultKey] }, String(e), false)
    fail(`[${scenarioName}] ValidateFlight`, e)
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

  // Adım 1: SearchHotel
  let packageId = null
  let foundHotelCode = null

  try {
    const payload = await searchHotel(cfg, tokenCode, {
      checkInDate: checkin,
      checkOutDate: checkout,
      ...hotelOpts,
      rooms: roomOpts,
    })
    const rows = pickHotelRows(payload)
    log(scenarioName, 'SearchHotel', '/Hotel.svc/Rest/Json/SearchHotel',
      { checkin, checkout, ...hotelOpts }, payload, rows.length >= 0)

    if (rows.length > 0) {
      ok(`[${scenarioName}] SearchHotel`, `${rows.length} otel (${checkin} → ${checkout})`)
      const first = rows[0]
      foundHotelCode = first?.HotelCode ?? first?.hotelCode ?? first?.Code ?? null
      packageId = first?.PackageId ?? first?.packageId ?? null
      ok(`[${scenarioName}] İlk otel`, `${foundHotelCode} — ${first?.HotelName ?? first?.Name ?? '?'}`)
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

  // Adım 3: GetHotelRooms
  let roomPackageId = packageId
  try {
    const payload = await getHotelRooms(cfg, tokenCode, {
      hotelCode: foundHotelCode,
      checkInDate: checkin,
      checkOutDate: checkout,
      rooms: roomOpts,
    })
    log(scenarioName, 'GetHotelRooms', '/Hotel.svc/Rest/Json/GetHotelRooms',
      { hotelCode: foundHotelCode, checkin, checkout }, payload, !payload?.HasError)
    if (!payload?.HasError) {
      const res = payload?.Result ?? payload?.Rooms ?? payload?.rooms ?? []
      const count = Array.isArray(res) ? res.length : Object.keys(res).length
      ok(`[${scenarioName}] GetHotelRooms`, `${count} oda tipi`)
      // PackageId güncelle
      if (Array.isArray(res) && res[0]?.PackageId) roomPackageId = res[0].PackageId
    } else {
      fail(`[${scenarioName}] GetHotelRooms`, payload?.ErrorMessage ?? 'Hata')
      return
    }
  } catch (e) {
    log(scenarioName, 'GetHotelRooms', '/Hotel.svc/Rest/Json/GetHotelRooms', { hotelCode: foundHotelCode }, String(e), false)
    fail(`[${scenarioName}] GetHotelRooms`, e)
    return
  }

  if (!roomPackageId) {
    console.log(`  ⚠️  PackageId alınamadı — GetHotelFinalPrice atlanıyor`)
    return
  }

  // Adım 4: GetHotelFinalPrice
  try {
    const payload = await getHotelFinalPrice(cfg, tokenCode, { packageId: roomPackageId, languageCode: 'tr' })
    log(scenarioName, 'GetHotelFinalPrice', '/Hotel.svc/Rest/Json/GetHotelFinalPrice',
      { packageId: roomPackageId }, payload, !payload?.HasError)
    if (!payload?.HasError) {
      const price = payload?.Result?.TotalPrice ?? payload?.TotalPrice ?? '?'
      ok(`[${scenarioName}] GetHotelFinalPrice`, `Toplam: ${price}`)
    } else {
      fail(`[${scenarioName}] GetHotelFinalPrice`, payload?.ErrorMessage ?? 'Hata')
    }
  } catch (e) {
    log(scenarioName, 'GetHotelFinalPrice', '/Hotel.svc/Rest/Json/GetHotelFinalPrice', { packageId: roomPackageId }, String(e), false)
    fail(`[${scenarioName}] GetHotelFinalPrice`, e)
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

  console.log(`\n[config] Base URL   : ${cfg.baseUrl}`)
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

  // ── Tur Arama ─────────────────────────────────────────────────────────────
  section('S1 — SearchTour (Tur Katalog)')
  try {
    const payload = await searchTours(cfg, tokenCode, { languageCode: 'tr' })
    const rows = pickTourRows(payload)
    log('S1-SearchTour', 'SearchTour', '/Tour.svc/Rest/Json/SearchTour',
      { languageCode: 'tr' }, payload, rows.length >= 0)
    if (rows.length > 0) {
      ok('SearchTour', `${rows.length} tur`)
      const f = rows[0]
      ok('İlk tur', `${f?.TourCode ?? f?.Code ?? '?'} — ${f?.Name ?? f?.TourName ?? '?'}`)
    } else {
      fail('SearchTour', `Sonuç yok — ${preview(payload, 400)}`)
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
