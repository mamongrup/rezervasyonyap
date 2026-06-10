# API sağlayıcı notları (entegrasyon planı)

> Kenara alınan kararlar — GTC + Travelrobot + Turna ayrı ilan akışı.

## Genel kural

- Her sağlayıcı **ayrı** ilan çeker; aynı ürün iki sağlayıcıdan gelirse **iki ayrı listing** olur (birleştirme yok).
- Kimlik: `listing_source = 'api'`, `external_provider_code` = sağlayıcı kodu, `external_listing_ref` = sağlayıcıdaki benzersiz ref.
- Unique index: `(organization_id, external_provider_code, external_listing_ref)` — modül 196.
- İkisi de vitrinde `published` olabilir; checkout/rezervasyon listing’in `external_provider_code`’una göre doğru API’ye gider.

## Sağlayıcılar

| Kod | Auth | Kategoriler | Proje durumu |
|-----|------|-------------|--------------|
| `gtc` | `AgencyId` + `Password` | Otel, uçak | `scripts/lib/gtc-api.mjs`, `296_gtc_provider_refs.sql`, import iskeleti |
| `travelrobot` | `ChannelCode` + `ChannelPassword` → Token (~120 dk) | Tur, otel, uçak, araç kiralama | Import + senaryo testi (`scripts/import-travelrobot-*.mjs`, `test-travelrobot-scenarios.mjs`); checkout book henüz yok |
| `wtatil` | `ApplicationSecretKey` + `UserName` + `Password` → Token (24 saat) | **Tur** (plan: yalnızca tur; v2 API otel/uçak da sunuyor — kullanmayacağız) | `scripts/lib/wtatil-api.mjs`, `scripts/import-wtatil-tours.mjs`; DB hazır (`wtatil_package_ref`, 180) |
| `turna` | `ApiKey` + `Turna-Session-Id` / `Turna-Session-Token` | **Yalnızca uçak** | `import-turna-flights.mjs`, `turna-flight-routes.json` |
| `yolcu360` | `API Key` + `API Secret` → JWT | **Araç kiralama** | Import + canlı arama proxy; rezervasyon API henüz yok (checkout draft) |

## GTC ortam

```powershell
$env:GTC_BASE_URL = "https://api.gtcreservation.com"
$env:GTC_AGENCY_ID = "..."
$env:GTC_PASSWORD = "..."
```

Bkz. `docs/GTC-API.md`.

## Travelrobot / KPlus ortam

İki ayrı API vardır:

| Ortam | Base URL | Kimlik | Kullanım |
|-------|----------|--------|----------|
| **Canlı Booking** | `https://api.bookingagora.com/v0` | `ChannelCode` + `ChannelPassword` → CreateTokenV2 | Tur/otel/uçak arama, validate, book |
| **Statik içerik** | `https://static.travelchain.online/api` | Header `user` + `pwd` → `/token/authenticate` | Otel kodları, destinasyonlar, zenginleştirme |
| Sandbox (test) | `http://sandbox.kplus.com.tr/kplus/v0/` | Test kanalı | Sertifikasyon senaryoları |

Booking token: `General.svc/Rest/Json/CreateTokenV2`  
Servis pattern: `{Service}.svc/Rest/Json/{Method}`

Panel: **Yönetim → API sağlayıcıları → Travelrobot** — `base_url`, `channel_*` ve `static_*` alanları.

Sunucu env (`backend.env` — şifreleri repoya koymayın):

```bash
TRAVELROBOT_BASE_URL=https://api.bookingagora.com/v0
TRAVELROBOT_CHANNEL_CODE=agora_MM4N
TRAVELROBOT_CHANNEL_PASSWORD=...
TRAVELROBOT_STATIC_BASE_URL=https://static.travelchain.online/api
TRAVELROBOT_STATIC_USER=BAgora_mm4N
TRAVELROBOT_STATIC_PASSWORD=...
```

DB'ye yazma ve bağlantı testi:

