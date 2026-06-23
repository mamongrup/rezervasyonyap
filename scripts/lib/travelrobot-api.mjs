/**
 * Travelrobot / KPlus API istemcisi.
 *
 * Sandbox base URL: http://sandbox.kplus.com.tr/kplus/v0
 * Canlı base URL:   https://api.kplus.com.tr/kplus/v0  (ya da panel'den)
 *
 * Kimlik: panel site_settings.listing_api_providers.travelrobot veya TRAVELROBOT_* env.
 *
 * Stoplight dökümantasyonu: https://kplus.stoplight.io/docs/travelrobot
 *
 * Modüller ve akışlar:
 *
 *   GENEL:
 *     createToken → (refreshToken kullanıyorsa token süre uzat)
 *     getCurrencies, getCountries, login (B2C)
 *
 *   TUR:
 *     createToken → searchTours → getTourPrices → getTourExtras
 *     → getTourFinalPrice → getPickupPoints → getTourPaymentOptions → bookTour
 *
 *   OTEL:
 *     createToken → searchHotel → [getHotelAsyncResults (async ise)]
 *     → getRoomOffers → getHotelDetails → getRoomCancellationPolicies → getRoomRemarks
 *     → validateHotelRooms → getHotelPaymentOptions → bookRoomOffers
 *     → [confirmHotelReservation] → [cancelHotelReservation / voidHotelReservation]
 *     → getHotelReservation / getBooking
 *
 *   UÇUŞ:
 *     createToken → searchFlightItinerary → getFlightBrandedFares → getFareRules
 *     → validateFlight → getPaymentOptions → createFlightReservation
 *     → issueTicketFromReservation / issueTicketDirect
 *     → [cancelFlightReservation / voidTicket] → getReservation / getBooking
 *
 *   TRANSFER:
 *     createToken → searchTransfer → validateTransferOffer
 *     → getTransferPaymentOptions → bookTransfer → getBooking
 */

import { loadTravelrobotConfigFromDb } from './listing-api-providers-db.mjs'

export async function loadTravelrobotConfig() {
  const cfg = await loadTravelrobotConfigFromDb()
  if (!cfg.channelCode || !cfg.channelPassword) {
    throw new Error(
      'Travelrobot ChannelCode/Password yok — panel: /manage/admin/settings/listing-api veya TRAVELROBOT_* env',
    )
  }
  return cfg
}

function joinUrl(base, path) {
  const p = path.startsWith('/') ? path : `/${path}`
  return `${base}${p}`
}

async function kplusPost(baseUrl, svcPath, body, opts = {}) {
  const url = joinUrl(baseUrl, svcPath)
  const timeoutMs = Number(opts.timeoutMs ?? process.env.KPLUS_FETCH_TIMEOUT_MS ?? 120000)
  const fetchOpts = {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }
  if (timeoutMs > 0 && typeof AbortSignal !== 'undefined' && AbortSignal.timeout) {
    fetchOpts.signal = AbortSignal.timeout(timeoutMs)
  }
  let res
  try {
    res = await fetch(url, fetchOpts)
  } catch (e) {
    if (e?.name === 'TimeoutError' || e?.name === 'AbortError') {
      throw new Error(`${svcPath}: zaman aşımı (${timeoutMs}ms)`)
    }
    throw e
  }
  const text = await res.text()
  let json = null
  if (text.trim()) {
    try {
      json = JSON.parse(text)
    } catch {
      throw new Error(`${svcPath}: geçersiz JSON (HTTP ${res.status}) — ${text.slice(0, 200)}`)
    }
  }
  if (!res.ok || json?.HasError) {
    if (opts.noThrowOnHasError === true && json) return json
    const msg =
      json?.ErrorMessage ||
      json?.UserFriendlyErrorMessage ||
      json?.Message ||
      (res.status >= 500 && !json ? `HTTP ${res.status} (sunucu XML/SOAP — KPlus sandbox)` : null) ||
      text.slice(0, 300) ||
      res.statusText
    throw new Error(`${svcPath}: ${msg}`)
  }
  return json
}

// ─── Yardımcı ─────────────────────────────────────────────────────────────────

function addDays(n) {
  const d = new Date()
  d.setUTCDate(d.getUTCDate() + n)
  return d
}

function formatDate(d) {
  const dd = String(d.getUTCDate()).padStart(2, '0')
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0')
  const yyyy = d.getUTCFullYear()
  return `${dd}.${mm}.${yyyy}`
}

// KPlus SearchHotel CheckInDate/CheckOutDate'i DD.MM.YYYY bekler. Çağıranlar bazen
// ISO (YYYY-MM-DD) veya Date geçtiği için tek noktada normalize edilir; aksi halde
// API "Invalid date" döndürür ve oda fiyatları hiç çekilemez.
function toKplusDate(value) {
  if (value == null || value === '') return ''
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? '' : formatDate(value)
  const s = String(value).trim()
  if (/^\d{2}\.\d{2}\.\d{4}$/.test(s)) return s
  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (iso) return `${iso[3]}.${iso[2]}.${iso[1]}`
  const d = new Date(s)
  return Number.isNaN(d.getTime()) ? s : formatDate(d)
}

function tokenObj(tokenCode) {
  return { TokenCode: tokenCode }
}

/**
 * Otel oda listesini KPlus'ın beklediği Paxes yapısına çevirir.
 * Çalışan Tour GetTourPrices yapısı baz alındı:
 *   Rooms: [{ Index, Paxes: [{ PaxType: 0=ADT/1=CHD, Count, ChildAgeList }] }]
 *
 * Girdi formatları desteklenir:
 *   - { Index, Paxes: [...] }                  → olduğu gibi kullanılır
 *   - { RoomIndex, Adults, Children, ChildAges } → Paxes yapısına dönüştürülür
 */
function normalizeRooms(rooms) {
  const list = rooms ?? [{ RoomIndex: 0, Adults: 2, Children: 0, ChildAges: null }]
  return list.map((r, i) => {
    if (Array.isArray(r?.Paxes)) {
      return { Index: r.Index ?? r.RoomIndex ?? i, Paxes: r.Paxes }
    }
    const adults = r.Adults ?? r.adults ?? 1
    const children = r.Children ?? r.children ?? 0
    const childAges = r.ChildAges ?? r.childAges ?? null
    const paxes = [{ PaxType: 0, Count: adults, ChildAgeList: null }]
    if (children > 0) {
      paxes.push({ PaxType: 1, Count: children, ChildAgeList: childAges })
    }
    return { Index: r.RoomIndex ?? r.Index ?? i, Paxes: paxes }
  })
}

// ─── GENEL (General API) ──────────────────────────────────────────────────────
// Stoplight: https://kplus.stoplight.io/docs/travelrobot/7ba5b63ea6573-travelrobot-general-api

/**
 * Token oluştur — geçerlilik süresi ~120 dakika.
 * Her kullanıcı için ayrı token oluşturulmalıdır.
 * Stoplight: /docs/travelrobot/7854f0ac263f0-create-token
 */
export async function createTravelrobotToken(cfg) {
  const json = await kplusPost(
    cfg.baseUrl,
    '/General.svc/Rest/Json/CreateTokenV2',
    {
      channelCredential: {
        ChannelCode: cfg.channelCode,
        ChannelPassword: cfg.channelPassword,
      },
    },
  )
  const token =
    json?.Result?.TokenCode || json?.TokenCode || json?.tokenCode || ''
  if (!token) throw new Error('CreateTokenV2: TokenCode yok')
  return { tokenCode: String(token), raw: json }
}

/**
 * Token yenile — mevcut token'ın süresini uzatır (~120 dk).
 * Stoplight: /docs/travelrobot/d57c00e567a33-refresh-token
 * opts: { tokenCode }
 */
export async function refreshToken(cfg, opts = {}) {
  // Gerçek şema (düz): { channelCode, channelPassword, tokenCode }
  const json = await kplusPost(cfg.baseUrl, '/General.svc/Rest/Json/RefreshToken', {
    channelCode: cfg.channelCode,
    channelPassword: cfg.channelPassword,
    tokenCode: opts.tokenCode,
  })
  const token = json?.Result?.TokenCode || json?.TokenCode || json?.tokenCode || ''
  if (!token) throw new Error('RefreshToken: TokenCode yok yanıtta')
  return { tokenCode: String(token), raw: json }
}

/**
 * Desteklenen para birimlerini listele.
 * Stoplight: /docs/travelrobot/8c9095b4f95f3-get-currencies
 * opts: { tokenCode, languageCode }
 */
export async function getCurrencies(cfg, tokenCode, opts = {}) {
  // Gerçek şema (General.json): düz { tokenCode } — request sarmalayıcı yok
  const code = opts.tokenCode ?? tokenCode
  return kplusPost(cfg.baseUrl, '/General.svc/Rest/Json/GetCurrencies', {
    tokenCode: code,
    TokenCode: code,
  })
}

/**
 * Desteklenen ülkeleri listele (genel — tüm modüller için).
 * Stoplight: /docs/travelrobot/fdd5368acfebc-get-countries
 * opts: { tokenCode, languageCode }
 */
export async function getCountries(cfg, tokenCode, opts = {}) {
  // Gerçek şema: { tokenCode, culture } — culture zorunlu, spec'te yalnızca "en"
  const code = opts.tokenCode ?? tokenCode
  return kplusPost(cfg.baseUrl, '/General.svc/Rest/Json/GetCountries', {
    tokenCode: code,
    TokenCode: code,
    culture: opts.culture ?? opts.languageCode ?? 'en',
  })
}

/**
 * B2C / kullanıcı girişi — müşteri oturumu açar (ChannelCode değil, kullanıcı adı/şifre).
 * Stoplight: /docs/travelrobot/bfcf3b45cb1c9-login
 * opts: { username, password, languageCode }
 */
export async function login(cfg, opts = {}) {
  return kplusPost(cfg.baseUrl, '/General.svc/Rest/Json/Login', {
    request: {
      UserName: opts.username,
      Password: opts.password,
      LanguageCode: opts.languageCode ?? 'tr',
    },
  })
}

// ─── TUR ──────────────────────────────────────────────────────────────────────

/**
 * Tur listesi — import / katalog için kullanılır.
 * opts: { startDate, endDate, languageCode }
 */
export async function searchTours(cfg, tokenCode, opts = {}) {
  return kplusPost(cfg.baseUrl, '/Tour.svc/Rest/Json/SearchTour', {
    filter: {
      Token: tokenObj(tokenCode),
      SearchType: 0,
      SearchValues: null,
      StartDate: opts.startDate || formatDate(addDays(30)),
      EndDate: opts.endDate || formatDate(addDays(395)),
      AdvancedOptions: {
        Tour: { OnRequest: true },
        ProviderType: 0,
        PriceCalculationType: 0,
        SearchModuleType: 0,
        MaxResponseTime: 0,
        LanguageCode: opts.languageCode ?? 'tr',
      },
    },
  }, { timeoutMs: opts.timeoutMs })
}

/**
 * Tur detayı — belirli bir tur kodu için tam bilgi.
 * DetailTypes: 0=Genel, 1=Program, 2=Dahilolmayanlar, 3=Dahilolanlar,
 *   4=Önemlinotlar, 5=Fiyatnotları, 6=Görseller, 7=Belgeler, 10=Kalkışnoktaları
 */
export async function getTourDetails(cfg, tokenCode, tourCode, opts = {}) {
  return kplusPost(
    cfg.baseUrl,
    '/Tour.svc/Rest/Json/GetTourDetails',
    {
      request: {
        TourCode: tourCode,
        Token: tokenObj(tokenCode),
        DetailTypes: opts.detailTypes ?? [0, 1, 2, 3, 4, 5, 6, 7, 10],
        LanguageCode: opts.languageCode ?? 'tr',
      },
    },
    { timeoutMs: opts.timeoutMs },
  )
}

/**
 * Tur fiyatları — belirli tarih + oda/kişi kombinasyonu için fiyatlar.
 * opts: { tourAlternativeCode, nationalityCode, departureDate, departurePointCode,
 *          rooms: [{ index, paxes: [{ paxType, count, childAgeList }] }],
 *          languageCode }
 */
export async function getTourPrices(cfg, tokenCode, opts = {}) {
  const hotpointType = opts.hotpointType ?? opts.departureHotpointType ?? 0
  return kplusPost(cfg.baseUrl, '/Tour.svc/Rest/Json/GetTourPrices', {
    request: {
      Id: opts.id ?? opts.packageId ?? null,
      Token: tokenObj(tokenCode),
      TourAlternativeCode: opts.tourAlternativeCode ?? null,
      NationalityCode: opts.nationalityCode ?? 'TR',
      DepartureDate: opts.departureDate ?? null,
      DeparturePoint: opts.departurePointCode
        ? { Code: opts.departurePointCode, HotpointType: hotpointType }
        : { Code: null, HotpointType: hotpointType },
      Locations: opts.locations ?? null,
      ArrivalPoint: opts.arrivalPointCode
        ? { Code: opts.arrivalPointCode, HotpointType: 0 }
        : null,
      Rooms: opts.rooms ?? [
        { Index: 0, Paxes: [{ PaxType: 0, Count: 2, ChildAgeList: null }] },
      ],
      AdvancedOptions: {
        Tour: { OnRequest: true },
        ProviderType: 0,
        PriceCalculationType: 0,
        SearchModuleType: 0,
        MaxResponseTime: 0,
        LanguageCode: opts.languageCode ?? 'tr',
      },
    },
  }, { timeoutMs: opts.timeoutMs })
}

/**
 * Tur ekstraları — pakete dahil edilebilecek ek hizmetler.
 * opts: { packageId, productType, languageCode, operationType, resultKeys }
 */
export async function getTourExtras(cfg, tokenCode, opts = {}) {
  return kplusPost(cfg.baseUrl, '/Tour.svc/Rest/Json/GetTourExtras', {
    request: {
      Token: tokenObj(tokenCode),
      PackageId: opts.packageId,
      ProductType: opts.productType ?? 2,
      ProductCode: null,
      LanguageCode: opts.languageCode ?? 'tr',
      OperationType: opts.operationType ?? 0,
      ResultKeys: opts.resultKeys ?? null,
    },
  }, { timeoutMs: opts.timeoutMs })
}

/**
 * Tur nihai fiyatı — ekstralar ve kalkış noktası seçiminden sonra.
 * opts: { packageId, productType, resultKeys, rooms, additionalServices }
 */
export async function getTourFinalPrice(cfg, tokenCode, opts = {}) {
  // Gerçek şema (Tour.json /GetTourFinalPrice + Postman):
  //   request.{ Token, PackageId, TourRooms:[{ BedType, Paxes:[{TourPaxType}], AdditionalServices }], AdditionalServices }
  return kplusPost(cfg.baseUrl, '/Tour.svc/Rest/Json/GetTourFinalPrice', {
    request: {
      Token: tokenObj(tokenCode),
      PackageId: opts.packageId,
      TourRooms: opts.tourRooms ?? opts.rooms ?? [
        { BedType: 0, Paxes: [{ TourPaxType: 0 }, { TourPaxType: 0 }], AdditionalServices: [] },
      ],
      AdditionalServices: opts.additionalServices ?? [],
    },
  }, { timeoutMs: opts.timeoutMs })
}

/**
 * Kalkış noktaları — transferin başladığı otobüs / havalimanı noktaları.
 * opts: { packageId, productType, orderId, languageCode, resultKeys }
 */
export async function getPickupPoints(cfg, tokenCode, opts = {}) {
  return kplusPost(cfg.baseUrl, '/Tour.svc/Rest/Json/GetPickupPoints', {
    request: {
      Token: tokenObj(tokenCode),
      PackageId: opts.packageId,
      ProductType: opts.productType ?? 2,
      OrderId: opts.orderId ?? 0,
      ProductCode: null,
      LanguageCode: opts.languageCode ?? 'tr',
      OperationType: opts.operationType ?? 0,
      ResultKeys: opts.resultKeys ?? null,
    },
  })
}

/**
 * Tur rezervasyonu — tam yolcu + iletişim + fatura + ödeme bilgisi.
 *
 * opts: {
 *   tokenCode, productType, version,
 *   tourRoomPaxes: [{ bedType, paxes: [{ isLeader, tourPaxType, pax: { firstName, lastName, ... } }] }],
 *   contactInfo: { firstName, lastName, phone, email, genderType },
 *   invoiceInfo: { invoiceInfoType, companyName, cityCode, address, postalCode, ... },
 *   resultKeys: [ "packageId|..." ],
 *   paymentInfo: { paymentItemId, paymentType, cardInfo?: { ... } },
 *   languageCode, bookingNote
 * }
 */
function formatTourBookPaymentInfo(payment) {
  if (!payment) return undefined
  const out = {
    PaymentType: payment.PaymentType != null ? Number(payment.PaymentType) : undefined,
    PaymentItemId: payment.PaymentItemId != null ? String(payment.PaymentItemId) : undefined,
    PaymentCommissionType: payment.PaymentCommissionType ?? 0,
  }
  if (payment.CardInfo) out.CardInfo = payment.CardInfo
  return omitNullFields(out)
}

/** GetTourFinalPrice yanıtında yalnız |254 varyant anahtarları mı? */
export function isTourSessionVariantOnlyKeys(keys) {
  const list = (keys ?? []).map((k) => String(k ?? '').trim()).filter(Boolean)
  if (!list.length) return false
  return list.every(isTourSessionVariantBookKey)
}

/** GetTourFinalPrice Contracts → BookTour ExtraInfo adayı. */
export function pickTourBookExtraInfoFromFinalPrice(finalPricePayload) {
  const r = finalPricePayload?.Result ?? finalPricePayload?.result ?? {}
  const contracts = r?.Contracts ?? r?.contracts ?? []
  if (!Array.isArray(contracts) || !contracts.length) return null
  return {
    Contracts: contracts.map((c, i) => ({
      Index: i,
      Accepted: true,
      ProductType: c.ProductType ?? c.productType ?? 2,
    })),
  }
}

