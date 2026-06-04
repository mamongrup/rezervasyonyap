# Production Deploy Checklist (Plesk + systemd)

Üretim vitrin domain: **`rezervasyonyap.tr`** — ayrıntı ve sunucu yolu: [`deploy/DOMAIN.md`](./DOMAIN.md).

Bu liste, `travel-web.service` (Next.js) ve `travel-api.service` (Gleam API) ile calisan sunucuda "menu/admin kayboldu" tipindeki hatalari onlemek icindir.

## 1) Dogru dizine gir

`travel-web.service` icindeki `WorkingDirectory` degeri kullanilmali:

```bash
systemctl cat travel-web.service
cd <WorkingDirectory>
pwd
ls -la package.json
```

`package.json` yoksa yanlis dizindesiniz.

**Sık hata:** `travel-web` zaten `.../httpdocs/frontend` içinde çalışıyorken deploy komutunda bir kez daha `cd frontend` kullanılırsa `.next` yanlış alt dizinde oluşur; tarayıcıda `Loading chunk failed`, `text/plain`, `500` görülür. Build her zaman `WorkingDirectory` ile aynı klasörde çalışmalı.

## 2) Web servis ortam degiskenlerini dogrula

`travel-web.service` icinde en az su degiskenler olmali:

- `NEXT_PUBLIC_API_URL=http://127.0.0.1:8080`
- `INTERNAL_API_ORIGIN=http://127.0.0.1:8080`
- `INTERNAL_MIDDLEWARE_REWRITE_ORIGIN=http://127.0.0.1:3000`
- `NODE_ENV=production`

Kontrol:

```bash
systemctl show travel-web.service -p Environment
```

Guncellemek icin:

```bash
sudo systemctl edit travel-web.service
```

Ornek override:

```ini
[Service]
Environment=NEXT_PUBLIC_API_URL=http://127.0.0.1:8080
Environment=INTERNAL_API_ORIGIN=http://127.0.0.1:8080
Environment=INTERNAL_MIDDLEWARE_REWRITE_ORIGIN=http://127.0.0.1:3000
```

Opsiyonel (kuruma bagli `hero_search` okunacaksa):

- `NEXT_PUBLIC_NAVIGATION_ORGANIZATION_ID=<organization_uuid>`

Repo icindeki ornek dosyalar:

- `deploy/systemd/travel-web.service`
- `deploy/systemd/frontend.env.example`

## 3) Plesk vitrin (yalniz Next.js, tek SSH komutu)

Tam akış: **[`deploy/PLESK_VITRIN.md`](./PLESK_VITRIN.md)** — `plesk-vitrin-deploy.sh` sunucuyu `origin/main` ile sıfırlayıp `npm ci` + build + `travel-web` restart yapar (`package-lock` çakışması yaşamazsınız).

## 4) Monorepo: tek komut deploy (backend + frontend)

Repo kokunde:

```bash
chmod +x deploy/deploy.sh deploy/verify.sh
./deploy/deploy.sh
```

Notlar:

- Varsayılan `DEPLOY_REF` **main**. Eski sabit nokta için: `DEPLOY_REF=stable/b92d735 ./deploy/deploy.sh`.
- Script otomatik olarak:
  - hedef ref'e hard sync yapar,
  - lokal kirli dosyalari temizler (`git clean -fd`),
  - backend/frontend build alir,
  - service restart + verify yapar.

## 5) Manuel akış (ihtiyaç halinde)

`NEXT_PUBLIC_*` degiskenleri build-time gomulur. Env degistiyse **yeniden build zorunlu**.

Sunucuda **`frontend/package-lock.json` elle degisti ise** `git pull` reddeder. Guvenli yol: [`PLESK_VITRIN.md`](./PLESK_VITRIN.md) scripti veya:

```bash
cd /var/www/vhosts/rezervasyonyap.tr/httpdocs
git fetch origin
git checkout main && git reset --hard origin/main
cd frontend && rm -rf node_modules .next && npm ci && npm run build
```

## 6) Servisleri restart et

```bash
sudo systemctl daemon-reload
sudo systemctl restart travel-web.service
sudo systemctl restart travel-api.service
sudo systemctl status travel-web.service
sudo systemctl status travel-api.service
```

## 7) Hizli smoke test

```bash
curl -i http://127.0.0.1:8080/api/v1/auth/me
curl -i http://127.0.0.1:3000/api/hero-tabs
```

Beklenen:

- `auth/me`: token yoksa `401 {"error":"missing_token"}` normal.
- `hero-tabs`: `200` + JSON (`items`) donmeli.

Alternatif: tek komut dogrulama scripti

```bash
chmod +x deploy/verify.sh
./deploy/verify.sh
```

## 8) Veritabanı SQL (tek standart — `psql` ile elle migration)

**Yapmayın:** `psql -U postgres` ile tahmin yürütmek. Plesk kurulumlarında süper kullanıcı şifresi, uygulamanın kullandığı bağlantıdan farklıdır; “password authentication failed” buradan gelir.

**Yapın:** API ile **aynı** kimlik bilgisini kullanın — `travel-api.service` içindeki `EnvironmentFile` (genelde **`/etc/rezervasyonyap/backend.env`**). Script repo içinde:

```bash
cd /var/www/vhosts/rezervasyonyap.tr/httpdocs
chmod +x deploy/apply-sql.sh
./deploy/apply-sql.sh backend/priv/sql/modules/NNN_yeni_migration.sql
```

Bağlantı sırası `backend/src/backend/config.gleam` ile aynıdır: önce **`DATABASE_URL`**, yoksa **`PGHOST` / `PGPORT` / `PGUSER` / `PGPASSWORD` / `PGDATABASE`**.

