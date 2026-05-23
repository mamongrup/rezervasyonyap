# Bravo aktarım → sunucu güncelleme

Yerelde tamamlananlar: 768 ilan, görseller `frontend/public/uploads/listings/` (33 522 dosya — DB ile uyumlu), dönemsel fiyatlar, takvim (takvimi olmayan 53 ilan bilinçli boş). SQL 293–294 ve vitrin meta/konum backfill uygulandı.

## Yerel son kontrol

```powershell
cd C:\laragon\www\travel
node scripts/audit-bravo-import.mjs
node scripts/verify-local-files-vs-db.mjs
node scripts/check-local-images.mjs
```

Eksik görsel çıkarsa:

```powershell
node scripts/import-bravo-images-only.mjs
```

## Sunucuya aktarım sırası

1. **PostgreSQL** — `travel` veritabanını güncel dump ile yükleyin:

   **`backups/bravo-import-ready-20260522-174802/`** (`travel-full.dump` + `SUNUCU-ADIMLARI.md`)
2. **Uploads** — Yerel klasörü kopyalayın (~8,8 GB, tekrar CDN’den indirmeyin):

   ```powershell
   .\scripts\sync-frontend-uploads-to-server.ps1 -Server 50.114.185.100 -User root
   ```

3. **Kod + API** — Gleam/Next deploy:

   ```powershell
   .\scripts\deploy-server.ps1 -Server 50.114.185.100 -User root -Ref main
   ```

Tek komut (DB adımı hariç uyarı verir):

```powershell
.\scripts\deploy-bravo-to-server.ps1 -Server 50.114.185.100 -User root
```

| Sunucu | IP |
|--------|-----|
| Eski Bravo | `50.114.185.221` — rezervasyonyap.com.tr |
| Yeni Travel | `50.114.185.100` — rezervasyonyap.tr |

## Bilinçli boş kalanlar

| Durum | Adet | Açıklama |
|--------|------|----------|
| Takvim / dönem fiyatı yok | 53 | Eski sitede `bravo_space_dates` yok — boş bırakıldı |
| Diğerleri | 715 | Gün + dönem fiyatı aktarıldı |

## Doğrulama

- API: `curl http://127.0.0.1:8080/api/v1/catalog/public/listings?category_code=holiday_home&limit=1` → `total`: 768
- Vitrin: `/tr/tatil-evleri`, örnek detay `/tr/tatil-evi/love-in-villa`