/** Contracts + GetPickupPoints → BookTour ExtraInfo. */
export function buildTourBookExtraInfo(finalPricePayload, pickupPayload = null) {
  const contracts = pickTourBookExtraInfoFromFinalPrice(finalPricePayload)
  const pickupRef = pickupPayload ? pickTourPickupPointRef(pickupPayload) : null
  if (!contracts && !pickupRef) return null
  const out = { ...(contracts ?? {}) }
  if (pickupRef?.code) {
    out.PickupPoints = [{ Code: pickupRef.code, Selected: true }]
  }
  return out
}

/** GetTourFinalPrice / BookTour — kalkış noktası AdditionalServices. */
export function buildTourPickupAdditionalServices(pickupRef, format = 'code') {
  if (!pickupRef) return []
  const code = String(pickupRef.code ?? pickupRef.id ?? '').trim()
  if (!code) return []
  if (format === 'id') return [{ Id: code }]
  return [{ Code: code }]
}

/** BookTour TourRoomPaxes — pickup AdditionalServices ekle. */
export function applyTourPickupToRoomPaxes(tourRoomPaxes, pickupRef, format = 'code') {
  const services = buildTourPickupAdditionalServices(pickupRef, format)
  if (!services.length) return tourRoomPaxes
  return (tourRoomPaxes ?? []).map((room) => ({
    ...room,
    AdditionalServices: services,
  }))
}

/** GetTourFinalPrice sonrası BookTour ResultKeys — yalın oturum pipe (|254 değil). */
export function pickTourSessionBookKey(sessionRawId, finalPricePackageId = null) {
  const session = String(sessionRawId ?? '').trim()
  if (session && isPlausibleTourBookKey(session) && !isTourSessionVariantBookKey(session)) {
    return session
  }
  const pkg = String(finalPricePackageId ?? '').trim()
  if (pkg && isTourSessionVariantBookKey(pkg)) {
    const bare = pkg.replace(/\|\d{1,5}$/, '')
    if (bare && isPlausibleTourBookKey(bare)) return bare
  }
  return session || null
}

