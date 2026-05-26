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
| `travelrobot` | `ChannelCode` + `ChannelPassword` → Token (~120 dk) | Tur, otel, uçak, araç kiralama | Henüz kod yok; Postman + sandbox dokümanları masaüstünde |
| `wtatil` | `ApplicationSecretKey` + `UserName` + `Password` → Token (24 saat) | **Tur** (plan: yalnızca tur; v2 API otel/uçak da sunuyor — kullanmayacağız) | `scripts/lib/wtatil-api.mjs`, `scripts/import-wtatil-tours.mjs`; DB hazır (`wtatil_package_ref`, 180) |
| `turna` | `ApiKey` + `Turna-Session-Id` / `Turna-Session-Token` | **Yalnızca uçak** | `listing_flight_details.turna_route_ref` (180); client/import yok. Otobüs/otel/araç **alınmıyor**. |

## GTC ortam

```powershell
$env:GTC_BASE_URL = "https://api.gtcreservation.com"
$env:GTC_AGENCY_ID = "..."
$env:GTC_PASSWORD = "..."
```

Bkz. `docs/GTC-API.md`.

## Travelrobot / KPlus ortam

- Sandbox: `http://sandbox.kplus.com.tr/kplus/v0/`
- Token: `General.svc/Rest/Json/CreateTokenV2`
- Servis pattern: `{Service}.svc/Rest/Json/{Method}`

Planlanan env:

```powershell
$env:TRAVELROBOT_BASE_URL = "http://sandbox.kplus.com.tr/kplus/v0"
$env:TRAVELROBOT_CHANNEL_CODE = "..."
$env:TRAVELROBOT_CHANNEL_PASSWORD = "..."
```

## Sıradaki teknik adımlar

1. GTC import script’lerini tamamla (`import-gtc-listings.mjs`, `gtc-listing-db.mjs`).
2. Travelrobot client: `scripts/lib/travelrobot-api.mjs` (ortak token + servis çağrıları).
3. Travelrobot import: `scripts/import-travelrobot-listings.mjs`.
4. Migration `297_*`: Travelrobot referans kolonları (otel kodu, tur kodu, araç result key vb.).
5. Runtime rezervasyon: listing `external_provider_code` → GTC veya Travelrobot modülü.

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
