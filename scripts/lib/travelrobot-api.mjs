/**
 * Travelrobot / KPlus API istemcisi.
 *
 * Sandbox base URL: http://sandbox.kplus.com.tr/kplus/v0
 * Canlı base URL:   https://api.kplus.com.tr/kplus/v0  (ya da panel'den)
 *
 * Kimlik: panel site_settings.listing_api_providers.travelrobot veya TRAVELROBOT_* env.
 *
 * Akışlar:
 *   Tur:   createToken → searchTours → getTourPrices → getTourExtras
 *          → getTourFinalPrice → getPickupPoints → bookTour
 *   Otel:  createToken → searchHotel → getHotelDetails → getHotelRooms → bookHotel
 *   Uçuş:  createToken → searchFlightItinerary → getFlightBrandedFares
 *          → validateFlight → createFlightReservation → issueTicket
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

async function kplusPost(baseUrl, svcPath, body) {
  const url = joinUrl(baseUrl, svcPath)
  const res = await fetch(url, {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
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
    const msg = json?.ErrorMessage || json?.UserFriendlyErrorMessage || json?.Message || text.slice(0, 300) || res.statusText
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

function tokenObj(tokenCode) {
  return { TokenCode: tokenCode }
}

// ─── AUTH ─────────────────────────────────────────────────────────────────────

/**
 * Token oluştur — geçerlilik süresi ~120 dakika.
 * Her kullanıcı için ayrı token oluşturulmalıdır.
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
  })
}

/**
 * Tur detayı — belirli bir tur kodu için tam bilgi.
 * DetailTypes: 0=Genel, 1=Program, 2=Dahilolmayanlar, 3=Dahilolanlar,
 *   4=Önemlinotlar, 5=Fiyatnotları, 6=Görseller, 7=Belgeler, 10=Kalkışnoktaları
 */
export async function getTourDetails(cfg, tokenCode, tourCode, opts = {}) {
  return kplusPost(cfg.baseUrl, '/Tour.svc/Rest/Json/GetTourDetails', {
    request: {
      TourCode: tourCode,
      Token: tokenObj(tokenCode),
      DetailTypes: opts.detailTypes ?? [0, 1, 2, 3, 4, 5, 6, 7, 10],
      LanguageCode: opts.languageCode ?? 'tr',
    },
  })
}

/**
 * Tur fiyatları — belirli tarih + oda/kişi kombinasyonu için fiyatlar.
 * opts: { tourAlternativeCode, nationalityCode, departureDate, departurePointCode,
 *          rooms: [{ index, paxes: [{ paxType, count, childAgeList }] }],
 *          languageCode }
 */
export async function getTourPrices(cfg, tokenCode, opts = {}) {
  return kplusPost(cfg.baseUrl, '/Tour.svc/Rest/Json/GetTourPrices', {
    request: {
      Id: null,
      Token: tokenObj(tokenCode),
      TourAlternativeCode: opts.tourAlternativeCode ?? null,
      NationalityCode: opts.nationalityCode ?? null,
      DepartureDate: opts.departureDate ?? null,
      DeparturePoint: opts.departurePointCode
        ? { Code: opts.departurePointCode, HotpointType: 0 }
        : { Code: null, HotpointType: 0 },
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
  })
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
  })
}

/**
 * Tur nihai fiyatı — ekstralar ve kalkış noktası seçiminden sonra.
 * opts: { packageId, productType, resultKeys, rooms, additionalServices }
 */