/** BookTour gövde PackageId — TFP# oturum kimliği ve pipe anahtarları. */
export function isPlausibleTourBookPackageId(id, opts = {}) {
  const s = String(id ?? '').trim()
  if (!s || isTourCatalogCode(s) || isTourDisplayTitle(s)) return false
  if (opts.allowBareUuid === true && isBareUuid(s)) return true
  if (/^TFP#/i.test(s)) return true
  if (isPlausibleTourBookKey(s)) return true
  return false
}

function filterTourBookResultKeys(keys, opts = {}) {
  return (keys ?? [])
    .map((k) => String(k ?? '').trim())
    .filter((s) => {
      if (!s) return false
      if (isPlausibleTourBookKey(s)) return true
      if (opts.allowBareUuid === true && isBareUuid(s)) return true
      if (opts.allowTfpSession === true && /^TFP#/i.test(s)) return true
      if (opts.allowTfpSession === true && s.includes('TFP#')) return true
      return false
    })
}

/** GetTourFinalPrice sonrası book referansları (UUID / Result.Id / pipe). */
export function pickTourFinalPriceBookRefs(finalPricePayload, sessionRaw, lockedPkg = null) {
  const r = finalPricePayload?.Result ?? finalPricePayload?.result ?? {}
  const finalResultId = String(r.Id ?? r.id ?? '').trim() || null
  const tourFinalReq = r.TourFinalPriceRequest ?? r.tourFinalPriceRequest ?? {}
  const reqPkgId = String(tourFinalReq.PackageId ?? tourFinalReq.packageId ?? '').trim() || null
  const packagePrice = r.PackagePrice ?? r.packagePrice ?? {}
  const packagePriceKey = String(
    packagePrice.ResultKey ??
      packagePrice.resultKey ??
      packagePrice.Key ??
      packagePrice.key ??
      packagePrice.PackageId ??
      packagePrice.packageId ??
      '',
  ).trim() || null
  const processId =
    tourFinalReq.ProcessId ??
    tourFinalReq.processId ??
    r.ProcessId ??
    r.processId ??
    null
  const sessionBookKey = pickTourSessionBookKey(sessionRaw, lockedPkg)
  const sessionUuid =
    extractTourSessionUuid(sessionRaw) ??
    extractTourSessionUuid(sessionBookKey) ??
    extractTourSessionUuid(lockedPkg)
  return {
    finalResultId,
    reqPkgId,
    packagePriceKey,
    processId,
    sessionUuid,
    sessionBookKey,
    lockedPkg,
  }
}

export function buildTourBookRequest(opts = {}) {
  const keyOpts = {
    allowBareUuid: opts.allowBareUuid === true,
    allowTfpSession: opts.allowTfpSession === true,
  }
  const resultKeys = filterTourBookResultKeys(opts.resultKeys, keyOpts)
  const packageInBody =
    opts.packageIdInBody === true &&
    opts.packageId != null &&
    isPlausibleTourBookPackageId(opts.packageId, keyOpts)
  const keepResultKeys = packageInBody && opts.packageIdWithResultKeys === true
  const request = omitNullFields({
    ProcessId: opts.processId != null ? String(opts.processId) : null,
    Version: opts.version ?? '2.0',
    ProductType: opts.productType ?? 2,
    TokenCode: opts.useTokenObject === true ? undefined : opts.tokenCode,
    Token: opts.useTokenObject === true ? tokenObj(opts.tokenCode) : undefined,
    PackageId: packageInBody ? String(opts.packageId).trim() : undefined,
    PaxInfo: {
      HotelRoomPaxes: null,
      FlightPaxes: null,
      CarPax: null,
      TourRoomPaxes: opts.tourRoomPaxes ?? [],
      TransferPaxes: null,
      PackagePaxes: null,
      VisaPaxes: null,
      ActivityPaxes: null,
    },
    ExtraInfo: opts.extraInfo ?? null,
    ContactInfo: opts.contactInfo,
    InvoiceInfo: opts.invoiceInfo,
    CorporateInfo: null,
    BookingNote: opts.bookingNote ?? null,
    AgentReferenceInfo: opts.agentReferenceInfo ?? null,
    CorporatePin: null,
    ResultKeys: packageInBody && !keepResultKeys ? undefined : resultKeys.length ? resultKeys : undefined,
    PaymentInfo: formatTourBookPaymentInfo(opts.paymentInfo),
    ExtraNote: null,
    SystemPnr: null,
    LastName: null,
    LanguageCode: opts.languageCode ?? 'tr',
    WithPrice: opts.withPrice === true,
  })
  return { request }
}

/** GetTourFinalPrice yanıtından BookTour PackageId / ResultKeys adayları. */
export function pickTourBookIdsFromFinalPricePayload(finalPricePayload, lockedPkg = null) {
  const r = finalPricePayload?.Result ?? finalPricePayload?.result ?? {}
  let packageId = null
  const resultKeys = []
  const pushKey = (k) => {
    const s = String(k ?? '').trim()
    if (!s || resultKeys.includes(s)) return
    if (isPlausibleTourBookKey(s) || isBareUuid(s) || /^TFP#/i.test(s)) resultKeys.push(s)
  }
  const pushPkg = (k) => {
    const s = String(k ?? '').trim()
    if (!s) return
    if (isPlausibleTourBookPackageId(s, { allowBareUuid: true })) packageId = packageId ?? s
  }
  for (const f of ['PackageId', 'packageId', 'Id', 'id', 'ResultKey', 'resultKey', 'SearchId', 'searchId']) {
    const v = r[f]
    if (v == null) continue
    pushPkg(v)
    pushKey(v)
  }
  if (lockedPkg) pushKey(lockedPkg)
  return { packageId, resultKeys }
}

/** BookTour gövde varyantları — finalPriceLocked: UUID ResultKeys önce. */
export function buildTourBookRequestVariants(opts = {}) {
  const sessionRaw = String(
    opts.sessionRawId ?? pickTourPricesSessionRawId(opts.pricePayload) ?? '',
  ).trim()
  const paymentSessionId = String(
    opts.paymentSessionId ??
      pickTourPaymentSessionId(opts.finalPricePayload, opts.pricePayload) ??
      '',
  ).trim()
  const rowKeys = collectTourBookKeys(
    opts.priceRow ?? null,
    opts.pricePayload ?? null,
    sessionRaw || null,
  ).filter(isStrictTourBookResultKey)
  const explicit = (opts.resultKeys ?? [])
    .map((k) => String(k ?? '').trim())
    .filter(isStrictTourBookResultKey)
  const unique = (explicit.length ? explicit : rowKeys)
    .filter((id, i, arr) => arr.indexOf(id) === i)
    .sort((a, b) => {
      const rank = (k) =>
        isTourSessionVariantBookKey(k) ? 0 : k.includes('@') || /^tour:/i.test(k) ? 1 : 2
      return rank(a) - rank(b)
    })
  const { resultKeys: _drop, ...base } = opts
  const variants = []
  const finalPriceLocked = opts.finalPriceLocked === true
  const lockedPkg = String(opts.finalPricePackageId ?? opts.packageId ?? '').trim()
  const pkgForBody = lockedPkg || String(opts.packageId ?? '').trim() || sessionRaw
  const pkgOnlyMode = opts.pkgOnlyMode === true
  const variant254 = unique.find((k) => isTourSessionVariantBookKey(k))
  const bookPkg =
    finalPriceLocked && isTourSessionVariantBookKey(lockedPkg)
      ? lockedPkg
      : isTourSessionVariantBookKey(pkgForBody)
        ? pkgForBody
        : (variant254 ?? pkgForBody)
  const sessionBookKey = pickTourSessionBookKey(sessionRaw, bookPkg)
  const contractsOnly = pickTourBookExtraInfoFromFinalPrice(opts.finalPricePayload)
  const extraWithPickup = buildTourBookExtraInfo(opts.finalPricePayload, opts.pickupPayload)
  const refs = pickTourFinalPriceBookRefs(opts.finalPricePayload, sessionRaw, bookPkg)
  const sessionKey = refs.sessionBookKey
  const tfpId = String(
    opts.tfpSessionId ?? refs.finalResultId ?? opts.paymentSessionId ?? '',
  ).trim() || null

  if (finalPriceLocked && bookPkg && isTourSessionVariantBookKey(bookPkg)) {
    const locked = []
    const push = (v) => locked.push({ ...base, ...v })
    const priceKey = String(refs.packagePriceKey ?? '').trim() || null

    if (priceKey) {
      push({
        label: 'resultKeys-priceKey',
        allowTfpSession: true,
        resultKeys: [priceKey],
        extraInfo: contractsOnly,
        roomPickupFormat: 'code',
      })
      push({
        label: 'pkgPriceKey+contract',
        packageIdInBody: true,
        packageId: priceKey,
        allowTfpSession: true,
        resultKeys: [],
        extraInfo: contractsOnly,
        skipRoomPickup: true,
      })
      push({
        label: 'pkgPriceKey+pickup',
        packageIdInBody: true,
        packageId: priceKey,
        allowTfpSession: true,
        resultKeys: [],
        extraInfo: contractsOnly,
        roomPickupFormat: 'code',
      })
      push({
        label: 'pkgPriceKey+price',
        packageIdInBody: true,
        packageId: priceKey,
        allowTfpSession: true,
        resultKeys: [],
        withPrice: true,
        extraInfo: contractsOnly,
        roomPickupFormat: 'code',
      })
    }
    if (tfpId && /^TFP#/i.test(tfpId)) {
      push({
        label: 'pkg254+tfp+pickup',
        packageIdInBody: true,
        packageId: bookPkg,
        allowTfpSession: true,
        packageIdWithResultKeys: true,
        resultKeys: [tfpId],
        extraInfo: contractsOnly,
        roomPickupFormat: 'code',
      })
    }
    variants.push(...locked)
    return variants.map(({ label, ...bookOpts }) => ({ label, ...bookOpts }))
  }

  if (bookPkg && isPlausibleTourBookKey(bookPkg)) {
    const pkgOnly254 = {
      label: isTourSessionVariantBookKey(bookPkg) ? 'pkgOnly254' : 'pkgOnly',
      ...base,
      packageIdInBody: true,
      packageId: bookPkg,
      resultKeys: [],
    }
    if (finalPriceLocked) {
      variants.push(pkgOnly254)
      if (extraInfo) {
        variants.push({
          label: 'pkgOnly+contract',
          ...base,
          packageIdInBody: true,
          packageId: bookPkg,
          resultKeys: [],
          extraInfo,
        })
      }
    } else {
      const front = [
        pkgOnly254,
        {
          label: 'pkgOnly+price',
          ...base,
          packageIdInBody: true,
          packageId: bookPkg,
          resultKeys: [],
          withPrice: true,
        },
      ]
      if (extraInfo) {
        front.push({
          label: 'pkgOnly+contract',
          ...base,
          packageIdInBody: true,
          packageId: bookPkg,
          resultKeys: [],
          extraInfo,
        })
        front.push({
          label: 'pkgOnly+contract+price',
          ...base,
          packageIdInBody: true,
          packageId: bookPkg,
          resultKeys: [],
          withPrice: true,
          extraInfo,
        })
      }
      variants.push(...front)
    }
  }

  if (pkgOnlyMode || !unique.length || finalPriceLocked) {
    return variants.map(({ label, ...bookOpts }) => ({ label, ...bookOpts }))
  }

  for (let i = 0; i < Math.min(unique.length, 3); i++) {
    variants.push({
      label: i === 0 ? 'resultKeys-1' : `resultKeys-alt${i}`,
      ...base,
      resultKeys: [unique[i]],
    })
  }
  if (unique.length > 1) {
    variants.push({ label: 'resultKeys-all', ...base, resultKeys: unique.slice(0, 2) })
  }
  if (pkgForBody && isPlausibleTourBookKey(pkgForBody)) {
    for (let i = 0; i < Math.min(unique.length, 2); i++) {
      variants.push({
        label: `pkgBody+key${i}`,
        ...base,
        packageIdInBody: true,
        packageIdWithResultKeys: true,
        packageId: pkgForBody,
        resultKeys: [unique[i]],
      })
    }
  }
  return variants.map(({ label, ...bookOpts }) => ({ label, ...bookOpts }))
}

export async function bookTour(cfg, opts = {}) {
  const body = buildTourBookRequest(opts)
  return kplusPost(cfg.baseUrl, '/Tour.svc/Rest/Json/BookTour', body, {
    timeoutMs: opts.timeoutMs,
    noThrowOnHasError: opts.softErrors === true,
  })
}

/**
 * Tur için ödeme seçenekleri — rezervasyon öncesi.
 * Stoplight: /docs/travelrobot/5q2x1mg7ulzbg-payment-options
 * opts: { packageId, languageCode }
 */
export async function getTourPaymentOptions(cfg, tokenCode, opts = {}) {
  const request = {
    Token: tokenObj(tokenCode),
    LanguageCode: opts.languageCode ?? 'tr',
  }
  const keys = opts.resultKeys ?? (opts.resultKey ? [opts.resultKey] : [])
  if (Array.isArray(keys) && keys.length) request.ResultKeys = keys.map(String)
  if (opts.packageId != null && String(opts.packageId).trim()) {
    request.PackageId = String(opts.packageId).trim()
  }
  return kplusPost(cfg.baseUrl, '/Tour.svc/Rest/Json/GetPaymentOptions', { request })
}

export async function getTourPaymentOptionsSoft(cfg, tokenCode, opts = {}) {
  try {
    return { ok: true, payload: await getTourPaymentOptions(cfg, tokenCode, opts) }
  } catch (e) {
    return { ok: false, error: String(e) }
  }
}

export function pickTourRows(payload) {
  const p = payload?.Result ?? payload?.result ?? payload
  if (Array.isArray(p)) return p
  if (!p || typeof p !== 'object') return []
  for (const k of ['SearchResult', 'searchResult', 'Tours', 'tours', 'Items', 'items', 'SearchResults', 'searchResults']) {
    if (Array.isArray(p[k])) return p[k]
  }
  // Bazen SearchResult tek nesne döner
  if (p.SearchResult && typeof p.SearchResult === 'object' && !Array.isArray(p.SearchResult)) {
    return [p.SearchResult]
  }
  return []
}

export function tourRowCode(row) {
  const nested = row?.Tour ?? row?.tour
  return String(
    row?.TourCode ??
      row?.tourCode ??
      row?.TourAlternativeCode ??
      row?.tourAlternativeCode ??
      nested?.Code ??
      nested?.code ??
      row?.ProductCode ??
      '',
  ).trim()
}

export function tourRowAlternativeCode(row) {
  return String(
    row?.TourAlternativeCode ??
      row?.tourAlternativeCode ??
      row?.AlternativeCode ??
      row?.alternativeCode ??
      '',
  ).trim()
}

function tourDepartureDateFromRow(row) {
  return normalizeTourDepartureDate(
    row?.DepartureDate ??
      row?.departureDate ??
      row?.StartDate ??
      row?.startDate ??
      row?.TourDate ??
      row?.tourDate ??
      '',
  )
}

/** GetTourPrices / GetTourFinalPrice — DD.MM.YYYY veya ISO datetime → YYYY-MM-DD. */
export function normalizeTourDepartureDate(raw) {
  const s = String(raw ?? '').trim()
  if (!s) return ''
  const ms = /\/Date\((-?\d+)\)\//.exec(s)
  if (ms) {
    const d = new Date(Number(ms[1]))
    if (!Number.isNaN(d.getTime())) {
      const yyyy = d.getUTCFullYear()
      const mm = String(d.getUTCMonth() + 1).padStart(2, '0')
      const dd = String(d.getUTCDate()).padStart(2, '0')
      return `${yyyy}-${mm}-${dd}`
    }
  }
  if (/^\d{4}-\d{2}-\d{2}T/.test(s)) return s.slice(0, 10)
  const dot = /^(\d{2})\.(\d{2})\.(\d{4})$/.exec(s)
  if (dot) return `${dot[3]}-${dot[2]}-${dot[1]}`
  const slash = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(s)
  if (slash) return `${slash[3]}-${slash[2]}-${slash[1]}`
  const compact = /^(\d{4})(\d{2})(\d{2})$/.exec(s)
  if (compact) return `${compact[1]}-${compact[2]}-${compact[3]}`
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s
  return ''
}

/** GetTourPrices DepartureDate — KPlus DD.MM.YYYY bekler. */
export function formatTourApiDate(raw) {
  const iso = normalizeTourDepartureDate(raw)
  if (!iso) return ''
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso)
  if (!m) return ''
  return `${m[3]}.${m[2]}.${m[1]}`
}

/** Cert/debug — attempt'te tarih yoksa denenecek gün ofsetleri. */
export const TOUR_PRICE_DATE_OFFSETS = [30, 45, 60, 90, 120, 150]

/** GetTourPrices Result.Id sonundaki oturum UUID (pipe birleşik anahtardan). */
export function extractTourSessionUuid(raw) {
  const s = String(raw ?? '').trim()
  if (!s) return null
  const m = /([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i.exec(s)
  return m ? m[1] : null
}

function tourDeparturePointFromRow(row) {
  return String(
    row?.DeparturePointCode ??
      row?.departurePointCode ??
      row?.DeparturePoint?.Code ??
      row?.departurePoint?.code ??
      '',
  ).trim()
}

function pushTourPriceAttempt(attempts, seen, attempt) {
  const alt = String(attempt.tourAlternativeCode ?? '').trim()
  const pkg = attempt.packageId != null ? String(attempt.packageId).trim() : ''
  const date = String(attempt.departureDate ?? '').trim()
  const dep = String(attempt.departurePointCode ?? '').trim()
  if (!alt && !pkg) return
  const key = `${alt}|${pkg}|${date}|${dep}`
  if (seen.has(key)) return
  seen.add(key)
  attempts.push({
    tourAlternativeCode: alt || null,
    packageId: pkg || null,
    departureDate: date || null,
    departurePointCode: dep || null,
    source: attempt.source ?? 'unknown',
  })
}

function walkTourAltArrays(node, visit) {
  if (!node || typeof node !== 'object') return
  if (Array.isArray(node)) {
    for (const item of node) walkTourAltArrays(item, visit)
    return
  }
  visit(node)
  for (const k of [
    'TourAlternatives',
    'tourAlternatives',
    'Alternatives',
    'alternatives',
    'Periods',
    'periods',
    'TourPeriods',
    'tourPeriods',
    'Prices',
    'prices',
    'Packages',
    'packages',
    'Items',
    'items',
    'SearchResults',
    'searchResults',
  ]) {
    if (Array.isArray(node[k])) {
      for (const item of node[k]) visit(item)
    }
  }
}

/** SearchTour / GetTourDetails satırından GetTourPrices denemeleri. */
export function collectTourPriceAttemptsFromRow(searchRow) {
  const attempts = []
  const seen = new Set()
  const tour = searchRow?.Tour ?? searchRow?.tour ?? null
  const tourCode = tourRowCode(searchRow)

  pushTourPriceAttempt(attempts, seen, {
    tourAlternativeCode: tourRowAlternativeCode(searchRow) || tourCode || null,
    packageId: pickTourPackageId(searchRow),
    departureDate: tourDepartureDateFromRow(searchRow),
    departurePointCode: tourDeparturePointFromRow(searchRow),
    source: 'search-top',
  })

  walkTourAltArrays(searchRow, (alt) => {
    pushTourPriceAttempt(attempts, seen, {
      tourAlternativeCode:
        alt?.TourAlternativeCode ??
        alt?.tourAlternativeCode ??
        alt?.Code ??
        alt?.code ??
        alt?.AlternativeCode ??
        alt?.alternativeCode ??
        tourCode ??
        null,
      packageId: pickTourPackageId(alt),
      departureDate: tourDepartureDateFromRow(alt),
      departurePointCode: tourDeparturePointFromRow(alt),
      source: 'search-nested',
    })
  })

  if (tour) {
    walkTourAltArrays(tour, (alt) => {
      pushTourPriceAttempt(attempts, seen, {
        tourAlternativeCode:
          alt?.TourAlternativeCode ??
          alt?.tourAlternativeCode ??
          alt?.Code ??
          alt?.code ??
          tourCode ??
          null,
        packageId: pickTourPackageId(alt),
        departureDate: tourDepartureDateFromRow(alt),
        departurePointCode: tourDeparturePointFromRow(alt),
        source: 'tour-nested',
      })
    })
  }

  return attempts
}

export function collectTourPriceAttemptsFromDetails(detailsPayload) {
  const attempts = []
  const seen = new Set()
  const r = detailsPayload?.Result ?? detailsPayload?.result ?? {}
  const tour = r?.Tour ?? r?.tour ?? r
  const tourCode = tourRowCode({ Tour: tour, TourCode: r?.TourCode ?? tour?.Code })

  walkTourAltArrays(r, (alt) => {
    pushTourPriceAttempt(attempts, seen, {
      tourAlternativeCode:
        alt?.TourAlternativeCode ??
        alt?.tourAlternativeCode ??
        alt?.Code ??
        alt?.code ??
        tourCode ??
        null,
      packageId: pickTourPackageId(alt),
      departureDate: tourDepartureDateFromRow(alt),
      departurePointCode: tourDeparturePointFromRow(alt),
      source: 'details-nested',
    })
  })

  const depPoints = r?.DeparturePoints ?? r?.departurePoints ?? tour?.DeparturePoints ?? tour?.departurePoints ?? []
  if (Array.isArray(depPoints) && depPoints.length && attempts.length) {
    for (const a of attempts) {
      if (!a.departurePointCode) {
        a.departurePointCode = String(depPoints[0]?.Code ?? depPoints[0]?.code ?? '').trim() || null
      }
    }
  }

  if (!attempts.length && tourCode) {
    pushTourPriceAttempt(attempts, seen, {
      tourAlternativeCode: tourCode,
      packageId: pickTourPackageId(r),
      departureDate: tourDepartureDateFromRow(r),
      departurePointCode: tourDeparturePointFromRow(r),
      source: 'details-top',
    })
  }

  return attempts
}

export async function resolveTourPriceAttempts(cfg, tokenCode, searchRow, opts = {}) {
  let attempts = collectTourPriceAttemptsFromRow(searchRow)
  const hasBookableAlt = attempts.some((a) => a.tourAlternativeCode || a.packageId)
  const tourCode = tourRowCode(searchRow)

  if (
    !opts.skipTourDetails &&
    (!hasBookableAlt || attempts.every((a) => !a.tourAlternativeCode)) &&
    tourCode
  ) {
    try {
      const details = await getTourDetails(cfg, tokenCode, tourCode, {
        languageCode: opts.languageCode ?? 'tr',
        detailTypes: opts.detailTypes ?? [0, 1, 5, 10],
        timeoutMs: opts.timeoutMs,
      })
      attempts = [...attempts, ...collectTourPriceAttemptsFromDetails(details)]
    } catch {
      /* details opsiyonel */
    }
  }

  const seen = new Set()
  const out = []
  for (const a of attempts) {
    const key = `${a.tourAlternativeCode ?? ''}|${a.packageId ?? ''}|${a.departureDate ?? ''}|${a.departurePointCode ?? ''}`
    if (seen.has(key)) continue
    seen.add(key)
    out.push(a)
  }
  return out
}

/** GetTourPrices istek varyantları — sandbox'ta hangi kombinasyon tutarsa. */
export function buildTourPriceRequestVariants(attempt, departureDate, priceRooms, languageCode = 'tr') {
  const alt = attempt.tourAlternativeCode ? String(attempt.tourAlternativeCode).trim() : null
  const pkg = attempt.packageId ? String(attempt.packageId).trim() : null
  const dep = attempt.departurePointCode ? String(attempt.departurePointCode).trim() : null
  const date = formatTourApiDate(attempt.departureDate || departureDate)
  if (!date) return []
  const base = { departureDate: date, rooms: priceRooms, languageCode }
  const variants = []
  const push = (v) => {
    if (!v.departureDate) return
    const key = JSON.stringify(v)
    if (!variants.some((x) => JSON.stringify(x) === key)) variants.push(v)
  }

  if (alt) {
    push({ ...base, tourAlternativeCode: alt, nationalityCode: 'TR', departurePointCode: dep ?? undefined })
    push({ ...base, tourAlternativeCode: alt, nationalityCode: 'TR', departurePointCode: dep ?? undefined, hotpointType: 1 })
    push({ ...base, tourAlternativeCode: alt, nationalityCode: null, departurePointCode: dep ?? undefined })
  }
  if (pkg) {
    push({ ...base, id: pkg, tourAlternativeCode: alt, nationalityCode: 'TR', departurePointCode: dep ?? undefined })
    push({ ...base, tourAlternativeCode: pkg, nationalityCode: 'TR', departurePointCode: dep ?? undefined })
  }
  if (!variants.length && alt) {
    push({ ...base, tourAlternativeCode: alt, nationalityCode: 'TR' })
  }
  return variants
}

/** GetTourPrices — oda/kişi sayısı (Hotel SearchRooms benzeri). */
export function buildTourPriceRooms(roomOpts) {
  const rooms = Array.isArray(roomOpts) ? roomOpts : [roomOpts]
  return rooms.map((room, index) => {
    const adults = Number(room.Adults ?? room.adults ?? 2)
    const children = Number(room.Children ?? room.children ?? 0)
    const childAges = Array.isArray(room.ChildAges) ? room.ChildAges : room.childAges ?? []
    const paxes = []
    if (adults > 0) paxes.push({ PaxType: 0, Count: adults, ChildAgeList: null })
    if (children > 0) paxes.push({ PaxType: 1, Count: children, ChildAgeList: childAges })
    return { Index: Number(room.RoomIndex ?? room.Index ?? index), Paxes: paxes }
  })
}

export function pickTourPriceRows(payload) {
  if (payload?.HasError) return []
  const r = payload?.Result ?? payload?.result ?? payload
  if (!r || typeof r !== 'object') return []
  if (Array.isArray(r)) return r.filter((x) => x && typeof x === 'object')

  for (const k of [
    'TourPrices',
    'tourPrices',
    'Prices',
    'prices',
    'Alternatives',
    'alternatives',
    'Items',
    'items',
    'Packages',
    'packages',
    'TourRooms',
    'tourRooms',
    'RoomPrices',
    'roomPrices',
  ]) {
    if (Array.isArray(r[k]) && r[k].length) return r[k]
  }

  const roomRows = []
  for (const room of r.Rooms ?? r.rooms ?? []) {
    for (const alt of room?.RoomAlternatives ?? room?.roomAlternatives ?? []) {
      roomRows.push(alt)
    }
  }
  if (roomRows.length) return roomRows

  if (pickTourPackageId(r) || r?.TourAlternativeCode || r?.tourAlternativeCode) {
    return [r]
  }

  return []
}

export function pickTourPackageId(row, fallback = null) {
  return (
    row?.PackageId ??
    row?.packageId ??
    row?.Id ??
    row?.id ??
    row?.ResultKey ??
    row?.resultKey ??
    fallback
  )
}

/** GetTourPrices yanıtındaki ham oturum Id (pipe birleşik olabilir). */
export function pickTourPricesSessionRawId(pricePayload) {
  const r = pricePayload?.Result ?? pricePayload?.result ?? pricePayload
  if (!r || typeof r !== 'object') return null
  for (const field of ['Id', 'id', 'PackageId', 'packageId', 'SearchId', 'searchId']) {
    const v = r[field]
    if (v != null && String(v).trim()) return String(v).trim()
  }
  return null
}

/** @deprecated pickTourPricesSessionRawId — geriye uyumluluk */
export function pickTourPricesSessionPackageId(pricePayload) {
  return pickTourPricesSessionRawId(pricePayload)
}

/** GetTourPrices yanıtındaki üst PackageId / ResultKey. */
export function pickTourPriceContextPackageId(pricePayload) {
  return pickTourPricesSessionPackageId(pricePayload)
}

/** Otel RoomCode benzeri — GetTourPrices satırından book anahtarı. */
export function pickTourRoomBookKeys(priceRow, pricePayload = null) {
  const keys = []
  const push = (k, priority = 50) => {
    const s = String(k ?? '').trim()
    if (!s || keys.some((x) => x.id === s)) return
    keys.push({ id: s, priority })
  }

  const walk = (node, depth = 0) => {
    if (!node || typeof node !== 'object' || depth > 7) return
    if (Array.isArray(node)) {
      for (const item of node) walk(item, depth + 1)
      return
    }
    push(node.RoomCode ?? node.roomCode, 0)
    push(node.Key ?? node.key, 1)
    push(node.OfferId ?? node.offerId, 2)
    push(node.TourRoomCode ?? node.tourRoomCode, 3)
    const code = node.Code ?? node.code
    if (code != null && isPlausibleTourBookKey(code)) push(code, 4)
    push(node.ResultKey ?? node.resultKey, 5)
    push(node.PackageId ?? node.packageId, 10)
    for (const k of [
      'TourRooms',
      'tourRooms',
      'Rooms',
      'rooms',
      'RoomAlternatives',
      'roomAlternatives',
      'Alternatives',
      'alternatives',
      'TourPrices',
      'tourPrices',
    ]) {
      if (Array.isArray(node[k])) for (const item of node[k]) walk(item, depth + 1)
    }
  }

  walk(priceRow)
  if (pricePayload) walk(pricePayload?.Result ?? pricePayload?.result)
  return keys
    .sort((a, b) => a.priority - b.priority)
    .map((x) => x.id)
    .filter(isPlausibleTourBookKey)
    .filter((id, i, arr) => arr.indexOf(id) === i)
}

/** GetTourPrices yanıtından BookTour ResultKeys (GetTourFinalPrice atlanabilir). */
export function pickTourPriceBookKeys(priceRow, pricePayload = null, opts = {}) {
  const allowCatalog = opts.allowCatalogCodes === true
  const keys = []
  const push = (k) => {
    const s = String(k ?? '').trim()
    if (!s || keys.includes(s)) return
    if (!allowCatalog && !isPlausibleTourBookKey(s) && !isTourCatalogCode(s)) return
    if (!allowCatalog && isTourCatalogCode(s)) return
    keys.push(s)
  }

  for (const rk of pickTourRoomBookKeys(priceRow, pricePayload)) push(rk)

  const walk = (node, depth = 0) => {
    if (!node || typeof node !== 'object' || depth > 7) return
    if (Array.isArray(node)) {
      for (const item of node) walk(item, depth + 1)
      return
    }
    const rks = node.ResultKeys ?? node.resultKeys
    if (Array.isArray(rks)) rks.forEach(push)
    push(node.ResultKey ?? node.resultKey)
    const pkg = node.PackageId ?? node.packageId
    if (pkg != null) push(pkg)
    for (const v of Object.values(node)) {
      if (typeof v === 'string' && isPlausibleTourBookKey(v)) push(v)
    }
    for (const k of Object.keys(node)) {
      if (Array.isArray(node[k]) || (node[k] && typeof node[k] === 'object')) walk(node[k], depth + 1)
    }
  }

  walk(priceRow)
  if (pricePayload) walk(pricePayload?.Result ?? pricePayload?.result)
  if (allowCatalog) {
    push(priceRow?.TourAlternativeCode ?? priceRow?.tourAlternativeCode)
    const r = pricePayload?.Result ?? pricePayload?.result
    push(r?.TourAlternativeCode ?? r?.tourAlternativeCode)
    push(pickTourPricesSessionPackageId(pricePayload))
  }
  return keys
}

/** Yalnızca tam tur kodu (T66-1204-22669) — pipe oturum anahtarını eşleştirme. */
function isTourCatalogCode(id) {
  return /^T\d{2}-\d{4}-\d+$/i.test(String(id ?? '').trim())
}

function isTourSessionCompositeKey(id) {
  return /^T\d{2}-\d{4}-\d+\|/i.test(String(id ?? '').trim())
}

/** Oturum anahtarı + paket varyantı (ör. …|uuid|254) — BookTour ResultKeys adayı. */
export function isTourSessionVariantBookKey(id) {
  const s = String(id ?? '').trim()
  if (!isTourSessionCompositeKey(s)) return false
  const tail = s.split('|').pop() ?? ''
  if (!/^\d{1,5}$/.test(tail)) return false
  return s.length > tail.length + 1
}

/** İnsan okunur tur başlığı (ör. "Kapadokya | Balon Turu") — API anahtarı değil. */
function isTourDisplayTitle(id) {
  const s = String(id ?? '').trim()
  if (!s) return true
  if (/^tour:/i.test(s) || s.includes('@')) return false
  if (/^T\d{2}-\d{4}-\d+\|/i.test(s)) return false
  if (/\s\|\s/.test(s)) return true
  if (/\|\s*[A-Za-zÀ-ÿİıĞğÜüŞşÖöÇç]/.test(s) && /\s/.test(s)) return true
  return false
}

/** GetTourFinalPrice PackageId — tur kodu / başlık değil; oturum pipe anahtarı geçerli. */
function isPlausibleTourFinalPricePackageId(id) {
  const s = String(id ?? '').trim()
  if (!s || isTourCatalogCode(s) || isTourDisplayTitle(s)) return false
  if (isTourSessionCompositeKey(s)) return true
  if (s.includes('@')) return true
  if (/^tour:/i.test(s)) return true
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s)) return true
  if (!s.includes('|') && /^\d+$/.test(s)) return true
  return false
}

function isBareUuid(id) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(id ?? '').trim())
}

