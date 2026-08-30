# Yönetim e-posta bildirimleri

Alıcı: **ino@rezervasyonyap.com.tr** (kullanıcının belirttiği adres).
Bu posta akışı müşteri/tedarikçi bildirimlerini değiştirmez; yalnızca iç operasyon içindir.

## Kapsam

- Yeni rezervasyon; rezervasyon veya ödeme durumu değişikliği.
- İletişim formuna yazılan müşteri mesajı.
- Yeni üyelik ve misafir hesabının üyeliğe dönüşmesi (parola, doğrulama kodu ve kimlik numarası gönderilmez).
- Yeni destek talebi ve müşterinin destek talebine yazdığı mesaj (dahili notlar hariç).
- Yeni rezervasyon eskalasyonu / yönetim müdahalesi ihtiyacı.
- Yeni ilan, yayın/taslak/arşiv durumu değişikliği ve ilan silme (beş dakikalık özet).
- Tedarikçi başvurusunun gönderilmesi, incelemeye alınması, onayı veya reddi.
- Ödeme yetkilendirme/tahsilat, başarısız ödeme ve iade; para transferi oluşturma ve durum değişiklikleri.
- Yeni kurum/acente/tedarikçi; acente ve tedarikçi faturalarının düzenlenmesi veya iptali.
- Yeni müşteri yorumu, moderasyon durumu değişikliği; ilan şikâyeti ve işlem durumu.
- Yönetici/personel yetkisi verilmesi, değiştirilmesi veya kaldırılması.
- Sağlayıcı aktarımının tamamlanması veya hata vermesi; kayıt altına alınan entegrasyon,
  sosyal paylaşım, yapay zekâ işi ve müşteri bildirim hataları (beş dakikalık özet).

Yalnızca gerçek durum geçişleri bildirilir; aynı durumun yeniden kaydedilmesi bildirim
üretmez. İlan açıklaması/fiyat/görsel güncellemeleri, sayfa görüntülemeleri, başarılı arka plan
AI işleri, giriş denemeleri ve kimlik doğrulama kodları bu kapsamda değildir. Bu sistem,
uygulama dışında oluşan sunucu kesintilerini algılayan bir uptime izleyicisi değildir.

Özet olayları `admin_email_digest_events` tablosunda tek tek tutulur. Her beş dakikalık
pencere kapandıktan sonra worker bunları tür/işlem bazında birleştirir. Bir özette toplam
olay sayısı ve ilk 100 olayın ayrıntıları yer alır; kalan olaylar silinmez. Kuyruk gecikirse
birden çok kapanmış pencere aynı özette birleşebilir. E-postalar dakika başı çalışan worker
ile gönderilir; kuyruk/sağlayıcı hataları teslim süresini uzatabilir.

Geçmiş kayıtlar geriye dönük gönderilmez. Olay ve kuyruk kaydı aynı veritabanı işlemiyle commit edilir.
Yönetim mesajları Türkçedir; ziyaretçi vitrin metinleri değişmez.

## Kurulum ve kontrol

Normal `DEPLOY_REF=main ./deploy/deploy.sh` akışı 435/436/437 modüllerini uygular ve dakikalık
`travel-admin-email.timer` servisini kurar. Çalışan backend ile aynı
`/etc/rezervasyonyap/backend.env` bağlantısını kullanır. Node 25+ ve mevcut `pg` bağımlılığı gerekir.

Gönderim mevcut Resend entegrasyonunu kullanır: yönetimdeki `integrations.resend_api_key`,
yoksa `RESEND_API_KEY`; gönderen için `supplier_notify_from`, `SUPPLIER_NOTIFY_FROM`,
`INVOICE_NOTIFY_FROM`, son çare `rezervasyon@rezervasyonyap.com.tr` kullanılır.
Gönderen alan adının Resend üzerinde doğrulanmış olması gerekir.
Anahtarları Git'e, loglara veya sohbet mesajına koymayın.

Sunucuda salt okunur hazırlık kontrolü:

```bash
TRAVEL_DB_ENV=/etc/rezervasyonyap/backend.env node scripts/process-admin-emails.mjs --check
systemctl status travel-admin-email.timer travel-admin-email.service
journalctl -u travel-admin-email.service -n 30 --no-pager
```

`--check` yalnızca yapılandırmanın varlığını ve kuyruk sayılarını gösterir; anahtarın geçerli
olduğunu veya alıcı posta kutusuna teslim edildiğini kanıtlamaz. Eksik anahtar veya başarısız
iş varsa sıfırdan farklı çıkış kodu döner.

## Başarısızlıklar

`admin_email_outbox` durumları: `pending`, `accepted`, `failed`.
`accepted`, Resend'in bir ileti kimliği döndürdüğünü belirtir; gelen kutusuna teslim kanıtı
değildir. Teslim/bounce bilgisi için Resend kayıtları ve gerçek posta kutusu kontrol edilir.

429, ağ/zaman aşımı ve 5xx hataları artan aralıklarla en fazla 8 kez denenir.
Kalıcı 4xx hatalarında anahtar, alan adı ve gönderim yetkisi kontrol edilir.
Servis hataları ham sağlayıcı yanıtı veya e-posta içeriği loglamaz.

Aynı iş için sabit istek gövdesi ve idempotency anahtarı kullanılır. Sağlayıcı anahtarı
24 saat tuttuğu için ilk denemesi 23 saati aşan belirsiz işler otomatik yeniden gönderilmez.
Önce sağlayıcıdan gönderim durumu kontrol edilmeli; ardından gerekirse operatör kontrollü
yeniden deneme yapılmalıdır. Kontrol etmeden yeni iş oluşturmayın veya deneme tarihini sıfırlamayın.
Bkz. [Resend idempotency](https://resend.com/docs/dashboard/emails/idempotency-keys).

Kuyruk kişisel iletişim bilgileri içerir: yalnızca yetkili operasyon/veritabanı erişimine açık
tutulmalı ve kurumun saklama süresine göre temizlenmelidir.

## Test

```bash
node --test scripts/admin-email-worker.test.mjs
ADMIN_EMAIL_TEST_DB=1 node --test scripts/admin-email-worker.test.mjs
```

İkinci komut yalnızca `127.0.0.1:55436` üzerindeki ayrı PostgreSQL test sunucusunu kullanır;
uygulamanın DB ortamını okumaz. Geçici bir test şeması açıp kapatır. Sağlayıcı çağrıları
kontrollü yanıtlarla test edilir; gerçek e-posta gönderilmez. Aynı testler CI'da çalışır.
