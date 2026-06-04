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
  return kplusPost(cfg.baseUrl, '/General.svc/Rest/Json/GetCurrencies', {
    request: {
      Token: tokenObj(tokenCode),
      LanguageCode: opts.languageCode ?? 'tr',
    },
  })
}

/**
 * Desteklenen ülkeleri listele (genel — tüm modüller için).
 * Stoplight: /docs/travelrobot/fdd5368acfebc-get-countries
 * opts: { tokenCode, languageCode }
 */
export async function getCountries(cfg, tokenCode, opts = {}) {
  return kplusPost(cfg.baseUrl, '/General.svc/Rest/Json/GetCountries', {
    request: {
      Token: tokenObj(tokenCode),
      LanguageCode: opts.languageCode ?? 'tr',
    },
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

/**
 * Tur için ödeme seçenekleri — rezervasyon öncesi.
 * Stoplight: /docs/travelrobot/5q2x1mg7ulzbg-payment-options
 * opts: { packageId, languageCode }
 */
export async function getTourPaymentOptions(cfg, tokenCode, opts = {}) {
  return kplusPost(cfg.baseUrl, '/Tour.svc/Rest/Json/GetPaymentOptions', {
    request: {
      Token: tokenObj(tokenCode),
      PackageId: opts.packageId,
      LanguageCode: opts.languageCode ?? 'tr',
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
  // Gerçek şema: request.{ ProductCode, TokenCode }
  return kplusPost(cfg.baseUrl, '/Hotel.svc/Rest/Json/GetHotelDetails', {
    request: {
      ProductCode: productCode ?? opts.productCode,
      TokenCode: tokenCode,
    },
  })
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
  // Gerçek endpoint: Hotel.svc /BookHotel
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
  // Gerçek şema (Air.json /SearchAvailability):
  //   request.Legs[].DeparturePoint/ArrivalPoint = { Code, HotpointType }, Date = "DD.MM.YYYY"
  //   request.Passengers[] = { PaxType: "0"=ADT/"1"=CHD/"2"=INF, Count } (string)
  //   request.SearchType: "0"=Oneway / "1"=Roundtrip / "2"=Multiple
  //   request.AdvancedOptions.Air = { OnlyBestFares, OnlyDirectFlights, OnlyRefundableFlights, PermittedAirlineCodes }
  const rawLegs = opts.legs ?? [
    { originCode: 'IST', destinationCode: 'LHR', departureDate: formatDate(addDays(30)) },
  ]
  const legs = rawLegs.map((l) => ({
    DeparturePoint: { Code: l.originCode ?? l.departurePointCode, HotpointType: String(l.departureHotpointType ?? 1) },
    ArrivalPoint: { Code: l.destinationCode ?? l.arrivalPointCode, HotpointType: String(l.arrivalHotpointType ?? 1) },
    Date: l.departureDate ?? l.date,
  }))

  const passengers = []
  if ((opts.adults ?? 1) > 0) passengers.push({ PaxType: '0', Count: String(opts.adults ?? 1) })
  if ((opts.children ?? 0) > 0) passengers.push({ PaxType: '1', Count: String(opts.children) })
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

/**
 * Uçuş rezervasyon oluşturma.
 * opts: {
 *   tokenCode, resultKeys,
 *   flightPaxes: [{ paxType, pax: { firstName, lastName, dateOfBirth, ... } }],
 *   contactInfo, invoiceInfo, paymentInfo, languageCode
 * }
 */
export async function createFlightReservation(cfg, opts = {}) {
  // Gerçek endpoint: Air.svc /Book
  return kplusPost(cfg.baseUrl, '/Air.svc/Rest/Json/Book', {
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
  return kplusPost(cfg.baseUrl, '/Air.svc/Rest/Json/IssueTicketDirect', {
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
  // GetBooking her serviste ayrı: Air.svc/Transfer.svc /GetBooking, Hotel.svc /GetHotelBooking.
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