/** BookTour ResultKeys — oturum pipe anahtarı, tour:, @ RoomCode (yalın UUID değil). */
export function isPlausibleTourBookKey(id) {
  const s = String(id ?? '').trim()
  if (!s || isTourCatalogCode(s) || isTourDisplayTitle(s) || isBareUuid(s)) return false
  if (s.includes('@')) return true
  if (/^tour:/i.test(s)) return true
  if (isTourSessionCompositeKey(s)) return true
  if (s.includes('|') && /[0-9_]{2,}/.test(s) && !/\s\|\s/.test(s)) return true
  return false
}

/** BookTour ResultKeys — yalın oturum pipe değil; @ / tour: / …|254 paket varyantı OK. */
export function isStrictTourBookResultKey(id) {
  const s = String(id ?? '').trim()
  if (!s || !isPlausibleTourBookKey(s)) return false
  if (isTourSessionCompositeKey(s)) return isTourSessionVariantBookKey(s)
  return true
}

/** GetTourPrices satırı PackagePrices / ResultExp içinden book anahtarları. */
export function pickTourPackagePriceBookKeys(priceRow) {
  const keys = []
  const push = (k) => {
    const s = String(k ?? '').trim()
    if (s && isPlausibleTourBookKey(s) && !keys.includes(s)) keys.push(s)
  }
  const walk = (node, depth = 0) => {
    if (!node || typeof node !== 'object' || depth > 6) return
    if (Array.isArray(node)) {
      for (const item of node) walk(item, depth + 1)
      return
    }
    push(node.ResultKey ?? node.resultKey)
    push(node.RoomCode ?? node.roomCode)
    push(node.Key ?? node.key)
    for (const k of Object.keys(node)) {
      if (Array.isArray(node[k]) || (node[k] && typeof node[k] === 'object')) walk(node[k], depth + 1)
    }
  }
  for (const pkg of priceRow?.PackagePrices ?? priceRow?.packagePrices ?? []) walk(pkg)
  const exp = priceRow?.ResultExp ?? priceRow?.resultExp
  if (typeof exp === 'string' && isPlausibleTourBookKey(exp)) push(exp)
  return keys
}

/** BookTour için öncelikli anahtar listesi — |254 varyant önce, yalın oturum pipe en sonda. */
export function collectTourBookKeys(priceRow, pricePayload = null, sessionRawId = null) {
  const session = String(sessionRawId ?? pickTourPricesSessionRawId(pricePayload) ?? '').trim()
  const fromRow = [
    ...pickTourPackagePriceBookKeys(priceRow),
    ...pickTourPriceBookKeys(priceRow, pricePayload),
  ]
    .map((k) => String(k ?? '').trim())
    .filter(isPlausibleTourBookKey)

  const ordered = []
  for (const k of fromRow) {
    if (k === session) continue
    if (session && k.startsWith(`${session}|`)) ordered.push(k)
  }
  for (const k of fromRow) {
    if (!ordered.includes(k) && isStrictTourBookResultKey(k)) ordered.push(k)
  }
  if (session && isPlausibleTourBookKey(session)) ordered.push(session)
  return ordered.filter((id, i, arr) => arr.indexOf(id) === i)
}

export function pickTourVariantBookKeys(priceRow, pricePayload = null, sessionRawId = null) {
  return collectTourBookKeys(priceRow, pricePayload, sessionRawId).filter(isTourSessionVariantBookKey)
}

/** GetTourFinalPrice için aday PackageId listesi — tur kodundan önce ResultKey/tour:... */
export function collectTourFinalPricePackageIds(priceRow, ctx = {}) {
  const out = []
  const seen = new Set()
  const push = (v, priority = 50) => {
    const s = v != null ? String(v).trim() : ''
    if (!s || seen.has(s) || !isPlausibleTourFinalPricePackageId(s)) return
    seen.add(s)
    out.push({ id: s, priority })
  }

  const walk = (node, depth = 0) => {
    if (!node || typeof node !== 'object' || depth > 5) return
    if (Array.isArray(node)) {
      for (const item of node) walk(item, depth + 1)
      return
    }
    const rk = node.ResultKey ?? node.resultKey
    const pkg = node.PackageId ?? node.packageId
    const id = node.Id ?? node.id
    if (typeof rk === 'string' && rk.trim()) {
      push(rk.trim(), /^tour:/i.test(rk) ? 0 : 5)
    }
    if (pkg != null && String(pkg).trim()) {
      push(String(pkg).trim(), /^tour:/i.test(pkg) ? 1 : 10)
    }
    if (typeof id === 'string' && id.trim()) {
      push(id.trim(), /^tour:/i.test(id) ? 2 : 15)
    }
    for (const v of Object.values(node)) {
      if (typeof v === 'string' && /^tour:/i.test(v)) push(v.trim(), 0)
    }
    for (const k of [
      'Rooms',
      'rooms',
      'TourRooms',
      'tourRooms',
      'RoomAlternatives',
      'roomAlternatives',
      'Alternatives',
      'alternatives',
      'TourPrices',
      'tourPrices',
      'Prices',
      'prices',
    ]) {
      if (Array.isArray(node[k])) for (const item of node[k]) walk(item, depth + 1)
    }
  }

  walk(priceRow)
  if (ctx.pricePayload) walk(ctx.pricePayload?.Result ?? ctx.pricePayload?.result)
  const sessionRaw = ctx.sessionPackageId ?? pickTourPricesSessionRawId(ctx.pricePayload)
  const sessionUuid = extractTourSessionUuid(sessionRaw)
  if (sessionUuid) push(sessionUuid, 3)
  push(ctx.parentPackageId, 8)
  push(ctx.variant?.id, 12)
  push(ctx.attempt?.packageId, 20)

  return out
    .sort((a, b) => a.priority - b.priority)
    .map((x) => x.id)
    .filter((id, i, arr) => arr.indexOf(id) === i)
}

function tourBedTypeCandidates(priceRow, roomOpts) {
  const rooms = Array.isArray(roomOpts) ? roomOpts : [roomOpts]
  const fromRow = Number(priceRow?.BedType ?? priceRow?.bedType)
  const fromOpt = Number(rooms[0]?.BedType ?? rooms[0]?.bedType)
  return [...new Set([fromRow, fromOpt, 0, 1, 2].filter((n) => !Number.isNaN(n)))]
}

export function buildTourFinalPriceRoomsFromPriceRow(priceRow, roomOpts, bedTypeOverride = null) {
  const bedType = bedTypeOverride ?? Number(priceRow?.BedType ?? priceRow?.bedType ?? 0)
  if (Array.isArray(priceRow?.Paxes) && priceRow.Paxes.length) {
    return [
      {
        BedType: bedType,
        Paxes: priceRow.Paxes.map((p) => ({
          TourPaxType: Number(
            p.TourPaxType ?? p.tourPaxType ?? p.PaxType ?? p.paxType ?? 0,
          ),
        })),
        AdditionalServices: priceRow.AdditionalServices ?? priceRow.additionalServices ?? [],
      },
    ]
  }
  const rooms = Array.isArray(roomOpts) ? roomOpts : [roomOpts]
  return buildTourFinalPriceRooms(
    rooms.map((room, index) => ({
      ...room,
      BedType: Number(room.BedType ?? room.bedType ?? bedType ?? index),
    })),
  )
}

export async function getTourFinalPriceSoft(cfg, tokenCode, opts = {}) {
  try {
    const payload = await getTourFinalPrice(cfg, tokenCode, opts)
    return { ok: true, payload, error: null }
  } catch (e) {
    return { ok: false, payload: null, error: String(e) }
  }
}

function buildTourFinalPricePackageCandidates(priceRow, pricePayload, sessionRawId) {
  const out = []
  const push = (v) => {
    const s = String(v ?? '').trim()
    if (s && isPlausibleTourFinalPricePackageId(s) && !out.includes(s)) out.push(s)
  }
  const session = String(sessionRawId ?? '').trim()
  if (session) push(session)
  const variant254 = collectTourBookKeys(priceRow, pricePayload, session)
    .find((k) => isTourSessionVariantBookKey(k))
  if (variant254) push(variant254)
  for (const id of collectTourFinalPricePackageIds(priceRow, {
    pricePayload,
    sessionPackageId: session,
    parentPackageId: session,
  })) {
    push(id)
  }
  push(extractTourSessionUuid(session))
  return out
}

export function pickTourFinalPriceBookPackageId(finalPricePayload, fallback = null) {
  const r = finalPricePayload?.Result ?? finalPricePayload?.result ?? {}
  for (const f of ['PackageId', 'packageId', 'Id', 'id', 'ResultKey', 'resultKey']) {
    const v = r[f]
    if (v != null && isPlausibleTourBookKey(String(v).trim())) return String(v).trim()
  }
  const fb = fallback != null ? String(fallback).trim() : ''
  return fb && isPlausibleTourBookKey(fb) ? fb : null
}

export function pickTourBookKeysFromFinalPricePayload(finalPricePayload, priceRow = null, opts = {}) {
  const strictOnly = opts.strictOnly === true
  const filterKeys = (list) =>
    strictOnly ? list.filter(isStrictTourBookResultKey) : list.filter(isPlausibleTourBookKey)
  const keys = filterKeys(pickTourBookResultKeys(finalPricePayload, priceRow))
  if (keys.length) return keys
  const r = finalPricePayload?.Result ?? finalPricePayload?.result ?? {}
  const extra = []
  const push = (k) => {
    const s = String(k ?? '').trim()
    if (s && isPlausibleTourBookKey(s) && !extra.includes(s)) extra.push(s)
  }
  for (const f of ['PackageId', 'packageId', 'ResultKey', 'resultKey', 'Id', 'id']) {
    push(r[f])
  }
  const walk = (node, depth = 0) => {
    if (!node || typeof node !== 'object' || depth > 6) return
    if (Array.isArray(node)) {
      for (const item of node) walk(item, depth + 1)
      return
    }
    push(node.PackageId ?? node.packageId)
    push(node.ResultKey ?? node.resultKey)
    push(node.RoomCode ?? node.roomCode)
    for (const k of Object.keys(node)) {
      if (Array.isArray(node[k]) || (node[k] && typeof node[k] === 'object')) walk(node[k], depth + 1)
    }
  }
  walk(r)
  return filterKeys([...new Set([...keys, ...extra])])
}

export async function resolveTourFinalPrice(cfg, tokenCode, priceRow, ctx = {}) {
  const sessionRawId = pickTourPricesSessionRawId(ctx.pricePayload)
  const tourRoomsDefault = buildTourFinalPriceRoomsFromPriceRow(
    priceRow,
    ctx.roomOpts ?? [{ Adults: 2 }],
  )

  const packageIds = buildTourFinalPricePackageCandidates(priceRow, ctx.pricePayload, sessionRawId)
  const directKeys = collectTourBookKeys(priceRow, ctx.pricePayload, sessionRawId)
  const requireFinal = ctx.requireFinalPriceForBook === true
  const bedTypes = tourBedTypeCandidates(priceRow, ctx.roomOpts ?? [{ Adults: 2 }])
  let lastErr = 'PackageId adayı yok'

  if (!packageIds.length) {
    lastErr = 'GetTourFinalPrice için geçerli PackageId yok'
  }

  const pkgLimit = ctx.quick === true ? (ctx.tourLocked ? 8 : 4) : 8
  const bedLimit = ctx.quick === true ? 3 : 4
  let lastOkFinalPrice = null
  const finalPriceAttempts = []

  for (const packageId of packageIds.slice(0, pkgLimit)) {
    if (!ctx.skipTourExtras) {
      try {
        await getTourExtras(cfg, tokenCode, {
          packageId,
          languageCode: ctx.languageCode ?? 'tr',
          timeoutMs: ctx.timeoutMs,
        })
      } catch {
        /* opsiyonel */
      }
    }

    for (const bedType of bedTypes.slice(0, bedLimit)) {
      const tourRooms = buildTourFinalPriceRoomsFromPriceRow(
        priceRow,
        ctx.roomOpts ?? [{ Adults: 2 }],
        bedType,
      )
      const res = await getTourFinalPriceSoft(cfg, tokenCode, {
        packageId,
        tourRooms,
        timeoutMs: ctx.timeoutMs,
      })
      finalPriceAttempts.push({
        packageId: String(packageId).slice(0, 80),
        bedType,
        ok: res.ok,
        error: res.ok ? null : String(res.error ?? '').slice(0, 200),
      })
      if (res.ok) {
        lastOkFinalPrice = { packageId, payload: res.payload, tourRooms }
        const resultKeys = pickTourBookKeysFromFinalPricePayload(res.payload, priceRow, {
          strictOnly: requireFinal,
        })
        if (resultKeys.length) {
          const variantOnly = isTourSessionVariantOnlyKeys(resultKeys)
          const sessionBookKey = pickTourSessionBookKey(sessionRawId, packageId)
          return {
            packageId,
            payload: res.payload,
            resultKeys:
              variantOnly && sessionBookKey ? [sessionBookKey] : resultKeys,
            tourRooms,
            skippedFinalPrice: false,
            finalPriceLocked: true,
            finalPricePackageId: packageId,
            pkgOnlyMode: false,
            finalPriceBedType: bedType,
            finalPriceAttempts: finalPriceAttempts.slice(-6),
          }
        }
        const bookPkgId = pickTourFinalPriceBookPackageId(res.payload, packageId)
        if (bookPkgId) {
          const sessionBookKey = pickTourSessionBookKey(sessionRawId, bookPkgId)
          return {
            packageId: bookPkgId,
            payload: res.payload,
            resultKeys: sessionBookKey ? [sessionBookKey] : [bookPkgId],
            tourRooms,
            skippedFinalPrice: false,
            finalPriceLocked: true,
            finalPricePackageId: bookPkgId,
            pkgOnlyMode: !sessionBookKey,
            usedFinalPricePackageId: !sessionBookKey || undefined,
            finalPriceBedType: bedType,
            finalPriceAttempts: finalPriceAttempts.slice(-6),
          }
        }
        lastErr = requireFinal
          ? 'GetTourFinalPrice strict book key yok (@/tour:)'
          : 'GetTourFinalPrice ResultKeys alınamadı'
        continue
      }
      lastErr = res.error ?? lastErr
    }
  }

  const variantKeys = directKeys.filter(isStrictTourBookResultKey)
  if (lastOkFinalPrice) {
    const bookPkgId =
      pickTourFinalPriceBookPackageId(lastOkFinalPrice.payload, lastOkFinalPrice.packageId) ??
      lastOkFinalPrice.packageId
    const sessionBookKey = pickTourSessionBookKey(sessionRawId, bookPkgId)
    return {
      packageId: bookPkgId,
      payload: lastOkFinalPrice.payload,
      resultKeys: sessionBookKey ? [sessionBookKey] : [bookPkgId],
      tourRooms: lastOkFinalPrice.tourRooms,
      skippedFinalPrice: false,
      finalPriceLocked: true,
      finalPricePackageId: bookPkgId,
      pkgOnlyMode: !sessionBookKey,
      usedFinalPricePackageId: !sessionBookKey || undefined,
      finalPriceBedType: lastOkFinalPrice.tourRooms?.[0]?.BedType ?? 0,
      finalPriceAttempts: finalPriceAttempts.slice(-6),
    }
  }
  if (variantKeys.length) {
    return {
      packageId: sessionRawId ?? variantKeys[0],
      payload: null,
      resultKeys: variantKeys.slice(0, 3),
      tourRooms: tourRoomsDefault,
      skippedFinalPrice: true,
      usedPriceVariantKey: true,
      pkgOnlyMode: true,
      finalPriceAttempts: finalPriceAttempts.slice(-6),
    }
  }

  if (!requireFinal && directKeys.length) {
    return {
      packageId: directKeys[0],
      payload: null,
      resultKeys: directKeys.slice(0, 3),
      tourRooms: tourRoomsDefault,
      skippedFinalPrice: true,
      pkgOnlyMode: true,
      finalPriceAttempts: finalPriceAttempts.slice(-6),
    }
  }

  const tried = packageIds.slice(0, pkgLimit).join(', ')
  throw new Error(
    tried
      ? `${lastErr} (denenen: ${tried}) son: ${finalPriceAttempts.at(-1)?.error ?? '-'}`
      : lastErr,
  )
}
export async function enrichTourResolveWithFinalPrice(cfg, tokenCode, resolved, priceRow, pricePayload, ctx = {}) {
  if (resolved.payload && resolved.skippedFinalPrice !== true) return resolved
  return resolveTourFinalPrice(cfg, tokenCode, priceRow, {
    ...ctx,
    pricePayload,
    requireFinalPriceForBook: true,
    forceFinalPriceApi: true,
  })
}

