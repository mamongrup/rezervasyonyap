# PSI 100 — Composer 2 için devir teslim notu

> Bu doküman bir önceki ajanın (Opus) çıktısıdır. **Sen (Composer 2) bunu en başta oku, sonra çalış.** Tek hedef: PSI Mobile → **Performance 100** (diğer üçü zaten 100).

---

## 0) Çalışma kuralları (kısa)

1. **Türkçe** konuş. Cevap kısa ve dosya yolu odaklı olsun. Uzun teori yazma.
2. Cevap formatı: **Yapılanlar → Manuel adımlar (varsa) → Doğrulama → Sıradaki öneri**.
3. **3+ adımlı işlerde TodoWrite** kullan, her bitende `merge: true` ile statü güncelle.
4. Her dokunuştan sonra:
   - Backend dosyası değiştiyse → `gleam build` (CWD: `backend/`).
   - Frontend dosyası değiştiyse → `ReadLints` ile kontrol; pre-existing olmayan hataları düzelt.
   - SQL ekledin → `backend/priv/sql/install_order.txt` güncelle + cevaba **manuel `psql` komutu** ekle.
5. Mevcut migration'ı **asla** düzenleme — her zaman yeni `NNN_xxx.sql`.
6. Yeni helper yazmadan önce `Glob`/`Grep` ile mevcut çözümü kontrol et.
7. Cevap içinde tool isimlerini söyleme; ne yaptığını doğal cümleyle anlat.

---

## 1) Hedef ve mevcut skor

- **Hedef:** PSI mobile **Performance = 100**. Erişilebilirlik / Best Practices / SEO zaten 100.
- **Şu anki ana bottleneck'ler (PSI raporu):**
  - **LCP ~5.1 s** (hero görseli) — hedef <2.5 s.
  - **Render-blocking CSS ~1190 ms.**
  - **TBT** yüksek; en büyük katkı `chunks/1413-*.js` (kim olduğunu hâlâ tespit etmedik).
  - **DOM 1610 düğüm** — anasayfada gizli react-datepicker dahil çok component mount oluyor.
  - **Web font kritik yol** — Poppins.
  - **Fazladan görsel yükü** — recompress'le ~361 KiB tasarruf hâlâ sahada.

---

## 2) Domain haritası (bilmen gereken minimum)

- `backend/` — **Gleam** (wisp + pog + mist). HTTP modülleri `backend/src/travel/<domain>/<modul>_http.gleam`. Router: `backend/src/backend/router.gleam`.
- `frontend/` — Next.js App Router. **Tüm API çağrıları** `frontend/src/lib/travel-api.ts` içinde toplanır.
- **DB:** PostgreSQL. **Sunucudaki gerçek DB adı:** `travel_rezervasyonyap` (lokalde `travel`). Migration'lar `backend/priv/sql/modules/NNN_<ad>.sql`. Sıralı çalışır, sıra dosyası: `backend/priv/sql/install_order.txt`.
- **i18n:** 6 locale (`tr, en, de, ru, zh, fr`). Default `tr`. Çeviri sütunları genellikle `*_translations` JSONB; frontend `parseNameTranslations()` ile okur.

---

## 3) Şu an açıkta kalan iş — ACİL

Önceki ajan iki performans değişikliği push etti, sunucuda **build patladı**, site şu an **ayağa kalkmamış olabilir**:

1. `frontend/next.config.mjs` → `experimental.optimizeCss` (beasties paketi) açıldı (env: `CSS_OPTIMIZE`, `'0'` → kapalı).
2. `frontend/src/app/layout.tsx` → Poppins ağırlıkları `400/500/600/700` → `400/500/700`; `adjustFontFallback: true` ve `fallback: ['system-ui','arial']` eklendi.

**İlk işin:** kullanıcıdan sunucuda şu çıktıları al ve hatayı çöz:

```bash
# Plesk SSH üzerinde:
tail -n 80 /tmp/next-build.log
systemctl status travel-web --no-pager | head -n 15
ls -lh frontend/.next/BUILD_ID 2>&1
```

- Eğer hata `beasties`/`optimizeCss` kaynaklıysa, geçici olarak `CSS_OPTIMIZE=0` ile build et:
  ```bash
  cd /var/www/.../travel/frontend
  CSS_OPTIMIZE=0 nohup npm run build > /tmp/next-build.log 2>&1 &
  tail -f /tmp/next-build.log
  # build bitince:
  systemctl restart travel-web
  sleep 3 && systemctl status travel-web --no-pager | head -n 10
  ```
- Site ayağa kalktıktan sonra `optimizeCss`'i farklı yoldan denemen gerekecek (bkz. §5/p2).

---

## 4) PSI Performance — sıradaki hamleler

> Etki sırasıyla. Her madde için: **Ne yapılacak → Hangi dosya(lar) → Beklenen kazanım → Risk.**

