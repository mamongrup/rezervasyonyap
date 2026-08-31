# Sosyal paylaşım korumaları

31 Ağustos 2026 olayı: Comodo 218530, `northwind` ilan adını SQL veritabanı adı
sanarak kaynak/JPEG isteklerini engelledi. Plesk forbidden hata sayfası dışarıya
404 döndü. Ardından iptal edilmiş Meta token yenilendi. Paylaşım devam ederken
120 saniyelik curl zaman aşımı yanıltıcı servis hatası üretti.

## Korunan davranışlar

- Zamanlayıcı yaklaşık 10 dakikada bir, istek başına bir iş işler.
- Curl 360 saniye, systemd 420 saniye bekler. Bu süreler başarı garantisi değildir.
- HTTP bağlantısı kesilse de Node sürecindeki kuyruk kilidi iş tamamlanmadan
  kalkmaz. Aynı süreçte worker-process/worker-loop çakışması `worker_busy` ile
  atlanır. Kilit hata durumunda finally ile serbest bırakılır.
- Bu bir dağıtık kilit değildir: birden fazla Next süreci/replica veya doğrudan
  facebook-post çağrısı için veritabanı tabanlı iş sahiplenme ayrıca gerekir.
- Tek turluk hizmet Meta hız sınırında uyuyup systemd süresini aşmaz; işi sonraki
  tura bırakır. İptal edilmiş token hatası servis hatası olarak görünür.
- Başarıyla posted yapılan işin eski error_message değeri backend tarafından
  temizlenir. Tarihsel posted kayıtları bu teslimatta topluca değiştirilmez.
- Kapak hatası aynı ağdaki diğer seçilmiş işleri durdurmaz. Başka tesisin görseli
  kullanılmaz. Testler gerçek ağlara gönderi yapmadan çalışır.

## Sunucu ayarının korunması

`social-modsecurity-apache.conf.example`, canlıda uygulanıp doğrulanan dar
istisnanın sürümlenmiş kopyasıdır. Plesk'in HTTPS ek Apache direktiflerinde
tutulur; normal uygulama deploy'u bu alanı değiştirmemelidir. Sunucu taşıma,
Plesk geri yükleme veya WAF kural güncellemesinden sonra ayrıca doğrulayın.
Bu dosya otomatik yüklenmez; mevcut canlı istisnayı ikinci kez eklemeyin.

```bash
TRAVEL_DB_ENV=/etc/rezervasyonyap/backend.env node scripts/recover-ai-social.mjs --social-only
systemctl list-timers --all travel-social-worker.timer --no-pager
journalctl -u travel-social-worker.service --since '30 minutes ago' -n 40 --no-pager
```

`northwind` artık ilk iki pending iş içinde değilse public görseli açıkça sınayın:

```bash
curl --max-time 40 -sS -o /dev/null -w 'cover HTTP %{http_code}\n' 'https://rezervasyonyap.tr/api/og/listing?kind=stay&handle=northwind-a-bs-71&locale=tr&variant=social&title=Northwind'
```

Timeout sonucu belirsizdir: posted_at / external_post_id kayıtlarını ve Meta
hesabını kontrol etmeden tekrar iş eklemeyin. Kuyruğu topluca sıfırlamayın.
Token'lar parola/güvenlik değişikliğiyle iptal olabilir; bunları otomatik
yenileme garantisi yoktur. Anahtarları Git'e, loglara veya destek mesajına koymayın.

## Dağıtım

Backend, frontend ve systemd ayarları değiştiği için tam normal detached deploy
gereklidir; SKIP_BACKEND_BUILD kullanmayın. Canlıda uygulanmadan korumalar etkin
sayılmaz. Bu teslimat AI/SEO üretimindeki ayrı sorunu çözmez.