export function pickTourBookResultKeys(finalPricePayload, priceRow = null) {
  const r = finalPricePayload?.Result ?? finalPricePayload?.result ?? {}
  const keys = []
  const push = (k) => {
    const s = String(k ?? '').trim()
    if (s && isPlausibleTourBookKey(s) && !keys.includes(s)) keys.push(s)
  }

  const walkRoomCodes = (node, depth = 0) => {
    if (!node || typeof node !== 'object' || depth > 7) return
    if (Array.isArray(node)) {
      for (const item of node) walkRoomCodes(item, depth + 1)
      return
    }
    for (const code of [
      node.RoomCode,
      node.roomCode,
      node.Key,
      node.key,
      node.OfferId,
      node.offerId,
    ]) {
      if (code != null && String(code).includes('@')) push(code)
    }
    for (const k of [
      'TourRooms',
      'tourRooms',
      'Rooms',
      'rooms',
      'RoomAlternatives',
      'roomAlternatives',
      'Alternatives',
      'alternatives',
    ]) {
      if (Array.isArray(node[k])) for (const item of node[k]) walkRoomCodes(item, depth + 1)
    }
  }

  walkRoomCodes(r)
  if (priceRow) walkRoomCodes(priceRow)

  const walk = (node, depth = 0) => {
    if (!node || typeof node !== 'object' || depth > 6) return
    if (Array.isArray(node)) {
      for (const item of node) walk(item, depth + 1)
      return
    }
    const rks = node.ResultKeys ?? node.resultKeys ?? node.Keys ?? node.keys
    if (Array.isArray(rks)) rks.forEach(push)
    push(node.ResultKey ?? node.resultKey)
    for (const k of Object.keys(node)) {
      if (Array.isArray(node[k]) || (node[k] && typeof node[k] === 'object')) walk(node[k], depth + 1)
    }
  }

  walk(r)
  if (!keys.length) {
    for (const rk of pickTourRoomBookKeys(r, null)) push(rk)
  }
  if (!keys.length && priceRow) {
    for (const rk of pickTourRoomBookKeys(priceRow, null)) push(rk)
  }
  return keys
}

/** GetPaymentOptions — GetTourPrices/FinalPrice oturum Id (Book ResultKey değil). */
export function pickTourPaymentSessionId(finalPayload, pricePayload = null) {
  const r = finalPayload?.Result ?? finalPayload?.result ?? {}
  for (const f of ['Id', 'id', 'PackageId', 'packageId', 'SearchId', 'searchId']) {
    const v = r[f]
    if (v != null && String(v).trim()) return String(v).trim()
  }
  return pickTourPricesSessionPackageId(pricePayload)
}

/** @deprecated pickTourPaymentSessionId kullanın */
export function pickTourPaymentPackageId(finalPayload, resultKeys = [], fallbackPackageId = null) {
  return (
    pickTourPaymentSessionId(finalPayload) ??
    pickTourPricesSessionPackageId({ Result: finalPayload?.Result }) ??
    fallbackPackageId ??
    null
  )
}

export async function resolveTourPaymentAttempts(cfg, tokenCode, resultKeys, sessionPackageId) {
  const attempts = [
    {
      label: 'agency-2',
      info: { PaymentType: '2', PaymentItemId: '1', PaymentCommissionType: 0 },
    },
  ]
  const variants = [
    { resultKeys, packageId: sessionPackageId },
    { resultKeys },
    { packageId: sessionPackageId },
  ]
  for (const v of variants) {
    if (!v.resultKeys?.length && !v.packageId) continue
    const res = await getTourPaymentOptionsSoft(cfg, tokenCode, {
      ...v,
      languageCode: 'tr',
    })
    if (!res.ok) continue
    const raw = res.payload?.Result ?? res.payload?.result ?? res.payload
    const items = raw?.PaymentOptions ?? raw?.Items ?? raw?.paymentOptions ?? []
    const list = Array.isArray(items) ? items : []
    for (const item of list.slice(0, 4)) {
      attempts.unshift({
        label: `api-${item.PaymentType ?? item.paymentType ?? 'x'}`,
        info: {
          PaymentType: String(item.PaymentType ?? item.paymentType ?? 2),
          PaymentItemId: String(item.PaymentItemId ?? item.Id ?? item.PaymentItemID ?? '1'),
          PaymentCommissionType: item.PaymentCommissionType ?? 0,
        },
      })
    }
    if (list.length) break
  }
  return attempts
}

/** GetTourFinalPrice / BookTour — TourRooms şeması. */
export function buildTourFinalPriceRooms(roomOpts) {
  const rooms = Array.isArray(roomOpts) ? roomOpts : [roomOpts]
  return rooms.map((room) => {
    const adults = Number(room.Adults ?? room.adults ?? 2)
    const children = Number(room.Children ?? room.children ?? 0)
    const paxes = []
    for (let i = 0; i < adults; i++) paxes.push({ TourPaxType: 0 })
    for (let i = 0; i < children; i++) paxes.push({ TourPaxType: 1 })
    return {
      BedType: Number(room.BedType ?? room.bedType ?? 0),
      Paxes: paxes,
      AdditionalServices: [],
    }
  })
}

/** BookTour — oda/kişi sayısına göre TourRoomPaxes (sertifikasyon). */
export function buildTourRoomPaxes(roomOpts, makePaxFn) {
  const rooms = Array.isArray(roomOpts) ? roomOpts : [roomOpts]
  const out = []
  const adultNames = [
    ['TEST', 'TRAVELER'],
    ['JOHN', 'SMITH'],
    ['MARY', 'SMITH'],
  ]
  const childNames = [['TIM', 'SMITH'], ['ANN', 'SMITH']]
  let globalNameIdx = 0
  for (let ri = 0; ri < rooms.length; ri++) {
    const r = rooms[ri]
    const adults = Number(r.Adults ?? r.adults ?? 2)
    const children = Number(r.Children ?? r.children ?? 0)
    const childAges = Array.isArray(r.ChildAges) ? r.ChildAges : r.childAges ?? []
    const paxes = []
    let roomLeaderLast = 'TRAVELER'
    for (let i = 0; i < adults; i++) {
      const [fn, ln] = adultNames[globalNameIdx % adultNames.length] ?? ['TEST', 'TRAVELER']
      globalNameIdx++
      if (i === 0) roomLeaderLast = ln
      const pax = makePaxFn(fn, ln, '15.06.1990', 1)
      pax.Age = 30
      paxes.push({
        IsLeader: ri === 0 && i === 0,
        TourPaxType: 0,
        Pax: pax,
      })
    }
    for (let i = 0; i < children; i++) {
      const age = Number(childAges[i] ?? 5)
      const y = new Date().getUTCFullYear() - age
      const [fn] = childNames[i % childNames.length] ?? ['TIM', 'SMITH']
      const pax = makePaxFn(fn, roomLeaderLast, `15.06.${y}`, 1)
      pax.Age = age
      pax.IdentityNumber = null
      paxes.push({
        IsLeader: false,
        TourPaxType: 1,
        Pax: pax,
      })
    }
    out.push({
      BedType: Number(r.BedType ?? r.bedType ?? 0),
      Paxes: paxes,
      AdditionalServices: [],
    })
  }
  return out
}

/** BookTour pax varyantları — TC kimliksiz (otel cert ile aynı). */
export function buildTourBookPaxVariants(roomOpts, makePaxFn) {
  const standard = buildTourRoomPaxes(roomOpts, makePaxFn)
  const noTc = buildTourRoomPaxes(roomOpts, (fn, ln, dob, gender = 1) => {
    const pax = makePaxFn(fn, ln, dob, gender)
    pax.IdentityNumber = null
    return pax
  })
  const variants = [{ label: 'pax-std', tourRoomPaxes: standard }]
  if (JSON.stringify(noTc) !== JSON.stringify(standard)) {
    variants.push({ label: 'pax-no-tc', tourRoomPaxes: noTc })
  }
  return variants
}

export async function getPickupPointsSoft(cfg, tokenCode, opts = {}) {
  try {
    return { ok: true, payload: await getPickupPoints(cfg, tokenCode, opts) }
  } catch (e) {
    return { ok: false, error: String(e) }
  }
}

/** GetPickupPoints yanıtından ilk kalkış noktası (Code / Id). */
export function pickTourPickupPointRef(pickupPayload) {
  const r = pickupPayload?.Result ?? pickupPayload?.result ?? pickupPayload
  const lists = []
  if (Array.isArray(r)) lists.push(r)
  if (r && typeof r === 'object') {
    for (const k of ['PickupPoints', 'pickupPoints', 'Points', 'points', 'Items', 'items']) {
      if (Array.isArray(r[k])) lists.push(r[k])
    }
  }
  for (const list of lists) {
    for (const item of list) {
      if (!item || typeof item !== 'object') continue
      const code = item.Code ?? item.code
      const id = item.Id ?? item.id ?? item.PickupPointId ?? item.pickupPointId
      const name = item.Name ?? item.name
      const codeStr = code != null ? String(code).trim() : ''
      const idStr = id != null ? String(id).trim() : ''
      if (codeStr) {
        return { code: codeStr, id: idStr || codeStr, name: name != null ? String(name).trim() : null }
      }
      if (idStr) {
        return { code: idStr, id: idStr, name: name != null ? String(name).trim() : null }
      }
    }
  }
  return null
}

/** @deprecated pickTourPickupPointRef kullanın */
export function pickTourPickupPointId(pickupPayload) {
  const ref = pickTourPickupPointRef(pickupPayload)
  return ref?.code ?? ref?.id ?? null
}

/** Tur rezervasyonu sorgula — deneysel (Stoplight Tour API'de get-booking yok). */
export async function getTourBooking(cfg, tokenCode, opts = {}) {
  const body = {
    request: {
      TokenCode: tokenCode,
      SystemPnr: opts.systemPnr ?? null,
      LastName: opts.lastName ?? null,
    },
  }
  const paths = opts.svcPath
    ? [opts.svcPath]
    : [
        '/Tour.svc/Rest/Json/GetTourBooking',
        '/Tour.svc/Rest/Json/GetBooking',
      ]
  let lastErr = null
  for (const svcPath of paths) {
    try {
      return await kplusPost(cfg.baseUrl, svcPath, body)
    } catch (e) {
      lastErr = e
      const msg = String(e?.message ?? e)
      if (!/HTTP 404|geçersiz JSON \(HTTP 404\)/i.test(msg)) throw e
    }
  }
  throw lastErr ?? new Error('GetTourBooking: endpoint bulunamadı (Tour API dokümantasyonunda yok)')
}

// ─── OTEL ─────────────────────────────────────────────────────────────────────

/**
 * Otel arama — destinasyon + tarih + oda/kişi.
 * Sandbox test ID listesi: scripts/lib/travelrobot-sandbox-ids.mjs
 *
 * opts: { checkInDate, checkOutDate, destinationId, hotelCode, rooms, languageCode }
 */
export async function searchHotel(cfg, tokenCode, opts = {}) {
  const checkin = toKplusDate(opts.checkInDate) || formatDate(addDays(30))
  const checkout = toKplusDate(opts.checkOutDate) || formatDate(addDays(37))
  // Gerçek şema (Hotel.json /SearchHotel):
  //   filter.Destinations[] = { DestinationId }, filter.Hotels[] = { HotelCode }
  //   filter.Rooms[] = { Paxes:[{ Count, PaxType, ChildAgeList }] }
  //   filter.AdvancedOptions.Hotel = { OnRequest, IsAsync, IsForCms } (string)
  return kplusPost(
    cfg.baseUrl,
    opts.endpoint ?? '/Hotel.svc/Rest/Json/SearchHotel',
    {
      filter: {
        Token: tokenObj(tokenCode),
        CheckInDate: checkin,
        CheckOutDate: checkout,
        ...(opts.destinationId != null && { Destinations: [{ DestinationId: String(opts.destinationId) }] }),
        ...(opts.hotelCode && {
          Hotels: (Array.isArray(opts.hotelCode) ? opts.hotelCode : [opts.hotelCode]).map((c) => ({ HotelCode: c })),
        }),
        Rooms: normalizeRooms(opts.rooms).map((r) => ({ Paxes: r.Paxes })),
        LanguageCode: opts.languageCode ?? 'tr',
        ...(opts.showMultipleRate != null && { ShowMultipleRate: String(opts.showMultipleRate) }),
        NationalityCode: opts.nationalityCode ?? 'TR',
        AdvancedOptions: {
          Hotel: {
            OnRequest: String(opts.onRequest ?? true),
            IsAsync: String(opts.isAsync ?? false),
            IsForCms: String(opts.isForCms ?? false),
          },
        },
      },
    },
  )
}

// Eski alias (import script'leriyle uyum)
export const searchHotels = searchHotel

/**
 * Otel detayı — tesis bilgileri, görseller, açıklamalar.
 * opts: { hotelCode, languageCode }
 */
export async function getHotelDetails(cfg, tokenCode, productCode, opts = {}) {
  // Gerçek şema: request.{ ProductCode, TokenCode, LanguageCode? }
  const request = {
    ProductCode: productCode ?? opts.productCode,
    TokenCode: tokenCode,
  }
  const lang = String(opts.languageCode ?? 'tr').trim()
  if (lang) request.LanguageCode = lang
  return kplusPost(cfg.baseUrl, '/Hotel.svc/Rest/Json/GetHotelDetails', { request })
}

/**
 * Otel oda tipleri + fiyat — belirli bir otel + tarih için.
 * opts: { hotelCode, checkInDate, checkOutDate, rooms, nationalityCode, languageCode }
 */
export async function getHotelRooms(cfg, tokenCode, opts = {}) {
  // Gerçek endpoint: Hotel.svc /GetHotelRoomPrices
  //   request.{ ProductCode, SearchKey, LanguageCode, TokenCode }
  return kplusPost(cfg.baseUrl, '/Hotel.svc/Rest/Json/GetHotelRoomPrices', {
    request: {
      ProductCode: opts.productCode ?? opts.hotelCode,
      SearchKey: opts.searchKey,
      LanguageCode: opts.languageCode ?? 'tr',
      TokenCode: tokenCode,
    },
  })
}

/**
 * Otel nihai fiyat doğrulama — rezervasyon öncesi fiyat kilidleme.
 * opts: { packageId, languageCode }
 */
export async function getHotelFinalPrice(cfg, tokenCode, opts = {}) {
  const rooms = opts.rooms ?? (opts.roomKey ? [{ Key: opts.roomKey, Paxes: [{ PaxType: 0 }] }] : [])
  return validateHotelRooms(cfg, tokenCode, { rooms })
}

/**
 * Otel rezervasyonu — tam yolcu + iletişim + fatura + ödeme bilgisi.
 *
 * opts: {
 *   tokenCode, packageId,
 *   hotelRoomPaxes: [{ roomIndex, adults: [pax], children: [pax] }],
 *   contactInfo, invoiceInfo, paymentInfo, languageCode
 * }
 */
function omitNullFields(value) {
  if (value === null || value === undefined) return undefined
  if (Array.isArray(value)) {
    return value.map((v) => omitNullFields(v)).filter((v) => v !== undefined)
  }
  if (typeof value !== 'object') return value
  const out = {}
  for (const [k, v] of Object.entries(value)) {
    if (v === null || v === undefined) continue
    const cleaned = omitNullFields(v)
    if (cleaned !== undefined) out[k] = cleaned
  }
  return out
}

/** Stoplight BookHotel — iç HotelRoomPaxes → resmi HotelPaxType şeması. */
export function mapHotelRoomPaxesForBook(hotelRoomPaxes) {
  return (hotelRoomPaxes ?? []).map((room) => ({
    Paxes: (room.Paxes ?? []).map((entry) => {
      const paxType = entry.HotelPaxType ?? entry.PaxType ?? 0
      const pax = entry.Pax ?? {}
      return omitNullFields({
        HotelPaxType: String(paxType),
        IsLeader: entry.IsLeader === true || entry.IsLeader === 'true' ? 'true' : 'false',
        Pax: omitNullFields({
          DateOfBirth: pax.DateOfBirth,
          Email: pax.Email,
          FirstName: pax.FirstName,
          GenderType: pax.GenderType != null ? String(pax.GenderType) : undefined,
          LastName: pax.LastName,
          MobilePhone: pax.MobilePhone,
          NationalityCode: pax.NationalityCode ?? 'TR',
          IdentityNumber: pax.IdentityNumber,
        }),
      })
    }),
  }))
}

function formatHotelBookContactInfo(contact) {
  if (!contact) return undefined
  return omitNullFields({
    Email: contact.Email,
    FirstName: contact.FirstName,
    LastName: contact.LastName,
    Phone: contact.Phone,
    GenderType: contact.GenderType != null ? String(contact.GenderType) : undefined,
  })
}

function formatHotelBookInvoiceInfo(invoice) {
  if (!invoice) return undefined
  return omitNullFields({
    Address: invoice.Address,
    CityCode: invoice.CityCode,
    CityName: invoice.CityName,
    CompanyName: invoice.CompanyName,
    CountryCode: invoice.CountryCode,
    FirstName: invoice.FirstName,
    LastName: invoice.LastName,
    InvoiceInfoTitle: invoice.InvoiceInfoTitle,
    InvoiceInfoType: invoice.InvoiceInfoType != null ? String(invoice.InvoiceInfoType) : undefined,
    PostalCode: invoice.PostalCode,
    TaxNumber: invoice.TaxNumber ?? '',
    TaxOffice: invoice.TaxOffice ?? '',
  })
}

function formatHotelBookPaymentInfo(payment) {
  if (!payment) return undefined
  const out = {
    PaymentType: payment.PaymentType != null ? String(payment.PaymentType) : undefined,
    PaymentItemId: payment.PaymentItemId != null ? String(payment.PaymentItemId) : undefined,
  }
  if (payment.CardInfo) out.CardInfo = payment.CardInfo
  return omitNullFields(out)
}

