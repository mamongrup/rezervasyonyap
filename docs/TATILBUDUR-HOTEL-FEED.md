# Tatilbudur otel feed entegrasyonu

Tatilbudur'un herkese açık otel sayfaları içerik gösterse de canlı oda/fiyat
uçları `robots.txt` ile taramaya kapatılmıştır. Bu nedenle entegrasyon,
Tatilbudur'dan alınan izinli partner feed/API adresini kullanır; kapalı uçları
tarayarak veri toplamaz.

## Ayarlar

`/etc/rezervasyonyap/backend.env` içine:

```env
TATILBUDUR_FEED_URL=https://partner-feed-adresi/hotels.json
TATILBUDUR_FEED_TOKEN=
TATILBUDUR_FEED_API_KEY=
TATILBUDUR_LISTING_STATUS=draft
```

Token veya API anahtarından yalnızca sağlayıcının istediği kullanılır.

## Desteklenen feed alanları

Kök veri bir dizi veya `{ "hotels": [] }`, `{ "items": [] }` olabilir. Otelde
`id`, `name`, `description`, `city`, `district`, `address`, `countryCode`,
`starRating`, `images`, `amenities` ve `rooms` desteklenir. Her odada `id`,
`name`, `capacity`, `boardType`, `features`, `image`, `unitCount` ve `rates`
bulunabilir. Fiyat kaydı:

```json
{
  "validFrom": "2026-07-15",
  "validTo": "2026-07-31",
  "nightlyPrice": 8500,
  "currency": "TRY",
  "boardType": "Oda Kahvaltı",
  "availableUnits": 3
}
```

## Çalıştırma

```bash
./deploy/scripts/import-tatilbudur-hotels.sh --dry-run --limit 10
./deploy/scripts/import-tatilbudur-hotels.sh
node scripts/import-tatilbudur-hotels.mjs --status
```

Aktarım her 25 otelde bir checkpoint kaydeder. Feed değiştiğinde yeni tur
baştan başlar; aynı `external_provider_code + external_listing_ref` kaydı
güncellenir ve mükerrer ilan oluşmaz.
