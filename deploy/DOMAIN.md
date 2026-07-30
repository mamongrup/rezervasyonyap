# Üretim domainleri

| Rol | Alan adı | Davranış |
|-----|----------|----------|
| Ana Türkçe vitrin | **rezervasyonyap.tr** | Ana domain ve tek uygulama/deploy kökü |
| Türkçe marka domaini | **rezervasyonyap.com.tr** | Aynı uygulamayı ve Türkçe vitrini açar |
| Uluslararası vitrin | **reservationinturkey.com** | Aynı uygulamayı açar; ilk ziyarette ülke/dil algılamasıyla dil segmentine yönlendirir |

Uygulama yalnızca `/var/www/vhosts/rezervasyonyap.tr/httpdocs` altında deploy edilir.
Diğer iki alan adı Plesk'te **HTTP yönlendirmesi yapılmayan domain alias** olarak ana
domainin web hizmetine bağlanmalıdır. Böylece adres çubuğunda ziyaret edilen marka
domaini kalır ve üç ayrı kod kopyası oluşmaz. Alias ayarında `Web service` açık,
`Redirect with HTTP 301` kapalı olmalıdır.

Üç domainin `www` karşılıkları da aynı hedefe bağlanmalı, DNS A/AAAA kayıtları aynı
sunucuya yönelmeli ve DNS tamamlandıktan sonra her domain SSL sertifikasına dahil
edilmelidir.

## Google indeksleme (üç domain)

Kod tarafı: istek host’una göre **canonical**, `robots.txt` (`Host` + `Sitemap`) ve
`/sitemap.xml` aynı marka domainini gösterir. Böylece Google
`rezervasyonyap.com.tr` veya `reservationinturkey.com` taradığında içeriği
`rezervasyonyap.tr`’ye “gömmeye” zorlanmaz.

Search Console’da her apex için ayrı mülk ekleyin ve sitemap gönderin:

1. [Google Search Console](https://search.google.com/search-console) → mülk ekle
   - `https://rezervasyonyap.com.tr`
   - `https://reservationinturkey.com`
   (Ana `.tr` zaten varsa bırakın.)
2. Doğrulama: DNS TXT veya paneldeki `search_console_verification` HTML meta
   (her mülk için ayrı doğrulama gerekebilir).
3. **Sitemaps** → her mülkte kök index’i gönderin (kategori parçalarını içerir):
   - `https://rezervasyonyap.com.tr/sitemap.xml`
   - `https://reservationinturkey.com/sitemap.xml`
   - Index altındaki örnekler: `/sitemap/hotel.xml`, `/sitemap/tour.xml`,
     `/sitemap/site.xml` (anasayfa + CMS + blog), … (tüm dikeyler)
4. İndekslemeyi **kategori kategori** hızlandırmak için URL inspection:
   - Hub: `/oteller/all`, `/turlar/all`, … (RIT’te `/en/…`)
   - İstenirse ilgili `/sitemap/{kategori}.xml` içinden örnek ilan URL’leri

Not: Aynı içeriğin üç host’ta da yayında olması Google’ın birini “ana”
seçmesine yol açabilir; yine de host-doğru canonical olmadan marka domainleri
pratikte indekslenmez. `www` → apex tercihi canonical’da apex’e normalize edilir.

Kod ayrıca: host’a özel title/description, footer’da kardeş site linkleri,
TravelAgency+LocalBusiness JSON-LD (adres/geo/hasMap/sameAs), kategori hub
canonical’ları ve Search Console doğrulama kodlarını host bazında seçer.

## Google ekosistemi (Search + Maps + etkileşim)

Bunlar kod deploy’undan bağımsız; üst sıralar ve Maps paneli için zorunlu operasyon:

### Search Console / Search
1. Üç apex mülkü doğrula (DNS veya panel → Genel ayarlar → Google → domain kodları).
2. Her mülkte `/sitemap.xml` gönder; kapsam → sayfa indeksleme oranını izle.
3. Performans raporunda gösterim yüksek / tıklama düşük sorgularda title+snippet iyileştir.
4. “Deneyim” (Core Web Vitals) uyarılarını mobil için kapat.

### Google Business Profile (Maps / yerel paket)
1. GBP’de web sitesi = `https://rezervasyonyap.tr` (veya markaya göre tutarlı tek URL).
2. NAP (adres/telefon) sitedeki Hakkımızda / JSON-LD ile **birebir** aynı olsun.
3. Kategori: Seyahat acentesi; hizmetler: otel, tur, villa, transfer…
4. Haftalık fotoğraf + ürün/hizmet; yorumlara yanıt (Maps sıralaması).
5. İsteğe bağlı: panel branding’e `google_maps_place_url` / `google_place_id` ekleyin
   (JSON-LD `hasMap` / Place eşlemesi güçlenir).

### Google diğer ürünler
| Ürün | Amaç |
|------|------|
| GA4 + GTM | Davranış / dönüşüm (Consent Mode açık) |
| Google Ads | Marka + şehir×kategori kampanyaları (Search etkileşimi) |
| Merchant / Hotel Center | Uygunsa fiyat feed (zengin sonuç) |
| YouTube / Shorts | Destinasyon videoları → marka araması |
| Reviews (GBP) | Yerel paket + güven |

### Üç sitenin birlikte yükselmesi
- `.tr` = ana Türkçe otorite; `.com.tr` = TR marka; `reservationinturkey.com` = EN/uluslararası.
- Host’a özel meta + sitemap + çapraz footer linkleri kodda var; yine de **benzersiz
  içerik** (özellikle RIT EN metinleri, şehir hub’ları) olmadan Google tek host’u tercih edebilir.
- Backlink ve GBP’de mümkün olduğunca `.tr`’yi güçlendirin; diğer domainlere de
  doğal marka mention’ları ekleyin.

## İsteğe bağlı: `httpdocs/uploads` symlink

Bazı kurulumlarda `httpdocs/uploads` → `frontend/public/uploads` sembolik bağ oluşturulmuş olabilir (Apache doküman kökü `httpdocs` iken `/uploads/` isteğini doğrudan dosyadan sunmak için). Next.js tarafında `/uploads/**` için `frontend/src/app/uploads/[[...segments]]/route.ts` kullanılıyorsa bu bağ **zorunlu değildir**.

Kaldırmak için (yalnızca symlink ise; gerçek klasörü silmeyin):

```bash
cd /var/www/vhosts/rezervasyonyap.tr/httpdocs
test -L uploads && rm uploads
```