/** BookHotel gövdesi — varsayılan: Stoplight şeması (ResultKeys, HotelPaxType). */
export function buildHotelBookRequest(opts = {}) {
  const packageInBody = opts.legacy === true && opts.packageIdInBody === true && opts.packageId != null
  const resultKeys = packageInBody
    ? []
    : (opts.resultKeys ??
      (opts.resultKey ? [opts.resultKey] : opts.packageId && opts.legacy ? [opts.packageId] : []))

  if (opts.legacy === true) {
    const request = {
      Version: '2.0',
      ProductType: 1,
      TokenCode: opts.tokenCode,
      PaxInfo: {
        HotelRoomPaxes: opts.hotelRoomPaxes ?? [],
      },
      ContactInfo: opts.contactInfo,
      InvoiceInfo: opts.invoiceInfo,
      PaymentInfo: opts.paymentInfo,
      LanguageCode: opts.languageCode ?? 'tr',
      WithPrice: false,
    }
    if (opts.bookingNote) request.BookingNote = opts.bookingNote
    if (opts.agentReferenceInfo != null) request.AgentReferenceInfo = opts.agentReferenceInfo
    if (packageInBody) {
      request.PackageId = String(opts.packageId)
    } else if (resultKeys.length) {
      request.ResultKeys = resultKeys
    }
    return { request }
  }

  const request = omitNullFields({
    TokenCode: opts.tokenCode,
    ResultKeys: resultKeys.length ? resultKeys.map(String) : undefined,
    PaxInfo: {
      HotelRoomPaxes: mapHotelRoomPaxesForBook(opts.hotelRoomPaxes),
    },
    ContactInfo: formatHotelBookContactInfo(opts.contactInfo),
    InvoiceInfo: formatHotelBookInvoiceInfo(opts.invoiceInfo),
    PaymentInfo: formatHotelBookPaymentInfo(opts.paymentInfo),
  })

  return { request }
}

export async function bookHotel(cfg, opts = {}) {
  const body = buildHotelBookRequest(opts)
  const payload = opts.omitNulls === false ? body : omitNullFields(body)
  return kplusPost(cfg.baseUrl, '/Hotel.svc/Rest/Json/BookHotel', payload ?? body)
}

/**
 * Asenkron otel arama sonuçlarını al — SearchHotel async döndürdüyse.
 * Stoplight: /docs/travelrobot/d2f6bc215b5f1-asynchronous-results
 * opts: { searchId, languageCode }
 */
export async function getHotelAsyncResults(cfg, tokenCode, opts = {}) {
  // Gerçek endpoint: Hotel.svc /GetAsyncHotels
  //   request.{ SearchId, ReturnNewResult, Token:{TokenCode} }
  return kplusPost(cfg.baseUrl, '/Hotel.svc/Rest/Json/GetAsyncHotels', {
    request: {
      Token: tokenObj(tokenCode),
      SearchId: opts.searchId,
      ReturnNewResult: String(opts.returnNewResult ?? true),
    },
  })
}

/**
 * Oda teklifleri — belirli otel + tarih + oda/kişi kombinasyonu için fiyatlı teklifler.
 * Stoplight: /docs/travelrobot/90652c9af71dc-room-offers
 * opts: { hotelCode, checkInDate, checkOutDate, rooms, nationalityCode, languageCode }
 */
export async function getRoomOffers(cfg, tokenCode, opts = {}) {
  // Oda teklif fiyatları: Hotel.svc /GetHotelRoomPrices
  //   request.{ ProductCode, SearchKey, LanguageCode, TokenCode }
  return kplusPost(cfg.baseUrl, '/Hotel.svc/Rest/Json/GetHotelRoomPrices', {
    request: {
      ProductCode: opts.productCode ?? opts.hotelCode,
      SearchKey: opts.searchKey,
      LanguageCode: opts.languageCode ?? 'tr',
      TokenCode: tokenCode,
    },
  })
}

/**
 * Oda iptal politikaları — seçilen oda paketi için.
 * Stoplight: /docs/travelrobot/b574d7af61f5a-room-cancellation-policies
 * opts: { packageId, languageCode }
 */
export async function getRoomCancellationPolicies(cfg, tokenCode, opts = {}) {
  // Gerçek endpoint: Hotel.svc /GetHotelRoomCancellationPolicies
  //   request.{ ResultKeys[], TokenCode }
  return kplusPost(cfg.baseUrl, '/Hotel.svc/Rest/Json/GetHotelRoomCancellationPolicies', {
    request: {
      ResultKeys: opts.resultKeys ?? (opts.resultKey ? [opts.resultKey] : []),
      TokenCode: tokenCode,
    },
  })
}

/**
 * Oda notları / remarks — seçilen oda paketi için özel notlar.
 * Stoplight: /docs/travelrobot/ba0ac02202f46-room-remarks
 * opts: { packageId, languageCode }
 */
export async function getRoomRemarks(cfg, tokenCode, opts = {}) {
  // Gerçek endpoint: Hotel.svc /GetHotelRoomRemarks → request.{ ResultKeys[], TokenCode }
  return kplusPost(cfg.baseUrl, '/Hotel.svc/Rest/Json/GetHotelRoomRemarks', {
    request: {
      ResultKeys: opts.resultKeys ?? (opts.resultKey ? [opts.resultKey] : []),
      TokenCode: tokenCode,
    },
  })
}

/**
 * Oda fiyat doğrulama — rezervasyon öncesi fiyat kilitleme.
 * Stoplight: /docs/travelrobot/9a7e5ed30507e-validate-hotel-rooms
 * opts: { packageId, languageCode }
 */
export async function validateHotelRooms(cfg, tokenCode, opts = {}) {
  // Gerçek endpoint: Hotel.svc /ValidateHotelRoomsV2
  //   request.{ Token:{TokenCode}, Hotel:{ Rooms:[{ Key, Paxes:[{PaxType,AdditionalServices}], AdditionalServices }] } }
  return kplusPost(cfg.baseUrl, '/Hotel.svc/Rest/Json/ValidateHotelRoomsV2', {
    request: {
      Token: tokenObj(tokenCode),
      Hotel: {
        Rooms: opts.rooms ?? [],
      },
    },
  })
}

/**
 * Otel için ödeme seçenekleri.
 * Stoplight: /docs/travelrobot/b06e262d81e33-payment-options
 * opts: { packageId, languageCode }
 */
export async function getHotelPaymentOptions(cfg, tokenCode, opts = {}) {
  return kplusPost(cfg.baseUrl, '/Hotel.svc/Rest/Json/GetPaymentOptions', {
    request: {
      TokenCode: tokenCode,
      ResultKeys: opts.resultKeys ?? (opts.resultKey ? [opts.resultKey] : []),
    },
  })
}

/**
 * Oda teklifini rezerve et (yeni API — BookHotel'in yerini alıyor olabilir).
 * Stoplight: /docs/travelrobot/ca3cafb61ac5c-book-room-offer-s
 * opts: { tokenCode, packageId, hotelRoomPaxes, contactInfo, invoiceInfo, paymentInfo, languageCode }
 */
export async function bookRoomOffers(cfg, opts = {}) {
  return bookHotel(cfg, opts)
}

/**
 * Otel rezervasyonunu getir.
 * Stoplight: /docs/travelrobot/af2571b7afea9-retrieve-reservation
 * opts: { systemPnr, pnr, languageCode }
 */
export async function getHotelReservation(cfg, tokenCode, opts = {}) {
  // Gerçek şema: request.{ TokenCode, SystemPnr, LastName }
  return kplusPost(cfg.baseUrl, '/Hotel.svc/Rest/Json/RetrieveReservation', {
    request: {
      TokenCode: tokenCode,
      SystemPnr: opts.systemPnr ?? null,
      LastName: opts.lastName ?? null,
    },
  })
}

/**
 * Otel rezervasyonunu onayla (ön rezervasyondan kesin rezervasyona geçiş).
 * Stoplight: /docs/travelrobot/2005eaadb02b8-confirm-reservation
 * opts: { tokenCode, systemPnr, languageCode }
 */
export async function confirmHotelReservation(cfg, opts = {}) {
  // Gerçek şema: request.{ TokenCode, SystemPnr, LastName, PaymentInfo }
  return kplusPost(cfg.baseUrl, '/Hotel.svc/Rest/Json/ConfirmReservation', {
    request: {
      TokenCode: opts.tokenCode,
      SystemPnr: opts.systemPnr,
      LastName: opts.lastName ?? null,
      ...(opts.paymentInfo ? { PaymentInfo: opts.paymentInfo } : {}),
    },
  })
}

/**
 * Otel rezervasyonunu iptal et.
 * Stoplight: /docs/travelrobot/f1e6f2944b681-cancel-reservation
 * opts: { tokenCode, systemPnr, languageCode }
 */
export async function cancelHotelReservation(cfg, opts = {}) {
  return kplusPost(cfg.baseUrl, '/Hotel.svc/Rest/Json/CancelReservation', {
    request: {
      TokenCode: opts.tokenCode,
      SystemPnr: opts.systemPnr,
      LastName: opts.lastName ?? null,
    },
  })
}

/**
 * Otel rezervasyonunu void et (iptal + iade).
 * Stoplight: /docs/travelrobot/f6cb9beb37937-void-reservation
 * opts: { tokenCode, systemPnr, languageCode }
 */
export async function voidHotelReservation(cfg, opts = {}) {
  return kplusPost(cfg.baseUrl, '/Hotel.svc/Rest/Json/VoidReservation', {
    request: {
      TokenCode: opts.tokenCode,
      SystemPnr: opts.systemPnr,
      LastName: opts.lastName ?? null,
    },
  })
}

/**
 * Otel booking'i sorgula.
 * Stoplight: /docs/travelrobot/1e2b932d401b2-get-booking
 * opts: { systemPnr, pnr, languageCode }
 */
export async function getHotelBooking(cfg, tokenCode, opts = {}) {
  // Gerçek endpoint: Hotel.svc /GetHotelBooking → request.{ TokenCode, SystemPnr, LastName }
  return kplusPost(cfg.baseUrl, '/Hotel.svc/Rest/Json/GetHotelBooking', {
    request: {
      TokenCode: tokenCode,
      SystemPnr: opts.systemPnr ?? null,
      LastName: opts.lastName ?? null,
    },
  })
}

export function pickHotelRows(payload) {
  const p = payload?.Result ?? payload?.result ?? payload
  let rows = []
  if (Array.isArray(p)) rows = p
  else if (p && typeof p === 'object') {
    for (const k of ['Hotels', 'hotels', 'HotelList', 'hotelList', 'Items', 'items', 'Results', 'results']) {
      if (Array.isArray(p[k])) {
        rows = p[k]
        break
      }
    }
  }
  // SearchHotel: Hotels[] = { Hotel: { HotelCode, HotelName, ... }, Rooms, Data }
  return rows.map((row) => {
    const h = row?.Hotel ?? row?.hotel
    if (h && typeof h === 'object') {
      return {
        ...row,
        ...h,
        HotelCode: h.HotelCode ?? h.hotelCode ?? row.HotelCode,
        HotelName: h.HotelName ?? h.hotelName ?? row.HotelName,
        SearchKey:
          row.SearchKey ??
          row.searchKey ??
          row.Data?.SearchKey ??
          row.data?.searchKey ??
          row.Data?.Key ??
          row.data?.key ??
          row.Key ??
          row.key ??
          p?.SearchKey ??
          p?.searchKey,
        ProductCode: h.HotelCode ?? h.ProductCode ?? row.ProductCode,
      }
    }
    return row
  })
}

// ─── UÇUŞ ─────────────────────────────────────────────────────────────────────

/**
 * Uçuş güzergah arama.
 * Senaryolar: Oneway, Roundtrip (Combined/Separated), Multiple
 * Test rotaları: IST→LHR, LHR→DXB, CDG→FCO→LHR→BCN (LCC: AYT→TZX)
 *
 * opts: {
 *   legs: [{ originCode, destinationCode, departureDate }],
 *   flightType,   // 0=Oneway, 1=Roundtrip, 2=Multiple
 *   resultType,   // 0=Combined, 1=Separated
 *   adults, children, infants,
 *   cabinClass,   // 0=Any, 1=Economy, 2=Business
 *   onlyDirects,
 *   languageCode
 * }
 */
export async function searchFlightItinerary(cfg, tokenCode, opts = {}) {
  // Gerçek şema (Air.json /SearchAvailability):
  //   request.Legs[].DeparturePoint/ArrivalPoint = { Code, HotpointType }, Date = "DD.MM.YYYY"
  //   request.Passengers[] = { PaxType: "0"=ADT/"1"=CHD/"2"=INF, Count } (string)
  //   request.SearchType: "0"=Oneway / "1"=Roundtrip / "2"=Multiple
  //   request.AdvancedOptions.Air = { OnlyBestFares, OnlyDirectFlights, OnlyRefundableFlights, PermittedAirlineCodes }
  const departAhead = Number(opts.departDaysAhead ?? 30)
  const rawLegs = opts.legs ?? [
    { originCode: 'IST', destinationCode: 'LHR', departureDate: formatDate(addDays(departAhead)) },
  ]
  const legs = rawLegs.map((l, i) => ({
    DeparturePoint: { Code: l.originCode ?? l.departurePointCode, HotpointType: String(l.departureHotpointType ?? 1) },
    ArrivalPoint: { Code: l.destinationCode ?? l.arrivalPointCode, HotpointType: String(l.arrivalHotpointType ?? 1) },
    Date:
      l.departureDate
      ?? l.date
      ?? formatDate(addDays(departAhead + (Number(l.departDaysAhead ?? i) || 0))),
  }))

  const passengers = []
  if ((opts.adults ?? 1) > 0) passengers.push({ PaxType: '0', Count: String(opts.adults ?? 1) })
  if ((opts.children ?? 0) > 0) {
    const childAges = opts.childAges ?? [5]
    const ageList = Array.from({ length: opts.children }, (_, i) => Number(childAges[i] ?? childAges[0] ?? 5))
    passengers.push({
      PaxType: '1',
      Count: String(opts.children),
      ChildAgeList: ageList,
    })
  }
  if ((opts.infants ?? 0) > 0) passengers.push({ PaxType: '2', Count: String(opts.infants) })

  // SearchType: tek bacak=Oneway(0), iki bacak=Roundtrip(1), >2=Multiple(2)
  const searchType =
    opts.searchType != null
      ? String(opts.searchType)
      : legs.length <= 1
        ? '0'
        : legs.length === 2
          ? '1'
          : '2'

  return kplusPost(
    cfg.baseUrl,
    opts.endpoint ?? '/Air.svc/Rest/Json/SearchAvailability',
    {
      request: {
        Token: tokenObj(tokenCode),
        SearchType: searchType,
        Legs: legs,
        Passengers: passengers,
        AdvancedOptions: {
          Air: {
            OnlyBestFares: opts.onlyBestFares ?? false,
            OnlyDirectFlights: opts.onlyDirects ?? false,
            OnlyRefundableFlights: opts.onlyRefundable ?? false,
            ...(opts.resultType != null ? { ResultType: opts.resultType } : {}),
            ...(opts.permittedAirlineCodes ? { PermittedAirlineCodes: opts.permittedAirlineCodes } : {}),
          },
        },
      },
    },
  )
}

// Eski alias (import script'leriyle uyum)
export const searchFlights = searchFlightItinerary

/**
 * Branded fares — seçilen uçuş için paket/koltuk sınıfı seçenekleri.
 * opts: { resultKey, languageCode }
 */
export async function getFlightBrandedFares(cfg, tokenCode, opts = {}) {
  return kplusPost(cfg.baseUrl, '/Air.svc/Rest/Json/GetBrandedFares', {
    request: {
      Token: tokenObj(tokenCode),
      FareAlternativeLegKeys: opts.fareAlternativeLegKeys ?? (opts.resultKey ? [opts.resultKey] : []),
    },
  })
}

/**
 * Uçuş doğrulama — fiyat ve müsaitlik kilitleme.
 * opts: { resultKeys: [...], languageCode }
 */
export async function validateFlight(cfg, tokenCode, opts = {}) {
  // Gerçek şema: request.Air.FareAlternativeLegKeys[], request.Token.TokenCode
  return kplusPost(cfg.baseUrl, '/Air.svc/Rest/Json/Validate', {
    request: {
      Token: tokenObj(tokenCode),
      Air: {
        FareAlternativeLegKeys: opts.fareAlternativeLegKeys ?? opts.resultKeys ?? [],
      },
    },
  })
}

/** Validate yanıtındaki PassengerFares → Book için PassengerRef listesi. */
export function extractFlightPassengerRefs(validatePayload, expectedCount = null) {
  const groups = []

  const expandGroup = (passengerFares) => {
    const out = []
    for (const pf of passengerFares ?? []) {
      const passengerRef = pf?.PassengerRef ?? pf?.passengerRef
      if (!passengerRef) continue
      const passengerType = Number(pf?.PassengerType ?? pf?.passengerType ?? 0)
      const count = Math.max(1, Number(pf?.Count ?? pf?.count ?? 1))
      for (let i = 0; i < count; i++) {
        out.push({ passengerRef: String(passengerRef), passengerType })
      }
    }
    return out
  }

  const walk = (node) => {
    if (node == null || typeof node !== 'object') return
    if (Array.isArray(node.PassengerFares) && node.PassengerFares.length) {
      const expanded = expandGroup(node.PassengerFares)
      if (expanded.length) groups.push(expanded)
    }
    if (Array.isArray(node)) {
      for (const item of node) walk(item)
      return
    }
    for (const v of Object.values(node)) walk(v)
  }

  walk(validatePayload?.Result ?? validatePayload?.result ?? validatePayload)

  if (!groups.length) return []

  if (expectedCount != null) {
    const exact = groups.filter((g) => g.length === expectedCount)
    if (exact.length) return exact[exact.length - 1]
  }

  return groups.reduce((best, g) => (g.length > (best?.length ?? 0) ? g : best), groups[0])
}