export async function getTourFinalPrice(cfg, tokenCode, opts = {}) {
  return kplusPost(cfg.baseUrl, '/Tour.svc/Rest/Json/GetTourFinalPrice', {
    request: {
      Token: tokenObj(tokenCode),
      PackageId: opts.packageId,
      ProductType: opts.productType ?? 2,
      ResultKeys: opts.resultKeys ?? null,
      Rooms: opts.rooms ?? [
        { Index: 0, Paxes: [{ PaxType: 0, Count: 2, ChildAgeList: null }] },
      ],
      AdditionalServices: opts.additionalServices ?? [],
    },
  })
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
export async function bookTour(cfg, opts = {}) {
  return kplusPost(cfg.baseUrl, '/Tour.svc/Rest/Json/BookTour', {
    request: {
      ProcessId: null,
      Version: opts.version ?? '2.0',
      ProductType: opts.productType ?? 2,
      TokenCode: opts.tokenCode,
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
      ExtraInfo: null,
      ContactInfo: opts.contactInfo,
      InvoiceInfo: opts.invoiceInfo,
      CorporateInfo: null,
      BookingNote: opts.bookingNote ?? null,
      AgentReferenceInfo: opts.agentReferenceInfo ?? null,
      CorporatePin: null,
      ResultKeys: opts.resultKeys ?? [],
      PaymentInfo: opts.paymentInfo,
      ExtraNote: null,
      SystemPnr: null,
      LastName: null,
      LanguageCode: opts.languageCode ?? 'tr',
      WithPrice: false,
    },
  })
}

export function pickTourRows(payload) {
  const p = payload?.Result ?? payload?.result ?? payload
  if (Array.isArray(p)) return p
  if (!p || typeof p !== 'object') return []
  for (const k of ['Tours', 'tours', 'Items', 'items', 'SearchResults', 'searchResults']) {
    if (Array.isArray(p[k])) return p[k]
  }
  return []
}

// ─── OTEL ─────────────────────────────────────────────────────────────────────

/**
 * Otel arama — destinasyon + tarih + oda/kişi.
 * Test destinasyonları: 531096=Prague, 587926=Berlin, 10033097=Istanbul
 * Test otel kodları: KTR431805, KTR672265 (Istanbul); KCZ466838, KCZ639147 (Prague); ...
 *
 * opts: { checkInDate, checkOutDate, destinationId, hotelCode, rooms, languageCode }
 */
export async function searchHotel(cfg, tokenCode, opts = {}) {
  const checkin = opts.checkInDate || formatDate(addDays(30))
  const checkout = opts.checkOutDate || formatDate(addDays(37))
  return kplusPost(
    cfg.baseUrl,
    opts.endpoint ?? '/Hotel.svc/Rest/Json/SearchHotel',
    {
      filter: {
        Token: tokenObj(tokenCode),
        SearchType: 0,
        CheckInDate: checkin,
        CheckOutDate: checkout,
        ...(opts.destinationId != null && { DestinationId: opts.destinationId }),
        ...(opts.hotelCode && { HotelCode: opts.hotelCode }),
        Rooms: opts.rooms ?? [
          { RoomIndex: 0, Adults: 2, Children: 0, ChildAges: null },
        ],
        AdvancedOptions: {
          ProviderType: 0,
          LanguageCode: opts.languageCode ?? 'tr',
          MaxResponseTime: 0,
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
export async function getHotelDetails(cfg, tokenCode, hotelCode, opts = {}) {
  return kplusPost(cfg.baseUrl, '/Hotel.svc/Rest/Json/GetHotelDetails', {
    request: {
      Token: tokenObj(tokenCode),
      HotelCode: hotelCode,
      LanguageCode: opts.languageCode ?? 'tr',
    },
  })
}

/**
 * Otel oda tipleri + fiyat — belirli bir otel + tarih için.
 * opts: { hotelCode, checkInDate, checkOutDate, rooms, nationalityCode, languageCode }
 */
export async function getHotelRooms(cfg, tokenCode, opts = {}) {
  const checkin = opts.checkInDate || formatDate(addDays(30))
  const checkout = opts.checkOutDate || formatDate(addDays(37))
  return kplusPost(cfg.baseUrl, '/Hotel.svc/Rest/Json/GetHotelRooms', {
    request: {
      Token: tokenObj(tokenCode),
      HotelCode: opts.hotelCode,
      CheckInDate: checkin,
      CheckOutDate: checkout,
      Rooms: opts.rooms ?? [
        { RoomIndex: 0, Adults: 2, Children: 0, ChildAges: null },
      ],
      NationalityCode: opts.nationalityCode ?? null,
      LanguageCode: opts.languageCode ?? 'tr',
    },
  })
}

/**
 * Otel nihai fiyat doğrulama — rezervasyon öncesi fiyat kilidleme.
 * opts: { packageId, languageCode }
 */
export async function getHotelFinalPrice(cfg, tokenCode, opts = {}) {
  return kplusPost(cfg.baseUrl, '/Hotel.svc/Rest/Json/GetHotelFinalPrice', {
    request: {
      Token: tokenObj(tokenCode),
      PackageId: opts.packageId,
      LanguageCode: opts.languageCode ?? 'tr',
    },
  })
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
export async function bookHotel(cfg, opts = {}) {
  return kplusPost(cfg.baseUrl, '/Hotel.svc/Rest/Json/BookHotel', {
    request: {
      ProcessId: null,
      Version: '2.0',
      ProductType: 1,
      TokenCode: opts.tokenCode,
      PackageId: opts.packageId,
      PaxInfo: {
        HotelRoomPaxes: opts.hotelRoomPaxes ?? [],
        FlightPaxes: null,
        CarPax: null,
        TourRoomPaxes: null,
        TransferPaxes: null,
        PackagePaxes: null,
        VisaPaxes: null,
        ActivityPaxes: null,
      },
      ContactInfo: opts.contactInfo,
      InvoiceInfo: opts.invoiceInfo,
      CorporateInfo: null,
      BookingNote: opts.bookingNote ?? null,
      AgentReferenceInfo: opts.agentReferenceInfo ?? null,
      PaymentInfo: opts.paymentInfo,
      LanguageCode: opts.languageCode ?? 'tr',
      WithPrice: false,
    },
  })
}

export function pickHotelRows(payload) {
  const p = payload?.Result ?? payload?.result ?? payload
  if (Array.isArray(p)) return p
  if (!p || typeof p !== 'object') return []
  for (const k of ['Hotels', 'hotels', 'HotelList', 'hotelList', 'Items', 'items', 'Results', 'results']) {
    if (Array.isArray(p[k])) return p[k]
  }
  return []
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
  const legs = (opts.legs ?? [{ originCode: 'IST', destinationCode: 'LHR', departureDate: formatDate(addDays(30)) }])
    .map((l) => ({
      OriginCode: l.originCode,
      DestinationCode: l.destinationCode,
      DepartureDate: l.departureDate,
    }))

  const paxes = []
  if ((opts.adults ?? 1) > 0) paxes.push({ PaxType: 0, Count: opts.adults ?? 1 }) // ADT
  if ((opts.children ?? 0) > 0) paxes.push({ PaxType: 1, Count: opts.children, ChildAgeList: opts.childAges ?? null })
  if ((opts.infants ?? 0) > 0) paxes.push({ PaxType: 2, Count: opts.infants })

  return kplusPost(
    cfg.baseUrl,
    opts.endpoint ?? '/Flight.svc/Rest/Json/SearchItinerary',
    {
      filter: {
        Token: tokenObj(tokenCode),
        FlightType: opts.flightType ?? 0,
        ResultType: opts.resultType ?? 0,
        Legs: legs,
        Paxes: paxes,
        CabinClass: opts.cabinClass ?? 0,
        OnlyDirects: opts.onlyDirects ?? false,
        AdvancedOptions: {
          ProviderType: 0,
          LanguageCode: opts.languageCode ?? 'tr',
          MaxResponseTime: 0,
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
  return kplusPost(cfg.baseUrl, '/Flight.svc/Rest/Json/GetBrandedFares', {
    request: {
      Token: tokenObj(tokenCode),
      ResultKey: opts.resultKey,
      LanguageCode: opts.languageCode ?? 'tr',
    },
  })
}

/**
 * Uçuş doğrulama — fiyat ve müsaitlik kilitleme.
 * opts: { resultKeys: [...], languageCode }
 */
export async function validateFlight(cfg, tokenCode, opts = {}) {
  return kplusPost(cfg.baseUrl, '/Flight.svc/Rest/Json/ValidateFlight', {
    request: {
      Token: tokenObj(tokenCode),
      ResultKeys: opts.resultKeys ?? [],
      LanguageCode: opts.languageCode ?? 'tr',
    },
  })
}

/**
 * Uçuş rezervasyon oluşturma.
 * opts: {
 *   tokenCode, resultKeys,
 *   flightPaxes: [{ paxType, pax: { firstName, lastName, dateOfBirth, ... } }],
 *   contactInfo, invoiceInfo, paymentInfo, languageCode
 * }
 */
export async function createFlightReservation(cfg, opts = {}) {
  return kplusPost(cfg.baseUrl, '/Flight.svc/Rest/Json/CreateReservation', {
    request: {
      ProcessId: null,
      Version: '2.0',
      ProductType: 0,
      TokenCode: opts.tokenCode,
      PaxInfo: {
        HotelRoomPaxes: null,
        FlightPaxes: opts.flightPaxes ?? [],
        CarPax: null,
        TourRoomPaxes: null,
        TransferPaxes: null,
        PackagePaxes: null,
        VisaPaxes: null,
        ActivityPaxes: null,
      },
      ContactInfo: opts.contactInfo,
      InvoiceInfo: opts.invoiceInfo,
      CorporateInfo: null,
      BookingNote: opts.bookingNote ?? null,
      AgentReferenceInfo: opts.agentReferenceInfo ?? null,
      ResultKeys: opts.resultKeys ?? [],
      PaymentInfo: opts.paymentInfo,
      LanguageCode: opts.languageCode ?? 'tr',
      WithPrice: false,
    },
  })
}

/**
 * Bilet kese (rezervasyondan) — SystemPNR ile.
 * opts: { tokenCode, systemPnr, languageCode }
 */
export async function issueTicketFromReservation(cfg, opts = {}) {
  return kplusPost(cfg.baseUrl, '/Flight.svc/Rest/Json/IssueTicketFromReservation', {
    request: {
      TokenCode: opts.tokenCode,
      SystemPnr: opts.systemPnr,
      LanguageCode: opts.languageCode ?? 'tr',
    },
  })
}

/**
 * Bilet direkt kese — rezervasyon olmadan (tek adım).
 * opts: { tokenCode, resultKeys, flightPaxes, contactInfo, invoiceInfo, paymentInfo, languageCode }
 */
export async function issueTicketDirect(cfg, opts = {}) {
  return kplusPost(cfg.baseUrl, '/Flight.svc/Rest/Json/IssueTicketDirect', {
    request: {
      ProcessId: null,
      Version: '2.0',
      ProductType: 0,
      TokenCode: opts.tokenCode,
      PaxInfo: {
        HotelRoomPaxes: null,
        FlightPaxes: opts.flightPaxes ?? [],
        CarPax: null,
        TourRoomPaxes: null,
        TransferPaxes: null,
        PackagePaxes: null,
        VisaPaxes: null,
        ActivityPaxes: null,
      },
      ContactInfo: opts.contactInfo,
      InvoiceInfo: opts.invoiceInfo,
      CorporateInfo: null,
      BookingNote: opts.bookingNote ?? null,
      AgentReferenceInfo: opts.agentReferenceInfo ?? null,
      ResultKeys: opts.resultKeys ?? [],
      PaymentInfo: opts.paymentInfo,
      LanguageCode: opts.languageCode ?? 'tr',
      WithPrice: false,
    },
  })
}

export function pickFlightRows(payload) {
  const p = payload?.Result ?? payload?.result ?? payload
  if (Array.isArray(p)) return p
  if (!p || typeof p !== 'object') return []
  for (const k of ['Flights', 'flights', 'FlightList', 'flightList', 'Items', 'items', 'Results', 'results', 'Itineraries', 'itineraries']) {
    if (Array.isArray(p[k])) return p[k]
  }
  return []
}

/**
 * Fare kuralları — seçilen uçuş için taşıyıcı kural metinleri.
 * opts: { resultKey, languageCode }
 */
export async function getFareRules(cfg, tokenCode, opts = {}) {
  return kplusPost(cfg.baseUrl, '/Flight.svc/Rest/Json/GetFareRules', {
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
  return kplusPost(cfg.baseUrl, '/Flight.svc/Rest/Json/GetPaymentOptions', {
    request: {
      Token: tokenObj(tokenCode),
      ResultKeys: opts.resultKeys ?? [],
      LanguageCode: opts.languageCode ?? 'tr',
    },
  })
}

/**
 * Rezervasyon getir — sistemdeki mevcut rezervasyon bilgisi.
 * opts: { systemPnr, pnr, languageCode }
 */
export async function getReservation(cfg, tokenCode, opts = {}) {
  return kplusPost(cfg.baseUrl, '/General.svc/Rest/Json/GetReservation', {
    request: {
      Token: tokenObj(tokenCode),
      SystemPnr: opts.systemPnr ?? null,
      Pnr: opts.pnr ?? null,
      LanguageCode: opts.languageCode ?? 'tr',
    },
  })
}

/**
 * Uçuş rezervasyonu iptal — bilet kesilmeden önce.
 * opts: { tokenCode, systemPnr, languageCode }
 */
export async function cancelFlightReservation(cfg, opts = {}) {
  return kplusPost(cfg.baseUrl, '/Flight.svc/Rest/Json/CancelReservation', {
    request: {
      TokenCode: opts.tokenCode,
      SystemPnr: opts.systemPnr,
      LanguageCode: opts.languageCode ?? 'tr',
    },
  })
}

/**
 * Bilet iptali (void) — bilet kesildikten sonra iptal.
 * opts: { tokenCode, systemPnr, ticketNumbers, languageCode }
 */
export async function voidTicket(cfg, opts = {}) {
  return kplusPost(cfg.baseUrl, '/Flight.svc/Rest/Json/VoidTicket', {
    request: {
      TokenCode: opts.tokenCode,
      SystemPnr: opts.systemPnr,
      TicketNumbers: opts.ticketNumbers ?? [],
      LanguageCode: opts.languageCode ?? 'tr',
    },
  })
}

/**
 * Rezervasyon/booking sorgula — genel (tüm ürün tipleri).
 * opts: { systemPnr, pnr, productType, languageCode }
 */
export async function getBooking(cfg, tokenCode, opts = {}) {
  return kplusPost(cfg.baseUrl, '/General.svc/Rest/Json/GetBooking', {
    request: {
      Token: tokenObj(tokenCode),
      SystemPnr: opts.systemPnr ?? null,
      Pnr: opts.pnr ?? null,
      ProductType: opts.productType ?? 0,
      LanguageCode: opts.languageCode ?? 'tr',
    },
  })
}