Ortam dosyası yolunu değiştirmek için: `TRAVEL_DB_ENV=/yol/backend.env ./deploy/apply-sql.sh ...`

**Yerel Windows (Laragon):** Bu script Linux/bash içindir; PowerShell’de Laragon `psql` yolunu kullanın (bkz. `00-project-overview.mdc`).

### İlan görselleri + konum vitrin paketi (282 → 283 → 284)

Bazı ortamlarda yalnızca **284** çalıştırılırsa konum backfill tamamlanır; **282** ve **283** ise görsel yükleme kalitesi / AVIF ile ilgilidir — üçünü de sırayla uygulayın ki kod ile ayarlar uyumlu kalsın.

**Üretim** (repo kökü, `apply-sql.sh` ile — `backend.env` otomatik):

```bash
./deploy/apply-sql.sh backend/priv/sql/modules/282_listings_image_upload_high_quality.sql
./deploy/apply-sql.sh backend/priv/sql/modules/283_listings_image_avif_quality_90.sql
./deploy/apply-sql.sh backend/priv/sql/modules/284_listings_location_name_backfill_from_meta.sql
```

**Yerel Laragon** (PowerShell, repo kökü; sıra aynı):

```powershell
& "C:\laragon\bin\postgresql\postgresql\bin\psql.exe" -h 127.0.0.1 -p 5432 -U postgres -d travel -f backend\priv\sql\modules\282_listings_image_upload_high_quality.sql
& "C:\laragon\bin\postgresql\postgresql\bin\psql.exe" -h 127.0.0.1 -p 5432 -U postgres -d travel -f backend\priv\sql\modules\283_listings_image_avif_quality_90.sql
& "C:\laragon\bin\postgresql\postgresql\bin\psql.exe" -h 127.0.0.1 -p 5432 -U postgres -d travel -f backend\priv\sql\modules\284_listings_location_name_backfill_from_meta.sql
```

**284 notu:** Yalnızca `location_name` boş ve `listing_meta` içinde `address` dolu olan yayın ilanları güncellenir; tekrar çalıştırmak genelde zararsızdır (satır sayısı 0 olabilir).

## 9) Pazarlama AI / DeepSeek `timeout`

- **Sure (API):** Yalniz **Ayarlar → Genel → Yapay zeka** (`site_settings.ai`). Eski `travel-api` yukluyse panel ile httpc uyusmaz — `gleam build` + `systemctl restart travel-api.service`. **`plesk-vitrin-deploy.sh`** yalnizca Next.js derler; API’yi unutmayin.
- **Kritik — ters vekil:** `/manage/admin/marketing/ai` tek HTTP isteginde **birden fazla** DeepSeek cagrisi siralar (tanitim + blog). Panelde 3600 sn olsa bile **Apache/nginx**, istemci–sunucu vekil zincirinde varsayilan **~60 sn** ile baglantiyi kesebilir; hata: `DeepSeek API hatası: timeout`.
- **Cozum:** Vekil **okuma/baglanti** zaman asimini panel süresinden (or. 7200 sn) **uzun** yapin. Plesk: ilgili alan adi → **Apache ve nginx Ayarlari** → “Ek Apache direktifleri” / “Ek nginx direktifleri”.

**Apache (ornek — HTTPS vhost icin):**

```apache
ProxyTimeout 7200
Timeout 7200
```

**nginx (ornek — `location` veya sunucu blogu icinde):**

```nginx
proxy_connect_timeout 7200s;
proxy_send_timeout 7200s;
proxy_read_timeout 7200s;
send_timeout 7200s;
```

Degisiklikten sonra web sunucusunu/yapilandirmayi yeniden yukleyin (Plesk’te genelde ayari kaydetmek yeterli; emin degilseniz `apachectl configtest` / nginx `test`).

```bash
cd /path/to/repo/backend && gleam build && sudo systemctl restart travel-api.service
```

## 10) Checkout: «Sepete ilan eklenemedi» (`insert_line_failed`)

Bu uyarı, API’nin `cart_lines` tablosuna INSERT yapamadığı anlamına gelir (tarih/sözleşme değil, çoğunlukla **veritabanı şeması**).

1. **Şema** (API ile aynı DB — `backend.env`):

```bash
cd /var/www/vhosts/rezervasyonyap.tr/httpdocs
./deploy/apply-sql.sh backend/priv/sql/modules/305_cart_lines_schema_guard.sql
```

2. **Teşhis + canlı API testi**:

```bash
chmod +x deploy/scripts/verify-cart-checkout.sh
LISTING_ID=<ilan-uuid> ./deploy/scripts/verify-cart-checkout.sh
```

3. **Gerçek PostgreSQL hatası** (log satırı `[cart_line]` ile yazılır):

```bash
grep '\[cart_line\]' /var/log/travel-api.log | tail -10
```

`column "tax_amount" does not exist` → 305 migration uygulanmamış veya **yanlış veritabanı**.

4. **API binary** güncel olmalı (`/opt/rezervasyonyap/.../erlang-shipment`):

```bash
./deploy/deploy.sh   # veya en azından backend gleam build + restart travel-api
sudo systemctl restart travel-api.service
```

5. Tarayıcıda checkout’u **ilan sayfasından** yeniden açın (`checkIn` / `checkOut` query ile).

## 11) Tarayici kontrolu

- Hard refresh: `Ctrl + Shift + R`
- Ana sayfada hero kategori ikonlari gorunmeli.
- `/manage/admin/content/navigation` sayfasi sonsuz "Yukleniyor..."da kalmamali.