/** Validate PassengerRef'lerini FlightPaxes sırasına hizala (ADT→CHD→INF). */
export function attachPassengerRefsToFlightPaxes(flightPaxes, passengerRefs) {
  if (!Array.isArray(passengerRefs) || !passengerRefs.length) return flightPaxes ?? []
  return (flightPaxes ?? []).map((entry, i) => {
    const ref = passengerRefs[i]
    if (!ref?.passengerRef) return entry
    return {
      ...entry,
      PassengerRef: ref.passengerRef,
      FlightPaxType: ref.passengerType ?? entry.FlightPaxType ?? entry.PaxType,
    }
  })
}

/** Book (Air) — iç FlightPaxes → Stoplight şeması (FlightPaxType, PassengerRef). */
export function mapFlightPaxesForBook(flightPaxes, opts = {}) {
  const useFlightPaxType = opts.useFlightPaxType !== false
  return (flightPaxes ?? []).map((entry) => {
    const paxType = entry.FlightPaxType ?? entry.PaxType ?? 0
    const pax = entry.Pax ?? {}
    const typeField = useFlightPaxType
      ? { FlightPaxType: String(paxType) }
      : { PaxType: String(paxType) }
    const mapped = omitNullFields({
      ...typeField,
      PassengerRef: entry.PassengerRef,
      IsLeader: entry.IsLeader === true || entry.IsLeader === 'true' ? 'true' : 'false',
      Pax: omitNullFields({
        DateOfBirth: pax.DateOfBirth,
        Email: pax.Email,
        FirstName: pax.FirstName,
        GenderType: pax.GenderType != null ? String(pax.GenderType) : undefined,
        LastName: pax.LastName,
        MobilePhone: pax.MobilePhone,
        NationalityCode: pax.NationalityCode ?? 'TR',
        IdentityNumber: pax.IdentityNumber != null ? String(pax.IdentityNumber) : undefined,
        PassportNumber: pax.PassportNumber,
        PassportValidityDate: pax.PassportValidityDate,
        ChildAge: pax.ChildAge != null ? String(pax.ChildAge) : undefined,
      }),
    })
    if (optsLegacyRecId(entry)) mapped.RecId = entry.RecId
    return mapped
  })
}

function optsLegacyRecId(entry) {
  return entry.RecId != null && entry.RecId !== 0
}

function formatFlightBookContactInfo(contact) {
  if (!contact) return undefined
  return omitNullFields({
    Email: contact.Email,
    FirstName: contact.FirstName,
    LastName: contact.LastName,
    Phone: contact.Phone,
    GenderType: contact.GenderType != null ? String(contact.GenderType) : undefined,
  })
}

function formatFlightBookPaymentInfo(payment) {
  if (!payment) return undefined
  const out = {
    PaymentType: payment.PaymentType != null ? String(payment.PaymentType) : undefined,
    PaymentItemId: payment.PaymentItemId != null ? String(payment.PaymentItemId) : undefined,
  }
  if (payment.CardInfo) out.CardInfo = payment.CardInfo
  return omitNullFields(out)
}

/** Air Book gövdesi — legacy (ham FlightPaxes) veya Stoplight (mapFlightPaxesForBook). */
export function buildFlightBookRequest(opts = {}) {
  const flightPaxes =
    opts.mapPaxes === true
      ? mapFlightPaxesForBook(opts.flightPaxes, { useFlightPaxType: opts.useFlightPaxType })
      : (opts.flightPaxes ?? [])
  const request = {
    ProcessId: null,
    Version: '2.0',
    ProductType: 0,
    TokenCode: opts.tokenCode,
    PaxInfo: {
      HotelRoomPaxes: null,
      FlightPaxes: flightPaxes,
      CarPax: null,
      TourRoomPaxes: null,
      TransferPaxes: null,
      PackagePaxes: null,
      VisaPaxes: null,
      ActivityPaxes: null,
    },
    ContactInfo: opts.mapPaxes === true ? formatFlightBookContactInfo(opts.contactInfo) : opts.contactInfo,
    InvoiceInfo: opts.invoiceInfo,
    CorporateInfo: null,
    BookingNote: opts.bookingNote ?? null,
    AgentReferenceInfo: opts.agentReferenceInfo ?? null,
    ResultKeys: (opts.resultKeys ?? []).map(String),
    PaymentInfo: opts.mapPaxes === true ? formatFlightBookPaymentInfo(opts.paymentInfo) : opts.paymentInfo,
    LanguageCode: opts.languageCode ?? 'tr',
    WithPrice: false,
  }
  return { request: omitNullFields(request) }
}

/**
 * Uçuş rezervasyon oluşturma.
 * opts: {
 *   tokenCode, resultKeys,
 *   flightPaxes: [{ paxType, pax: { firstName, lastName, dateOfBirth, ... } }],
 *   mapPaxes: true (varsayılan Stoplight), false = ham Postman gövdesi
 *   contactInfo, invoiceInfo, paymentInfo, languageCode
 * }
 */
export async function createFlightReservation(cfg, opts = {}) {
  const body = buildFlightBookRequest(opts)
  return kplusPost(cfg.baseUrl, '/Air.svc/Rest/Json/Book', body)
}

/**
 * Bilet kese (rezervasyondan) — SystemPNR ile.
 * opts: { tokenCode, systemPnr, languageCode }
 */
export async function issueTicketFromReservation(cfg, opts = {}) {
  // Gerçek şema: request.{ TokenCode, SystemPnr, LastName, PaymentInfo }
  return kplusPost(cfg.baseUrl, '/Air.svc/Rest/Json/ReservationToTicket', {
    request: {
      TokenCode: opts.tokenCode,
      SystemPnr: opts.systemPnr,
      LastName: opts.lastName,
      ...(opts.paymentInfo ? { PaymentInfo: opts.paymentInfo } : {}),
    },
  })
}

/**
 * Bilet direkt kese — rezervasyon olmadan (tek adım).
 * opts: { tokenCode, resultKeys, flightPaxes, contactInfo, invoiceInfo, paymentInfo, languageCode }
 */
export async function issueTicketDirect(cfg, opts = {}) {
  const body = buildFlightBookRequest(opts)
  return kplusPost(cfg.baseUrl, '/Air.svc/Rest/Json/IssueTicketDirect', body)
}

export function pickFlightRows(payload) {
  const p = payload?.Result ?? payload?.result ?? payload
  if (Array.isArray(p)) return p
  if (!p || typeof p !== 'object') return []

  // SearchAvailability: Result.SearchResults[].Results[] (Fares, Legs, …)
  const blocks = p.SearchResults ?? p.searchResults
  if (Array.isArray(blocks)) {
    const flat = []
    for (const block of blocks) {
      const results = block?.Results ?? block?.results
      if (Array.isArray(results)) flat.push(...results)
    }
    if (flat.length) return flat
  }

  for (const k of ['Flights', 'flights', 'FlightList', 'flightList', 'Items', 'items', 'Results', 'results', 'Itineraries', 'itineraries']) {
    if (Array.isArray(p[k])) return p[k]
  }
  return []
}

/**
 * SearchAvailability / GetBrandedFares yanıtından FareAlternativeLeg Key listesi.
 * Yol: Result > SearchResults > Results > Fares > FareAlternativeLegs > Key
 * Roundtrip için tüm bacakların key'leri gerekir (yalnızca ilki yetmez).
 */
function fareKeysFromResultRow(res) {
  if (!res) return []
  const fares = res?.Fares ?? res?.fares
  if (!Array.isArray(fares) || !fares.length) return []
  const legs = fares[0]?.FareAlternativeLegs ?? fares[0]?.fareAlternativeLegs
  if (!Array.isArray(legs)) return []
  return legs.map((leg) => leg?.Key).filter(Boolean).map(String)
}

/** @returns {'combined'|'separated'} */
export function airKeyPickMode(opts = {}) {
  if (opts.mode === 'combined' || opts.mode === 'separated') return opts.mode
  return opts.resultType === 1 ? 'separated' : 'combined'
}

/**
 * SearchAvailability / GetBrandedFares / Validate yanıtından FareAlternativeLeg Key listesi.
 * Combined (ResultType 2): tek Results[i] içindeki tüm bacak key'leri.
 * Separated (ResultType 1): her yön SearchResults bloğundan bir key (offerIndex ile hizalı).
 */
export function pickFareAlternativeLegKeys(payload, opts = {}) {
  const mode = airKeyPickMode(opts)
  const offerIndex = opts.offerIndex ?? 0
  const p = payload?.Result ?? payload?.result ?? payload
  const blocks = p?.SearchResults ?? p?.searchResults

  if (Array.isArray(blocks) && blocks.length) {
    if (mode === 'separated') {
      const sepBlocks = blocks.filter((b) => Number(b?.ResultType ?? b?.resultType) === 1)
      const targets = sepBlocks.length ? sepBlocks : blocks
      const keys = []
      for (const block of targets) {
        const results = block?.Results ?? block?.results
        const res = results?.[offerIndex] ?? results?.[0]
        const rowKeys = fareKeysFromResultRow(res)
        if (rowKeys[0]) keys.push(rowKeys[0])
      }
      if (keys.length) return keys
    } else {
      const combBlock =
        blocks.find((b) => Number(b?.ResultType ?? b?.resultType) === 2) ??
        blocks[0]
      const results = combBlock?.Results ?? combBlock?.results
      const res = results?.[offerIndex] ?? results?.[0]
      const keys = fareKeysFromResultRow(res)
      if (keys.length) return keys
    }
  }

  const rows = pickFlightRows(payload)
  const res = rows[offerIndex] ?? rows[0]
  return fareKeysFromResultRow(res)
}

/** Separated aramada denenecek teklif sayısı (her yön Results uzunluğunun minimumu). */
export function countFlightOfferSlots(payload, opts = {}) {
  const mode = airKeyPickMode(opts)
  const p = payload?.Result ?? payload?.result ?? payload
  const blocks = p?.SearchResults ?? p?.searchResults
  if (!Array.isArray(blocks)) return Math.max(1, pickFlightRows(payload).length)

  if (mode === 'separated') {
    const sepBlocks = blocks.filter((b) => Number(b?.ResultType ?? b?.resultType) === 1)
    const targets = sepBlocks.length ? sepBlocks : blocks
    const lengths = targets.map((b) => (b?.Results ?? b?.results ?? []).length).filter((n) => n > 0)
    return lengths.length ? Math.min(...lengths) : 1
  }

  const combBlock =
    blocks.find((b) => Number(b?.ResultType ?? b?.resultType) === 2) ?? blocks[0]
  return (combBlock?.Results ?? combBlock?.results ?? []).length || 1
}

/** Geriye uyumluluk — ilk key. */
export function pickFirstFareLegKey(payload, opts = {}) {
  const keys = pickFareAlternativeLegKeys(payload, opts)
  return keys[0] ?? null
}

/** Validate yanıtındaki |||VD@… post-validate key'leri (derin tarama). */
function collectFlightValidateKeysDeep(node, out = []) {
  if (node == null) return out
  if (typeof node === 'string') {
    if (node.includes('|||VD@') && !out.includes(node)) out.push(node)
    return out
  }
  if (Array.isArray(node)) {
    for (const item of node) collectFlightValidateKeysDeep(item, out)
    return out
  }
  if (typeof node === 'object') {
    for (const [k, v] of Object.entries(node)) {
      if ((k === 'Key' || k === 'key') && typeof v === 'string' && v.includes('|||VD@')) {
        if (!out.includes(v)) out.push(v)
      }
      collectFlightValidateKeysDeep(v, out)
    }
  }
  return out
}

/** Validate yanıtından Book/IssueTicketDirect için ResultKeys (tüm bacaklar). */
export function pickFlightBookResultKeys(validatePayload, fallbackKeys = [], opts = {}) {
  const root = validatePayload?.Result ?? validatePayload?.result ?? validatePayload
  const deepVd = collectFlightValidateKeysDeep(root, [])
  if (deepVd.length) return deepVd
  const fromValidate = pickFareAlternativeLegKeys(validatePayload, opts)
  if (fromValidate.length) return fromValidate.map(String)
  return (fallbackKeys ?? []).map(String).filter(Boolean)
}

/** SearchHotel / otel satırından GetHotelRoomPrices için SearchKey. */
export function pickHotelSearchKey(searchPayload, hotelRow = null) {
  const p = searchPayload?.Result ?? searchPayload?.result ?? searchPayload
  const row = hotelRow ?? {}
  return (
    row.SearchKey ??
    row.searchKey ??
    row.Data?.SearchKey ??
    row.data?.searchKey ??
    row.Data?.Key ??
    row.data?.key ??
    row.Key ??
    row.key ??
    p?.SearchKey ??
    p?.searchKey ??
    p?.Key ??
    p?.key ??
    null
  )
}

/** ValidateHotelRoomsV2 — RoomCode (result key). Paxes yalnızca ek hizmet varsa gerekir. */
export function buildHotelValidateRooms(roomOpts, roomKeys, opts = {}) {
  const keys = roomKeys ?? []
  if (!opts.includePaxes) {
    return keys.map((key) => ({ Key: String(key) }))
  }
  const rooms = normalizeRooms(roomOpts)
  return keys.map((key, idx) => {
    const paxes = rooms[idx]?.Paxes ?? rooms[0]?.Paxes ?? [{ PaxType: 0, Count: 1 }]
    const expanded = []
    for (const p of paxes) {
      const n = Number(p.Count ?? 1)
      const ages = p.ChildAgeList ?? p.childAgeList ?? null
      for (let i = 0; i < n; i++) {
        const entry = { PaxType: p.PaxType }
        if (Number(p.PaxType) === 1 && ages) {
          entry.ChildAge = Number(ages[i] ?? ages[0] ?? 5)
        }
        expanded.push(entry)
      }
    }
    return { Key: String(key), Paxes: expanded }
  })
}

function roomCodeFromAlt(alt) {
  const k = alt?.RoomCode ?? alt?.roomCode ?? alt?.Key ?? alt?.key
  if (k == null) return null
  const s = String(k)
  if (s.includes('@')) return s
  if (s.includes('|||') || s.length > 20) return s
  return null
}

function firstRoomCodeFromRoom(room, minAdults = 1) {
  const alts = room?.RoomAlternatives ?? room?.roomAlternatives
  if (!Array.isArray(alts)) return null
  for (const alt of alts) {
    const code = roomCodeFromAlt(alt)
    if (!code) continue
    const allotment = Number(alt?.Allotment ?? alt?.allotment ?? 9)
    if (allotment >= minAdults) return code
  }
  return null
}