```bash
set -a && source /etc/rezervasyonyap/backend.env && set +a
node scripts/apply-travelrobot-live-config.mjs --dry-run
node scripts/apply-travelrobot-live-config.mjs
node scripts/ping-travelrobot-live.mjs
node scripts/import-travelrobot-hotels.mjs --dry-run --limit 5
node scripts/import-travelrobot-hotels.mjs --from-static --dry-run --limit 5
node scripts/import-travelrobot-tours.mjs --dry-run --limit 5
node scripts/import-travelrobot-flights.mjs --dry-run --limit 5
```

Canlı ortamda `SearchHotel` sandbox destinasyon ID ile **0 otel** dönebilir; import script'i otomatik olarak **Statik API kataloğuna** geçer.

### Tur ve uçuş

| Modül | Script | Not |
|-------|--------|-----|
| **Tur** | `import-travelrobot-tours.mjs` | `SearchTour` — kanalınızdaki tüm turlar |
| **Uçuş** | `import-travelrobot-flights.mjs` | Rota listesi: `scripts/config/travelrobot-flight-routes.json` |
| **Hepsi** | `import-travelrobot-all.mjs` | Panel bayraklarına göre tur+otel+uçuş |

Tek komut kurulum (config + zamanlayıcı + tur + uçuş):

```bash
chmod +x deploy/scripts/run-travelrobot-live-setup.sh
./deploy/scripts/run-travelrobot-live-setup.sh
```

Günlük otomatik senkron:

```bash
./deploy/scripts/sync-travelrobot-auto.sh
# systemd: deploy/systemd/travel-travelrobot-sync.timer
```

**Statik API hata kodları:**

| Yanıt | Anlam | Çözüm |
|-------|--------|--------|
| `Credentials are not valid` | Yanlış kullanıcı/şifre (çoğunlukla Booking kanalı denenmiş) | `static_user` / `static_password` ayrı kaydet |
| `… is not in whitelist` | Kimlik doğru, sunucu IP izinli değil | KPlus'a sunucu çıkış IP'sini (ör. `50.114.185.100`) whitelist için iletin |

## Yolcu360 / Araç kiralama

| Ortam | Base URL |
|-------|----------|
| **Canlı** | `https://api.pro.yolcu360.com/api/v1` |
| Staging | `https://staging.api.pro.yolcu360.com/api/v1` |