### p1 — Chunk 1413'ü tespit et + ağır lib'leri lazy yükle  *(IN_PROGRESS)*
- **Ne yapılacak:**
  - `ANALYZE=1 npm run build` (next bundle-analyzer kurulu değilse `@next/bundle-analyzer` ekle veya geçici `next build --profile` çıktısına bak). En kolay yol: `frontend/.next/server/app-paths-manifest.json` + `frontend/.next/build-manifest.json` üzerinden `1413` chunk'ı hangi modül(ler)i içeriyor bul.
  - Adaylar: `react-datepicker` (anasayfada gerek yok), tarih kütüphaneleri, harita/swiper, locale-data dump'ları.
  - `next/dynamic({ ssr: false })` ile lazy yükle. Anasayfada görünmüyorsa **anasayfada hiç import etme**.
- **Dosyalar:** `frontend/src/components/...DatePicker*.tsx`, anasayfada zincirleme import edenler. `Grep "react-datepicker"` ile başla.
- **Kazanım:** TBT'de büyük düşüş; PSI'ın "Unused JavaScript" satırı ~150-300 KiB azalır.
- **Risk:** SSR/CSR uyumsuzluğu — dynamic import ederken `ssr: false` kullan.

### p2 — Render-blocking CSS  *(geçici DEVRE DIŞI)*
- **Durum:** `experimental.optimizeCss` açıkken build patlıyor olabilir. İki olası yol:
  1. **`beasties` ile devam et** — build hatasını analiz et (Tailwind'in `@layer` yapısıyla çakışma olabilir). Çözüm sürümü düşürmek veya `beastiesOptions` ile spesifik selector'ları skip etmek.
  2. **Manuel critical CSS** — anasayfa için `frontend/src/app/[locale]/(app)/(home-pages)/layout.tsx` veya `page.tsx`'e `<style dangerouslySetInnerHTML>` ile yalnızca above-the-fold CSS gömüp gerisini async yükle.
- **Kazanım:** ~1190 ms render-blocking → <300 ms. LCP'ye doğrudan etkisi.
- **Risk:** FOUC. Önce hero/header CSS'i kritik say.

### p3 — Web font kritik yol  *(KISMEN TAMAM)*
- Poppins 4→3 weight ve `adjustFontFallback` push edildi.
- Sıradaki: anasayfada Poppins ihtiyaçsızsa `display: 'swap'`'i koru, **subset'i Türkçe'ye odakla** (`subsets: ['latin', 'latin-ext']`). Header logosunda webfont varsa SVG'leştir.
- **Dosya:** `frontend/src/app/layout.tsx`.

### p4 — Görselleri sunucuda recompress  *(IN_PROGRESS)*
- 27 görsel için ~883 KB tasarruf yapıldı; PSI hâlâ ~361 KiB diyor → kalan görseller `public/` veya CDN'de.
- **Komut (sunucu):**
  ```bash
  cd /var/www/.../travel/frontend
  AVIF_RECOMPRESS_MIN_KB=20 AVIF_QUALITY=55 AVIF_EFFORT=6 \
    node scripts/resize-external-avifs.mjs
  ```
- Yeni görseller artık otomatik admin paneldeki "Image Quality" profillerine göre yükleniyor (bkz. §6).

### p5 — Hero profili ince ayar
- `image_upload_profiles` tablosunda `folder='hero'` satırını yeniden değerlendir (varsayılan: 1440x810, quality=60, effort=6, thumb=256). Mobil LCP için 960px versiyonu denenebilir.
- Yer: admin paneli `/manage/settings/image-quality` (canlı UI).

### p6 — DOM düğüm sayısı (1610 → <1500)
- **Sebep:** Anasayfada gizli react-datepicker, gizli sticky CTA'lar, fazla `<li>` kart var.
- Anasayfada **görünmeyen** her component'i `next/dynamic` ile lazy yükle. Kart listelerini ilk render'da `slice(0, N)`.

### p7 — Final
- Yerelde `npm run build`, sunucuda manuel deploy, PSI tekrar ölç. 100'e ulaşınca commit/push, kullanıcı onayıyla bu dosyayı sil veya `docs/` altına taşı.

---

## 5) Görsel kalite (admin paneli) — bilmen gerekenler

- **Tablo:** `image_upload_profiles` (PK: `folder`).
- **Migration'lar:** `260_image_upload_profiles.sql` + `261_image_upload_profiles_owner.sql` (ikinci dosya app-role owner/grants idempotent fix).
- **Backend:** `backend/src/travel/media/media_http.gleam` → `GET/PATCH /api/v1/media/image-profiles`. Hata mesajları `pog_error_to_string()` ile detaylı dönüyor (debug için kritik).
- **Frontend API client:** `frontend/src/lib/travel-api.ts` → `getImageUploadProfiles()`, `updateImageUploadProfile()`. Type: `ImageUploadProfile`.
- **Upload route:** `frontend/src/app/api/upload-image/route.ts` — profilleri 60s in-memory cache'le çekiyor; cache miss → `FALLBACK_PROFILES` (kodda hardcoded). Yeni yüklemeler artık DB'deki ayarlara göre işleniyor; varsa `*-thumb.avif` yan dosyası üretip `thumbUrl` döndürüyor.
- **Admin sayfası:**
  - `frontend/src/app/[locale]/(app)/(other-pages)/manage/settings/image-quality/page.tsx`
  - `.../image-quality/ImageQualitySettingsClient.tsx`
- **Sol menü:** `frontend/src/app/[locale]/(app)/(other-pages)/manage/ManageAdminNavTree.tsx` (Settings + Medya altında link).
- **Mevcut görseller** otomatik dönmez — `scripts/resize-external-avifs.mjs` manuel çalıştırılır (bkz. p4).

---

## 6) Bilinen tuzaklar (canını yakacak şeyler)

1. **DB adı sunucuda farklı:** Lokal `travel`, sunucu `travel_rezervasyonyap`. Migration sırasında **kesinlikle hangi DB'ye bastığını teyit et**.
2. **psql peer auth fail:** `psql -U postgres -d ...` çalışmaz. Doğru kullanım:
   ```bash
   sudo -u postgres psql -d travel_rezervasyonyap < backend/priv/sql/modules/NNN_xxx.sql
   ```
3. **Tablo owner = postgres olunca app rolü okuyamaz** → `42501/insufficient_privilege`. Çözüm: yeni migration aç, `261_*_owner.sql` örneğindeki `DO $$ ... ALTER TABLE ... OWNER TO blueman_travel ... GRANT ... $$` kalıbını kullan.
4. **PowerShell ≠ Bash:** Sunucu Linux ama yerel Windows. Yerel komutlar için `;` (chain), `&&` PowerShell 7+ harici çalışmaz. `$!`, `nohup`, `tail -f` Bash'te çalışır.
5. **`npm ci` lock-mismatch hatası verirse:** `rm -rf node_modules .next; npm install --no-audit --no-fund; npm run build`.
6. **`npm audit fix` ÇALIŞTIRMA** — major downgrade riski (Next.js 9'a düşürmüştü). Uyarıları kullanıcıya bildir, otomatik düzeltme yapma.
7. **`npm run build` 1-3 dk sürer**, hang gibi görünür. `nohup ... > /tmp/next-build.log 2>&1 &` + `tail -f /tmp/next-build.log` ile detach et.
8. **Plesk SSH terminali takılırsa** yeni terminal aç; `pkill -f "next-server"` veya `pkill -f "node.*build"` ile takılı süreçleri öldür.
9. **CSS/JS `text/plain` dönüyor / 500:** Build sonrası `systemctl restart travel-web` unutuldu demektir.
10. **`gleam build` lokalde Windows'ta** çalışır; CWD mutlaka `backend/` olmalı.

---

## 7) Deploy döngüsü (referans)

```bash
# Yerel:
git add -A && git commit -m "..." && git push

# Sunucu (Plesk SSH):
cd /var/www/.../travel
git pull --ff-only

# Backend değiştiyse:
cd backend
gleam build
systemctl restart travel-api
sleep 2 && systemctl status travel-api --no-pager | head -n 8

# SQL eklendiyse:
sudo -u postgres psql -d travel_rezervasyonyap < priv/sql/modules/NNN_xxx.sql

# Frontend değiştiyse:
cd ../frontend
nohup npm run build > /tmp/next-build.log 2>&1 &
tail -f /tmp/next-build.log   # bitince Ctrl+C
systemctl restart travel-web
sleep 3 && systemctl status travel-web --no-pager | head -n 10
```

---

## 8) TodoWrite başlangıç listesi (kopyala, statüleri güncelle)

```
p0  Site ayağa kaldır: tail /tmp/next-build.log → hata bul → CSS_OPTIMIZE=0 build → restart  [in_progress]
p1  Chunk 1413 kim? bundle analyzer + react-datepicker'ı dynamic yap                          [pending]
p2  Render-blocking CSS: optimizeCss tamir veya manuel critical CSS                           [pending]
p3  Poppins subset/optimize finalize                                                          [pending]
p4  resize-external-avifs sunucuda yeniden + kalan görseller                                  [pending]
p5  hero profili (image_upload_profiles) ince ayar                                            [pending]
p6  DOM 1610 → <1500: anasayfa gizli component'leri dynamic, listeleri sınırla                [pending]
p7  PSI son ölçüm + commit/push + deploy                                                      [pending]
```

---

## 9) Composer 2'ye özel direktifler

- **Açıklamayı kısa tut.** Kullanıcı fluent geliştirici; uzun "neden" anlatma.
- **Komutları bizzat çalıştırma yerine** kullanıcıya net komut bloğu ver — sunucu işlemlerini kullanıcı kendi yapıyor.
- Frontend dosyası düzenlersen sonunda `ReadLints` çalıştır.
- Backend dosyası düzenlersen `gleam build` çalıştır (`backend/` CWD).
- Yeni SQL eklersen `install_order.txt` güncelle + cevabına manuel komutu yaz.
- Bu dosyayı silme. PSI 100 olunca kullanıcıya "siliyim mi?" diye sor.
- Çelişki olursa **bu dosya doğrudur**, kod ikinci sıradadır (ama her zaman `Grep` ile teyit et).