export function hotelNodeFromPayload(payload, hotelCode = null) {
  const p = payload?.Result ?? payload?.result ?? payload
  const hotels = p?.Hotels ?? p?.hotels
  if (!Array.isArray(hotels) || !hotels.length) return null
  const norm = (v) => String(v ?? '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '')
  const code = norm(hotelCode)
  if (code) {
    for (const h of hotels) {
      const nested = h?.Hotel ?? h?.hotel ?? h
      const candidates = [
        h?.HotelCode,
        h?.hotelCode,
        nested?.HotelCode,
        nested?.hotelCode,
        h?.ProductCode,
        h?.productCode,
        nested?.ProductCode,
        nested?.productCode,
      ]
      if (candidates.some((c) => norm(c) === code)) return h
    }
  }
  return hotels[0]
}

/** SearchHotel / GetHotelRoomPrices satırını Hotels[0] şekline getirir. */
export function hotelPayloadShapeFromRow(row) {
  if (!row || typeof row !== 'object') return { Rooms: [], Data: null }
  return {
    Hotel: row?.Hotel ?? row?.hotel ?? {
      HotelCode: row?.HotelCode ?? row?.hotelCode,
      HotelName: row?.HotelName ?? row?.hotelName ?? row?.Name,
    },
    Rooms: row?.Rooms ?? row?.rooms ?? [],
    Data: row?.Data ?? row?.data ?? null,
  }
}

/**
 * Çok odalı senaryo (S3): KPlus Data.RoomCombinations veya oda indeksine göre key setleri.
 * Her dizi = ValidateHotelRoomsV2'de birlikte gönderilecek RoomCode listesi.
 */
export function pickHotelRoomCombinationSets(payload, roomOpts = [{}]) {
  const roomCount = Array.isArray(roomOpts) ? roomOpts.length : 1
  if (roomCount <= 1) return []

  const hotel = hotelNodeFromPayload(payload)
  if (!hotel) return []

  const sets = []
  const combos = hotel?.Data?.RoomCombinations ?? hotel?.data?.roomCombinations ?? []
  for (const combo of combos) {
    const codes = (combo?.RoomCodes ?? combo?.roomCodes ?? [])
      .map((c) => (c != null ? String(c) : ''))
      .filter(Boolean)
    if (codes.length >= roomCount) sets.push(codes.slice(0, roomCount))
  }

  const rooms = hotel?.Rooms ?? hotel?.rooms ?? []
  if (Array.isArray(rooms) && rooms.length >= roomCount) {
    const sorted = [...rooms].sort(
      (a, b) => Number(a.RoomIndex ?? a.roomIndex ?? 0) - Number(b.RoomIndex ?? b.roomIndex ?? 0),
    )
    const perRoom = []
    for (let i = 0; i < roomCount; i++) {
      const r = roomOpts[i] ?? roomOpts[0] ?? {}
      const minAdults = Number(r.Adults ?? r.adults ?? 1)
      const code = firstRoomCodeFromRoom(sorted[i] ?? rooms[i], minAdults)
      if (!code) {
        perRoom.length = 0
        break
      }
      perRoom.push(code)
    }
    if (perRoom.length === roomCount) sets.push(perRoom)
  }

  const seen = new Set()
  const out = []
  for (const s of sets) {
    const k = JSON.stringify(s)
    if (!seen.has(k)) {
      seen.add(k)
      out.push(s)
    }
  }
  return out
}

/** GetHotelRoomPrices yanıtından validate için RoomCode adayları (tek oda / yedek). */
export function pickHotelRoomOfferKeyCandidates(payload, roomOpts = [{}]) {
  const roomCount = Array.isArray(roomOpts) ? roomOpts.length : 1
  const minAdults = roomOpts.reduce((m, r) => Math.max(m, r.Adults ?? r.adults ?? 1), 1)
  const hotel = hotelNodeFromPayload(payload)
  if (!hotel) return []

  if (roomCount > 1) {
    const comboSets = pickHotelRoomCombinationSets(payload, roomOpts)
    if (comboSets.length) return comboSets[0]
  }

  const rooms = hotel?.Rooms ?? hotel?.rooms
  if (!Array.isArray(rooms)) return []
  const candidates = []
  for (const room of rooms) {
    const code = firstRoomCodeFromRoom(room, minAdults)
    if (code) candidates.push(code)
    const alts = room?.RoomAlternatives ?? room?.roomAlternatives
    if (!Array.isArray(alts)) continue
    for (const alt of alts) {
      const altCode = roomCodeFromAlt(alt)
      if (!altCode) continue
      const allotment = Number(alt?.Allotment ?? alt?.allotment ?? 9)
      if (allotment >= minAdults) candidates.push(altCode)
    }
    if (candidates.length && roomCount === 1) break
  }
  return [...new Set(candidates)]
}

/** İlk uygun teklif(ler) — çok odada RoomCombinations öncelikli. */
export function pickHotelRoomOfferKeys(payload, roomCount = 1, roomOpts = [{}]) {
  if (roomCount > 1) {
    const sets = pickHotelRoomCombinationSets(payload, roomOpts)
    if (sets.length) return sets[0]
    const c = pickHotelRoomOfferKeyCandidates(payload, roomOpts)
    return c.length >= roomCount ? c.slice(0, roomCount) : c
  }
  const c = pickHotelRoomOfferKeyCandidates(payload, roomOpts)
  return c.length ? [c[0]] : []
}

/** ValidateHotelRoomsV2 yanıtından BookHotel ResultKeys — oda başına ilk RoomCode. */
export function pickHotelBookResultKeys(validatePayload, fallbackKeys = []) {
  const r = validatePayload?.Result ?? validatePayload?.result ?? validatePayload
  const keys = []
  for (const h of r?.Hotels ?? r?.hotels ?? []) {
    for (const room of h?.Rooms ?? h?.rooms ?? []) {
      const alts = room?.RoomAlternatives ?? room?.roomAlternatives ?? []
      for (const alt of alts) {
        const code = alt?.RoomCode ?? alt?.roomCode
        if (code && String(code).includes('@')) {
          keys.push(String(code))
          break
        }
      }
    }
  }
  if (keys.length) return keys
  return (fallbackKeys ?? []).map(String).filter(Boolean)
}

/** Tek odalı book: validate sonrası PackageId alanına yazılacak RoomCode. */
export function pickHotelPostValidatePackageId(validatePayload, fallbackKey = null) {
  const keys = pickHotelBookResultKeys(validatePayload, fallbackKey ? [fallbackKey] : [])
  return keys[0] ?? (fallbackKey != null ? String(fallbackKey) : null)
}

/** GetPaymentOptions → BookHotel PaymentInfo adayları. */
export async function resolveHotelPaymentAttempts(cfg, tokenCode, resultKeys) {
  const attempts = [
    {
      label: 'agency-2',
      info: { PaymentType: 2, PaymentItemId: '1', PaymentCommissionType: 0 },
    },
  ]
  try {
    const payOpts = await getHotelPaymentOptions(cfg, tokenCode, { resultKeys })
    const raw = payOpts?.Result ?? payOpts?.result ?? payOpts
    const items = raw?.PaymentOptions ?? raw?.Items ?? raw?.paymentOptions ?? []
    const list = Array.isArray(items) ? items : []
    for (const item of list.slice(0, 4)) {
      attempts.unshift({
        label: `api-pay-${item.PaymentType ?? item.paymentType ?? 'x'}`,
        info: {
          PaymentType: item.PaymentType ?? item.paymentType ?? 2,
          PaymentItemId: String(item.PaymentItemId ?? item.Id ?? item.PaymentItemID ?? '1'),
          PaymentCommissionType: item.PaymentCommissionType ?? 0,
        },
      })
    }
  } catch {
    /* sandbox default */
  }
  return attempts
}

/** ValidateHotelRoomsV2 / SearchHotel sonrası BookHotel için PackageId (RoomCode result key). */
export function pickHotelPackageId(validatePayload, searchRow = null, validatedKeys = []) {
  if (validatedKeys.length === 1) return String(validatedKeys[0])
  if (validatedKeys.length > 1) return String(validatedKeys[0])

  const r = validatePayload?.Result ?? validatePayload?.result ?? validatePayload
  const hotels = r?.Hotels ?? r?.hotels ?? []
  for (const h of hotels) {
    const rooms = h?.Rooms ?? h?.rooms ?? []
    for (const room of rooms) {
      const alts = room?.RoomAlternatives ?? room?.roomAlternatives ?? []
      for (const alt of alts) {
        const code = alt?.RoomCode ?? alt?.roomCode
        if (code && String(code).includes('@')) return String(code)
        const combo = alt?.CombinationId ?? alt?.combinationId
        if (combo) return String(combo)
        const pid = alt?.PackageId ?? alt?.packageId ?? alt?.Data?.PackageId
        if (pid) return String(pid)
      }
    }
  }

  const hotel = r?.Hotel ?? r?.hotel
  return (
    r?.PackageId ??
    r?.packageId ??
    r?.Id ??
    r?.id ??
    hotel?.PackageId ??
    hotel?.packageId ??
    searchRow?.PackageId ??
    searchRow?.packageId ??
    null
  )
}

/** BookHotel — oda/kişi sayısına göre HotelRoomPaxes (sertifikasyon testi). */
export function buildHotelRoomPaxes(roomOpts, makePaxFn) {
  const rooms = Array.isArray(roomOpts) ? roomOpts : [roomOpts]
  const out = []
  const adultNames = [
    ['TEST', 'TRAVELER'],
    ['JOHN', 'SMITH'],
    ['MARY', 'SMITH'],
    ['ALEX', 'BROWN'],
  ]
  const childNames = [
    ['TIM', 'SMITH'],
    ['ANN', 'SMITH'],
    ['KATE', 'BROWN'],
    ['MAX', 'BROWN'],
  ]
  let globalNameIdx = 0
  for (let ri = 0; ri < rooms.length; ri++) {
    const r = rooms[ri]
    const adults = Number(r.Adults ?? r.adults ?? 2)
    const children = Number(r.Children ?? r.children ?? 0)
    const childAges = Array.isArray(r.ChildAges) ? r.ChildAges : r.childAges ?? []
    const paxes = []
    let roomLeaderLast = 'SMITH'
    for (let i = 0; i < adults; i++) {
      const [fn, ln] = adultNames[globalNameIdx % adultNames.length] ?? ['JOHN', 'SMITH']
      globalNameIdx++
      if (i === 0) roomLeaderLast = ln
      const pax = makePaxFn(fn, ln, '15.06.1990', 1)
      pax.Age = 30
      if (pax.IdentityNumber != null) pax.IdentityNumber = String(pax.IdentityNumber)
      paxes.push({
        RecId: 0,
        IsLeader: ri === 0 && i === 0,
        PaxType: 0,
        Pax: pax,
      })
    }
    for (let i = 0; i < children; i++) {
      const age = Number(childAges[i] ?? 5)
      const y = new Date().getUTCFullYear() - age
      const [fn] = childNames[i % childNames.length] ?? ['TIM', 'SMITH']
      const ln = roomLeaderLast
      const pax = makePaxFn(fn, ln, `15.06.${y}`, 1)
      pax.Age = age
      pax.ChildAge = age
      pax.IdentityNumber = null
      paxes.push({
        RecId: 0,
        IsLeader: false,
        PaxType: 1,
        Pax: pax,
      })
    }
    const roomIndex = Number(r.RoomIndex ?? r.Index ?? ri)
    out.push({ RoomIndex: roomIndex, Paxes: paxes })
  }
  return out
}

// ─── TRANSFER ─────────────────────────────────────────────────────────────────
// Stoplight: https://kplus.stoplight.io/docs/travelrobot/47993e9b38063-travelrobot-transfer-api
//
// Akış: createToken → searchTransfer → validateTransferOffer
//       → getTransferPaymentOptions → bookTransfer → getBooking

/**
 * Transfer arama — havalimanı/lokasyon bazlı transfer teklifleri.
 * Stoplight: /docs/travelrobot/5aa8dec2df1f4-search-transfer
 * opts: {
 *   pickupLocationCode, dropoffLocationCode, pickupType, dropoffType,
 *   transferDate, returnDate (roundtrip ise),
 *   paxCount, flightNumber, languageCode
 * }
 */
export async function searchTransfer(cfg, tokenCode, opts = {}) {
  // Gerçek şema (Transfer.json /SearchTransfer):
  //   request.Paxes[] = { PaxType: "0"=ADT/"1"=CHD, Count, ChildAgeList? }
  //   request.Points[] = { Date: "DD.MM.YYYY HH:mm",
  //                        PickUpPoint/DropOffPoint = { PlaceId, GeoLocation:{Latitude,Longitude} } }
  //   request.SearchType: "0"=Oneway / "1"=Roundtrip
  const paxes = opts.paxes ?? (() => {
    const out = [{ PaxType: '0', Count: String(opts.adults ?? 2) }]
    if ((opts.children ?? 0) > 0) {
      out.push({ PaxType: '1', Count: String(opts.children), ChildAgeList: opts.childAges ?? [] })
    }
    return out
  })()

  const points = opts.points ?? [
    {
      Date: opts.transferDate || `${formatDate(addDays(7))} 14:00`,
      PickUpPoint: {
        PlaceId: opts.pickupPlaceId,
        GeoLocation: { Latitude: opts.pickupLat, Longitude: opts.pickupLng },
      },
      DropOffPoint: {
        PlaceId: opts.dropoffPlaceId,
        GeoLocation: { Latitude: opts.dropoffLat, Longitude: opts.dropoffLng },
      },
    },
  ]

  return kplusPost(cfg.baseUrl, '/Transfer.svc/Rest/Json/SearchTransfer', {
    request: {
      Token: tokenObj(tokenCode),
      SearchType: opts.searchType != null ? String(opts.searchType) : '0',
      Paxes: paxes,
      Points: points,
    },
  })
}

/**
 * Transfer teklifini doğrula — fiyat kilitleme.
 * Stoplight: /docs/travelrobot/6f7b1f21ea979-validate-offer
 * opts: { offerId, languageCode }
 */
export async function validateTransferOffer(cfg, tokenCode, opts = {}) {
  // Gerçek endpoint: Transfer.svc /Validate → request.Transfer.ResultKey, request.Token
  return kplusPost(cfg.baseUrl, '/Transfer.svc/Rest/Json/Validate', {
    request: {
      Token: tokenObj(tokenCode),
      Transfer: { ResultKey: opts.resultKey ?? opts.offerId },
    },
  })
}

/**
 * Transfer için ödeme seçenekleri.
 * Stoplight: /docs/travelrobot/4114cb1a95fd4-payment-options
 * opts: { offerId, languageCode }
 */
export async function getTransferPaymentOptions(cfg, tokenCode, opts = {}) {
  // Gerçek şema: request.{ ResultKeys[], TokenCode }
  return kplusPost(cfg.baseUrl, '/Transfer.svc/Rest/Json/GetPaymentOptions', {
    request: {
      TokenCode: tokenCode,
      ResultKeys: opts.resultKeys ?? (opts.resultKey ? [opts.resultKey] : []),
    },
  })
}

/**
 * Transfer rezervasyonu yap.
 * Stoplight: /docs/travelrobot/c5a31f896f3d3-book-transfer
 * opts: {
 *   tokenCode, offerId,
 *   paxes: [{ isLeader, pax: { firstName, lastName, dateOfBirth, ... } }],
 *   contactInfo, invoiceInfo, paymentInfo, flightNumber, languageCode
 * }
 */
export async function bookTransfer(cfg, opts = {}) {
  // Gerçek endpoint: Transfer.svc /Book
  //   request.{ ContactInfo, ExtraInfo:{TransferMeeting:{Points,WelComeName}},
  //             InvoiceInfo, PaxInfo:{TransferPaxes:[{Pax,TransferPaxType}]},
  //             PaymentInfo:{PaymentType}, ResultKeys[], TokenCode }
  return kplusPost(cfg.baseUrl, '/Transfer.svc/Rest/Json/Book', {
    request: {
      TokenCode: opts.tokenCode,
      ResultKeys: opts.resultKeys ?? (opts.resultKey ? [opts.resultKey] : []),
      ContactInfo: opts.contactInfo,
      InvoiceInfo: opts.invoiceInfo,
      PaxInfo: { TransferPaxes: opts.transferPaxes ?? opts.paxes ?? [] },
      ...(opts.extraInfo ? { ExtraInfo: opts.extraInfo } : {}),
      PaymentInfo: opts.paymentInfo ?? { PaymentType: '2' },
    },
  })
}

/**
 * Transfer booking'i sorgula.
 * Stoplight: /docs/travelrobot/4aebc2eecb734-get-booking
 * opts: { systemPnr, pnr, languageCode }
 */
export async function getTransferBooking(cfg, tokenCode, opts = {}) {
  // Gerçek endpoint: Transfer.svc /GetBooking → request.{ TokenCode, SystemPnr, LastName }
  return kplusPost(cfg.baseUrl, '/Transfer.svc/Rest/Json/GetBooking', {
    request: {
      TokenCode: tokenCode,
      SystemPnr: opts.systemPnr ?? null,
      LastName: opts.lastName ?? null,
    },
  })
}

export function pickTransferRows(payload) {
  const p = payload?.Result ?? payload?.result ?? payload
  if (Array.isArray(p)) return p
  if (!p || typeof p !== 'object') return []
  for (const k of ['Transfers', 'transfers', 'Offers', 'offers', 'Items', 'items', 'Results', 'results']) {
    if (Array.isArray(p[k])) return p[k]
  }
  return []
}

// ─── UÇUŞ EK ENDPOINT'LER ─────────────────────────────────────────────────────

/**
 * Fare kuralları — seçilen uçuş için taşıyıcı kural metinleri.
 * Stoplight: /docs/travelrobot/ab6511356b7a1-get-fare-rules
 * opts: { resultKey, languageCode }
 */
export async function getFareRules(cfg, tokenCode, opts = {}) {
  return kplusPost(cfg.baseUrl, '/Air.svc/Rest/Json/GetFareRules', {
    request: {
      Token: tokenObj(tokenCode),
      ResultKey: opts.resultKey,
      LanguageCode: opts.languageCode ?? 'tr',
    },
  })
}

/**
 * Ödeme seçenekleri — rezervasyon öncesi mevcut ödeme yöntemleri.
 * opts: { resultKeys, languageCode }
 */
export async function getPaymentOptions(cfg, tokenCode, opts = {}) {
  // Gerçek endpoint: Air.svc /GetPaymentOptions
  return kplusPost(cfg.baseUrl, '/Air.svc/Rest/Json/GetPaymentOptions', {
    request: {
      Token: tokenObj(tokenCode),
      ResultKeys: opts.resultKeys ?? [],
    },
  })
}

/**
 * Uçuş rezervasyonu getir — sistemdeki mevcut rezervasyon bilgisi.
 * Stoplight slug: /docs/travelrobot/98490cfda1311-retrieve-reservation
 * opts: { systemPnr, pnr, languageCode }
 */
export async function getReservation(cfg, tokenCode, opts = {}) {
  // Gerçek şema: request.{ TokenCode, SystemPnr, LastName }
  return kplusPost(cfg.baseUrl, '/Air.svc/Rest/Json/RetrieveReservation', {
    request: {
      TokenCode: tokenCode,
      SystemPnr: opts.systemPnr ?? null,
      LastName: opts.lastName ?? null,
    },
  })
}

/**
 * Uçuş rezervasyonu iptal — bilet kesilmeden önce.
 * opts: { tokenCode, systemPnr, languageCode }
 */
export async function cancelFlightReservation(cfg, opts = {}) {
  return kplusPost(cfg.baseUrl, '/Air.svc/Rest/Json/CancelReservation', {
    request: {
      TokenCode: opts.tokenCode,
      SystemPnr: opts.systemPnr,
      LastName: opts.lastName ?? null,
    },
  })
}

/**
 * Bilet iptali (void) — bilet kesildikten sonra iptal.
 * opts: { tokenCode, systemPnr, ticketNumbers, languageCode }
 */
export async function voidTicket(cfg, opts = {}) {
  // Gerçek endpoint: Air.svc /Void → request.{ TokenCode, SystemPnr, LastName }
  return kplusPost(cfg.baseUrl, '/Air.svc/Rest/Json/Void', {
    request: {
      TokenCode: opts.tokenCode,
      SystemPnr: opts.systemPnr,
      LastName: opts.lastName ?? null,
    },
  })
}

/**
 * Rezervasyon/booking sorgula — genel (tüm ürün tipleri).
 * opts: { systemPnr, pnr, productType, languageCode }
 */
export async function getBooking(cfg, tokenCode, opts = {}) {
  // GetBooking: Air/Transfer → /GetBooking, Hotel → /GetHotelBooking, Tour → (Stoplight'ta yok)
  // Genel kullanımda servis seçilebilir; varsayılan Air.
  const svc = opts.svcPath ?? '/Air.svc/Rest/Json/GetBooking'
  return kplusPost(cfg.baseUrl, svc, {
    request: {
      TokenCode: tokenCode,
      SystemPnr: opts.systemPnr ?? null,
      LastName: opts.lastName ?? null,
    },
  })
}
