# Partner API (Agent API)

Otel, tatil evi, yat ve aktivite ilanları — vitrin ile **aynı envanter**, acente/partner uygulamalarına REST ile açılır.

## Kimlik doğrulama

```
Authorization: Bearer trk_live_…
```

Anahtar: **Acente paneli → API anahtarları**. Kapsamlar:

| Scope | Açıklama |
|-------|----------|
| `listings.read` | Arama, detay, müsaitlik, fiyat teklifi, galeri |
| `bookings.write` | Rezervasyon oluşturma ve iptal |
| `reservations.read` | Rezervasyon listesi / sorgu |

## Desteklenen kategoriler

| `category_code` | Dikey |
|-----------------|--------|
| `hotel` | Otel |
| `holiday_home` | Tatil evi / villa |
| `yacht_charter` | Yat kiralama |
| `activity` | Aktivite |

## Temel uçlar

| Method | Path |
|--------|------|
| GET | `/api/v1/agent/me` |
| GET | `/api/v1/agent/openapi.json` |
| GET | `/api/v1/agent/catalog/categories` |
| GET | `/api/v1/agent/catalog/search?category_code=hotel&…` |
| GET | `/api/v1/agent/catalog/listings/:id` |
| GET | `/api/v1/agent/catalog/listings/:id/availability-calendar?from=&to=` |
| GET | `/api/v1/agent/catalog/listings/:id/images` |
| GET | `/api/v1/agent/catalog/listings/:id/meal-plans` |
| GET | `/api/v1/agent/catalog/listings/:id/price-rules` |
| GET | `/api/v1/agent/catalog/listings/:id/price-lines` |
| GET | `/api/v1/agent/catalog/listings/:id/accommodation-rules` |
| GET | `/api/v1/agent/catalog/listings/:id/bedrooms` |
| GET | `/api/v1/agent/catalog/listings/:id/activity-sessions?date=` |
| POST | `/api/v1/agent/catalog/listings/:id/activity-quote` |
| POST | `/api/v1/agent/catalog/listings/:id/stay-quote` |
| POST | `/api/v1/agent/bookings` |
| GET | `/api/v1/agent/bookings` |
| GET | `/api/v1/agent/bookings/:public_code` |
| DELETE | `/api/v1/agent/bookings/:public_code` |
| GET | `/api/v1/agent/reservations` |
| GET | `/api/v1/agent/sales-summary?from=&to=` |

Public vitrin arama parametreleri (`q`, `location`, `start_date`, `end_date`, …) agent search'te de geçerlidir.

## Konaklama fiyat teklifi (`stay-quote`)

Otel, tatil evi ve yat ilanları için gece bazlı teklif:

```http
POST /api/v1/agent/catalog/listings/{id}/stay-quote
Content-Type: application/json

{
  "starts_on": "2026-06-01",
  "ends_on": "2026-06-05",
  "quantity": 1,
  "meal_plan_code": "room_only"
}
```

Yanıt: `nights`, `lodging_subtotal`, `cleaning_fee`, `line_total`, `available`. Müsait değilse veya min. konaklama sağlanmazsa `409 dates_unavailable_or_min_stay`.

## Rezervasyon iptali

`DELETE /api/v1/agent/bookings/:public_code` — yalnızca `held` / `inquiry` ve **yakalanmış ödeme yoksa**. Başarılı yanıt: `{ "status": "cancelled", … }`.

## Webhook

Acente paneli → **Partner API ayarları** (`PATCH /api/v1/agency/api-settings`):

```json
{ "webhook_url": "https://partner.example/hooks/travel", "webhook_secret": "opsiyonel" }
```

Olaylar:

- `reservation.created` — yeni held rezervasyon
- `reservation.cancelled` — agent API iptali

Örnek gövde (`reservation.created`):

```json
{
  "event": "reservation.created",
  "reservation_id": "uuid",
  "public_code": "ABC123",
  "listing_id": "uuid",
  "status": "held",
  "agency_organization_id": "uuid"
}
```

## Rate limit

Kurum başına **300 istek/dakika**. Aşımda `429` + `rate_limit_exceeded`.

## Swagger UI

Canlı şema: `GET /api/v1/agent/openapi.json`  
Vitrin: [rezervasyonyap.tr/developer/swagger](https://rezervasyonyap.tr/developer/swagger)

## Yerel smoke test

```powershell
$env:AGENT_API_KEY = "trk_live_…"
$env:API_ORIGIN = "http://127.0.0.1:8080"
node scripts/smoke-agent-api.mjs
```

## SQL (üretim)

```bash
./deploy/apply-sql.sh backend/priv/sql/modules/298_api_keys_bookings_write_scope.sql
./deploy/apply-sql.sh backend/priv/sql/modules/299_agency_api_settings.sql
```
