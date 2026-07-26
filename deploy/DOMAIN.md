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

## İsteğe bağlı: `httpdocs/uploads` symlink

Bazı kurulumlarda `httpdocs/uploads` → `frontend/public/uploads` sembolik bağ oluşturulmuş olabilir (Apache doküman kökü `httpdocs` iken `/uploads/` isteğini doğrudan dosyadan sunmak için). Next.js tarafında `/uploads/**` için `frontend/src/app/uploads/[[...segments]]/route.ts` kullanılıyorsa bu bağ **zorunlu değildir**.

Kaldırmak için (yalnızca symlink ise; gerçek klasörü silmeyin):

```bash
cd /var/www/vhosts/rezervasyonyap.tr/httpdocs
test -L uploads && rm uploads
```