Kimlik: `POST /auth/login` → `{ key, secret }` → JWT. Anahtarlar: [pro.yolcu360.com](https://pro.yolcu360.com) → API Keys.

```bash
YOLCU360_BASE_URL=https://api.pro.yolcu360.com/api/v1
YOLCU360_API_KEY=...
YOLCU360_API_SECRET=...
```

Kurulum ve import:

```bash
node scripts/apply-yolcu360-live-config.mjs
node scripts/ping-yolcu360.mjs
node scripts/import-yolcu360-cars.mjs --dry-run --limit 2
node scripts/import-yolcu360-cars.mjs
./deploy/scripts/run-yolcu360-live-setup.sh
```

Rota listesi: `scripts/config/yolcu360-car-routes.json` (şehir + alış/iade + kiralama günü).

**Mevcut özellikler:** panel ping, konum arama proxy, vitrin `GET /api/v1/public/yolcu360/cars`, import → `car_rental` ilanları.

**Henüz yok:** backend rezervasyon/book API (checkout yalnızca sessionStorage draft + listing kaydı).

## Travelrobot sandbox test verileri

| Tip | Kod | Açıklama |
|-----|-----|----------|
| Destination | 531096 | Prague |
| Destination | 587926 | Berlin |
| Destination | 10033097 | Istanbul |
| Hotel | KCZ466838 | Cosmopolitan Hotel Prague |
| Hotel | KCZ639147 | Hilton Prague |
| Hotel | KDE646930 | Pullman Berlin Schweizerhof |
| Hotel | KDE393226 | Sheraton Berlin Grand Hotel Esplanade |
| Hotel | KTR431805 | Radisson Blu Hotel |
| Hotel | KTR672265 | Hilton Istanbul Bomonti Hotel & Conference Center |
| Hotel | KTR3284005 | Ibis Izmir Alsancak Test |

Tek kaynak (kod): `scripts/lib/travelrobot-sandbox-ids.mjs`

## Travelrobot API akışları (tam)

### Tur
`
createToken → searchTours → getTourPrices → getTourExtras
→ getTourFinalPrice → getPickupPoints → bookTour
`
Postman koleksiyonu: D:\agora\Travelrobot Tour API.postman_collection (1).json

### Otel
`
createToken → searchHotel → [getHotelAsyncResults] → getHotelDetails
→ getHotelRoomPrices → validateHotelRoomsV2 → [getHotelPaymentOptions] → bookHotel
→ SystemPnr (çok odada Data.RoomCombinations.RoomCodes birlikte validate)
`
Test (Hotel API Test Cases PDF):

| Senaryo | Oda / kişi | Lokasyon (sandbox) |
|---------|------------|-------------------|
| S1 | 1 oda, 2 ADT | Istanbul (`10033097`) |
| S2 | 1 oda, 2 ADT + 1 CHD (5) | Prague (`531096`) |
| S3 | 2 oda: (2 ADT+1 CHD(2)) + (1 ADT+1 CHD(4)) | Berlin (`587926`) |

Her adım için istek/yanıt logları + **System PNR** (sunucuda):

```bash
node scripts/test-travelrobot-scenarios.mjs --from-db --with-booking --only hotels
```

Çıktı: `travelrobot-test-log-*.json` (tam log), özet dosyasında System PNR + Client Notes.

**BookHotel (Stoplight):** `request.ResultKeys` (PackageId değil), `PaxInfo.HotelRoomPaxes[].Paxes[]` içinde `HotelPaxType` (PaxType değil), sadeleştirilmiş `Pax` alanları. Kod: `buildHotelBookRequest` / `mapHotelRoomPaxesForBook` (`scripts/lib/travelrobot-api.mjs`), test sürümü `cert-hotel-book-v7`.

### Uçuş
`
createToken → searchFlightItinerary → getFlightBrandedFares
→ validateFlight → Book (CreateReservation) → ReservationToTicket
→ IssueTicketDirect (sandbox’ta endpoint 404 olabilir)
`
Air API Test Cases (PDF) — 11 senaryo:

| # | Tip | Pax | Rota |
|---|-----|-----|------|
| S1 | Oneway | 1 ADT | IST→LHR |
| S2 | Oneway | 2 ADT + 1 CHD + 1 INF | IST→LHR |
| S3 | RT Combined | 1 ADT | LHR↔DXB |
| S4 | RT Separated | 1 ADT | LHR↔DXB |
| S5 | RT Combined | 2 ADT + 1 CHD + 1 INF | LHR↔DXB |
| S6 | RT Separated | 2 ADT + 1 CHD + 1 INF | LHR↔DXB |
| S7 | Multiple Combined | 1 ADT | CDG→FCO→LHR→BCN |
| S8 | Multiple Separated | 2 ADT + 1 CHD + 1 INF | CDG→FCO→LHR→BCN |
| S9 | Oneway LCC | 2 ADT + 1 CHD + 1 INF | AYT→TZX |
| S10 | RT LCC | 2 ADT + 1 CHD + 1 INF | AYT↔TZX |
| S11 | Multiple LCC | 2 ADT + 1 CHD + 1 INF | AYT→TZX→IST→ADB |

```bash
node scripts/test-travelrobot-scenarios.mjs --from-db --with-booking --only flights
node scripts/test-travelrobot-scenarios.mjs --from-db --with-booking --only air-s2
node scripts/test-travelrobot-scenarios.mjs --from-db --with-booking --only air-lcc
```

Book: `ResultKeys` = validate yanıtındaki tüm bacak key’leri (`|||` formatı). Ödeme: sandbox’ta `PaymentType: 2` (acente kredisi).

## Sıradaki teknik adımlar

1. GTC import script'lerini tamamla (import-gtc-listings.mjs, gtc-listing-db.mjs).
2. Runtime rezervasyon: listing external_provider_code = 'travelrobot' → ookTour/ookHotel/createFlightReservation.
3. Canlı API: panel veya `apply-travelrobot-live-config.mjs` ile Booking + Statik kimlikleri kaydet; `ping-travelrobot-live.mjs` ile doğrula.
## Masaüstü kaynak klasörleri

| Klasör | İçerik |
|--------|--------|
| `Yeni klasör (3)` | Tur Postman, otel test ID’leri, uçak/otel test case PDF’leri |
| `Yeni klasör (2)` | Rent A Car Postman (Travelrobot) |
| `agora` | Travelrobot paketi: Tur Postman + otel test ID + uçak/otel test case DOCX + hata formu (**Yeni klasör (3) ile aynı içerik**, DOCX formatı) |
| `turna` | Turna uçak API — 2 Postman koleksiyonu (aşağıda) |
| `wtatil` | `API.pdf` — Tur API dokümantasyonu v1.0 (08.12.2023) |

---

## Wtatil API (tur)

Kaynak: masaüstü `API.pdf` (v1.0) + `swagger.json` (OpenAPI 3.0.4, v2) + https://tour-api.reserwation.com/docs/index.html

**Base URL:** `https://tour-api.reserwation.com` (`swagger.json` içinde `servers` yok — env ile verilir)

**Kapsam kararı:** Biz yalnızca **tur** çekeceğiz. v2 dokümanında `HotelCatalog` ve `FlightCatalog` de var (GTC/Turna/Travelrobot ile çakışır — bilinçli dışarıda bırak).

### PDF v1 vs canlı v2 farkları

| Konu | PDF v1 | Canlı v2 |
|------|--------|----------|
| Auth gövdesi | `Authentication` objesi | `authorization: { userName, token }` her istekte |
| Tur listesi | `AgencyId` + `Ids[]` | + **`pageNumber`, `pageSize`** (sayfalı import) |
| Tur arama | `TourId` / Area / Country | + `tourCategoryId`, `b2BUserId` |
| Ek uçlar | — | kategori, periyot, fiyat, ulaşım, otobüs noktası, autocomplete |
| Senkron | — | `GET /api/Notify/trigger-tour-changes-async` |
| Otel / uçak | Yok | **Var** (kullanmayacağız) |
| Yanıt sarmalı | — | `message`, `responseStatus`, `data`, `totalDataCount` |

Token: `POST /api/Auth/get-token-async?applicationSecretKey=&userName=&password=` (query param)

### Tur katalog yanıtı (`TourApiGetAllQueryResponse` — swagger)

Import eşlemesi: `id` → `wtatil_package_ref` / `external_listing_ref`; `name` → başlık; `tourProgram`, `generalConditions` → açıklama; `coverPhoto`, `galleryPhotos` → görseller; `tourArea`, `countries` → lokasyon; `numberOfNights`, `mealType`, `transportType` → attribute.

Sayfalama: `POST getall-tour-async` → `data.items[]`, `data.pageCount`, `totalDataCount`.

Fiyat (runtime/opsiyonel import): `search-tour-async` → `cheapestPrice`, `periods[]`; veya `getall-tour-period-price-async`.

Planlanan env:

```powershell
$env:WTATIL_BASE_URL = "https://tour-api.reserwation.com"
$env:WTATIL_APPLICATION_SECRET_KEY = "..."
$env:WTATIL_USERNAME = "..."
$env:WTATIL_PASSWORD = "..."
$env:WTATIL_AGENCY_ID = "..."   # search-tour fiyat zenginleştirmesi (--prices / --full)
$env:WTATIL_STATUS = "draft"    # veya published
```

Import:

```powershell
node scripts/import-wtatil-tours.mjs --ping
node scripts/import-wtatil-tours.mjs --dry-run --limit 5
node scripts/import-wtatil-tours.mjs                    # tüm katalog (meta + görseller)
node scripts/import-wtatil-tours.mjs --enrich             # + dönem, fiyat tablosu, ulaşım
node scripts/import-wtatil-tours.mjs --full               # enrich + search-tour cheapestPrice (WTATIL_AGENCY_ID gerekir)
```

### Otomatik senkron (üretim)

Günlük: dönem listesi API kaynağı (**replace** — Stop&Sale ile kalkan tarihler DB'den düşer), fiyat, günde en fazla 10 yeni tur.

```bash
chmod +x deploy/scripts/sync-wtatil-auto.sh
./deploy/scripts/sync-wtatil-auto.sh
# Tek tur: node scripts/sync-wtatil-auto.mjs yok — audit için:
node scripts/audit-wtatil-tour-periods.mjs --tour-id 9526 --apply
```

Systemd:

```bash
sudo cp deploy/systemd/travel-wtatil-sync.{service,timer} /etc/systemd/system/
sudo chmod +x .../deploy/scripts/sync-wtatil-auto.sh
sudo systemctl daemon-reload && sudo systemctl enable --now travel-wtatil-sync.timer
journalctl -u travel-wtatil-sync.service -n 80 --no-pager
```

### Akış

```
get-token → getall-tour → search-tour → add-basket-item → create-succeeded-booking
```

### Endpoint’ler (kebab-case path’ler PDF’de boşluklu yazılmış)

| Grup | Path | Açıklama |
|------|------|----------|
| Auth | `/api/Auth/get-token-async` | Token |
| TourCatalog | `/api/TourCatalog/getall-tour-async` | Tüm turlar + detay (`AgencyId`, opsiyonel `Ids[]`) |
| TourCatalog | `/api/TourCatalog/search-tour-async` | Fiyat arama |
| Basket | `/api/Basket/add-basket-item-async` | Sepete tur ekle |
| Basket | `/api/Basket/get-basket-by-id-async` | Sepet oku |
| Basket | `/api/Basket/delete-basket-by-id-async` | Sepet sil |
| Basket | `/api/Basket/delete-basket-item-by-id-async` | Kalem sil |
| Booking | `/api/Booking/getall-booking-state-async` | Rezervasyon statüleri |
| Booking | `/api/Booking/getall-booking-cancel-type-async` | İptal tipleri |
| Booking | `/api/Booking/getall-payment-type-async` | Ödeme tipleri |
| Booking | `/api/Booking/create-succeeded-booking-async` | Kesin rezervasyon / satın alma |
| Booking | `/api/Booking/add-booking-note-async` | Not ekle |
| Booking | `/api/Booking/update-booking-note-by-id-async` | Not güncelle |

**BookingChangeRequest** (PDF’de isim var, detay yok): ek hizmet, periyot/tur değişikliği, iptal talepleri — B2B onaylı.

### Search kuralları (önemli)

- `TourId`, `TourAreaId`, `TourCountryId` — **yalnızca biri** dolu olmalı
- `Detail`: liste taramasında **0**, detay aşamasında **1** — aksi halde API erişimi **bloklanabilir**
- `StartDate`, `EndDate`, `AdultCount` zorunlu; `ChildCount`, `ChildBirthDates` opsiyonel

### Sepet / rezervasyon

- `add-basket-item`: `ProductId`, `ProductTypeId`, `ProductPeriodId`, `Price`, `Customers[]`, `BillingDetails`
- `TrackingNumber` / `ReferenceNumber`: entegratör sepet takip no — B2B basket `Id` ile eşleşir, saklanmalı
- `create-succeeded-booking`: `BasketId` + `TrackingNumber` + `Price` → `BookingId`

### Listing import modeli

- `external_provider_code = 'wtatil'`
- `external_listing_ref` / `wtatil_package_ref` = tur `ProductId` veya getall-tour id
- `listing_source = 'api'`, kategori `tour`
- Program günleri: `program_days_json` veya `listing_attributes` (group `wtatil`)
- Fiyat: `search-tour` runtime; import’ta örnek tarih araması veya “fiyat için ara” vitrin

### Travelrobot tur ile birlikte

İkisi de **ayrı tur ilanı** çekebilir (uçak/GTC mantığıyla aynı). Travelrobot = KPlus; Wtatil = ayrı B2B platform.

---

## Turna API (yalnızca uçak)

**Kapsam kararı:** turna.com’dan sadece uçak bileti API’si kullanılacak. Otobüs, otel, araç kiralama, feribot Turna üzerinden entegre edilmeyecek (bunlar GTC / Travelrobot veya manuel kategorilerde kalır).

Kaynak: `C:\Users\Mamon\Desktop\turna\` — 4 dosya (kök + alt klasörlerde kopya).

### Ortam

| Ortam | Base |
|-------|------|
| Test | `https://apitest.turna.com` |
| Canlı | `https://api.turna.com` (PackagesInSearch içinde `cancelReserve` örneği) |

```powershell
$env:TURNA_BASE_URL = "https://apitest.turna.com"
$env:TURNA_API_KEY = "..."   # Postman'deki ApiKey — repoya yazma
```

### Auth / oturum

1. **Search** gövdesinde gömülü `LoginForm`: `ApiKey`, `CountryCode`, `CurrencyCode`, `LanguageCode`
2. Alternatif: `POST /v1/accounts/auth/anonymousLogin` (yalnızca `ApiKey` + ülke/para/dil)
3. Sonraki adımlarda header: `Turna-Session-Id`, `Turna-Session-Token` (Search/Login yanıtından)

### Rezervasyon akışı

```
Search → Allocate → Reserve → MakeBalancePayment → Checkout
```

Yardımcı: `getBasket`, `cancelReserve`, `getRefundOffer`, `cancelBooking` (refund)

### Endpoint listesi

| Adım | Method | Path |
|------|--------|------|
| Arama | POST | `/v1/flight/booking/search` |
| Tahsis / fiyat kilitle | POST | `/v1/flight/booking/allocate` |
| Rezervasyon | POST | `/v1/flight/booking/reserve` |
| Bakiye ödeme | POST | `/v1/flight/booking/makebalancepayment` |
| Checkout | POST | `/v1/flight/booking/checkout` |
| Sepet sorgu | POST | `/v1/flight/booking/getBasket` |
| Rezervasyon iptal | POST | `/v1/flight/booking/cancelReserve` |
| İade teklifi | POST | `/v1/flight/refund/getRefundOffer` |
| İade | POST | `/v1/flight/refund/cancelBooking` |
| Anonim login | POST | `/v1/accounts/auth/anonymousLogin` |

### Search parametreleri (örnek)

- `SearchForm.Legs[]`: `Origin`, `Destination`, `OriginIsCity`, `DestinationIsCity`, `DepartureDay`
- `SearchForm.Paxes[]`: `Type` (`ADT`), `Count`
- `SearchForm.Preferences`: `OnlyDirects`, `CabinClass` (`Any`)
- `ResponseMask.FlightLegMask`: `109`
- Örnek rotalar: KWI→DXB, ESB→IST

### Allocate — kritik alanlar

- Search yanıtından: `AllocateForm.Id`, `ReferenceId`, `SelectedFlightLegs[].Id`, `ReferenceId`
- **PackagesInSearch** varyantı: `SelectedFlightLegs[].SelectedPackage` (ör. `"sic"`)
- Koleksiyon adı: `Turna API OW 1ADT PackagesInSearch` — paket/branded fare araması

### Listing import modeli

- Turna statik katalog değil; **rota şablonu** ilanları (GTC uçak gibi).
- `external_provider_code = 'turna'`
- `external_listing_ref` / `listing_flight_details.turna_route_ref`: örn. `esb-ist`, `kwi-dxb`
- `flight_legs` tablosuna bacaklar yazılır (`from_stop`, `to_stop`, `mode = flight`)
- Canlı fiyat/müsaitlik runtime’da Search/Allocate ile

### Üç uçak sağlayıcısı karşılaştırma

| | GTC | Travelrobot | Turna |
|---|-----|-------------|-------|
| Auth | AgencyId + Password | Channel + Token | ApiKey + Session headers |
| Arama | AirLowSearch | Search itinerary | booking/search |
| Kilitleme | — | Validate | allocate |
| Rezervasyon | — | Create reservation | reserve + payment + checkout |
| DB ref | `gtc_route_key` | (planlanacak) | `turna_route_ref` (mevcut) |

### Turna — bilinçli dışarıda bırakılanlar

turna.com vitrininde otel/otobüs/araç/feribot olsa da API entegrasyonu **sadece flight** (`/v1/flight/booking/*`, `/v1/flight/refund/*`). RT / çok yolcu için ek Postman koleksiyonu Turna’dan istenebilir; OW 1ADT klasör yeterli başlangıç.
