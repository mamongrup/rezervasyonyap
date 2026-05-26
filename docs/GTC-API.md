# GTC API entegrasyonu

Kaynak: [Gtc Api — Postman Documenter](https://documenter.getpostman.com/view/35375466/2sBXqQGJC8)

## Kapsam

| Kategori | GTC endpoint | Bizdeki ilan |
|----------|--------------|--------------|
| Otel | `POST /Hotel/Hotels`, `POST /Hotel/Detail` | `product_categories.code = hotel`, `external_provider_code = gtc` |
| Uçak | `POST /Flight/AirLowSearch` + rota listesi | `product_categories.code = flight`, rota şablonu (`AYT-SAW` vb.) |

Kimlik doğrulama: her istek gövdesinde `AgencyId`, `Password`.

## Ortam değişkenleri

```powershell
$env:GTC_BASE_URL = "https://api.gtcreservation.com"
$env:GTC_AGENCY_ID = "..."
$env:GTC_PASSWORD = "..."
$env:GTC_ORG_ID = "a0000000-0000-4000-8000-000000000001"  # isteğe bağlı
```

## SQL migration

```powershell
& "C:\laragon\bin\postgresql\postgresql\bin\psql.exe" -h 127.0.0.1 -p 5432 -U postgres -d travel -f backend\priv\sql\modules\296_gtc_provider_refs.sql
```

## İlan içe aktarma

1. Uçak rotalarını tanımlayın:

```powershell
Copy-Item scripts\config\gtc-flight-routes.example.json scripts\config\gtc-flight-routes.json
```

2. Çalıştırın:

```powershell
cd c:\laragon\www\travel
node scripts/import-gtc-listings.mjs
node scripts/import-gtc-listings.mjs --hotels-only --limit 50
node scripts/import-gtc-listings.mjs --flights-only
node scripts/import-gtc-listings.mjs --dry-run
```

İlanlar `listing_source = api`, `external_provider_code = gtc` ile oluşturulur; durum varsayılan **taslak**.

Ham API yanıtı `listing_attributes` (`group_code = gtc`) altında saklanır; alan eşlemesi gerçek yanıt gövdesine göre genişletilebilir.

## Sonraki adımlar (runtime)

- Canlı arama / rezervasyon için Gleam HTTP modülü (`travel/integrations/gtc_*`)
- Ödeme: `Payment/BankList`, `FinalizeUrl`
- Panelde GTC senkron tetikleyici
