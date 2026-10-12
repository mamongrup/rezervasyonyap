# 12 Ekim 2026 — doğrulanmış durum

Google Ads hesabı: 517-550-3933. Yedi kontrollü arama kampanyası, 42 dil grubu,
42 onaylanmış duyarlı arama reklamı ve 168 tam/sıralı anahtar kelime mevcut.
Her kategori altı dili aynı 1.000 TRY ortalama günlük bütçede toplar.
Tüm grupların tıklama teklifi 15 TRY. Arama ortakları ve Display kapalı.
Türkiye konum hedeflemesi yalnızca bulunan/düzenli bulunan kişiler içindir.
22 sıralı negatif kelime ortak listesi yedi kampanyaya bağlıdır.
Eski yedi Maksimum Performans kampanyası ve yeni arama kampanyaları duraklatılmıştır.
Canlı hesap doğrulaması `search-live-verified.json` içindedir.

GTM-NNTPGXW sürüm 11 yayındadır. GA4 purchase ve Google Ads
7839588230 satın alma işlemi, sunucunun doğruladığı ilk tahsilatı ölçmek üzere
yapılandırılmıştır. İşlem kimliği, tahsilat tutarı ve para birimi kullanılır;
misafir adı, e-posta ve telefon gönderilmez. Sayfa görüntüleme hesap varsayılan
teklif hedefinden çıkarılmıştır. Kod ecb3cf96 sürümünde main'e gönderilmiştir.
11 ödeme ölçüm testi, TypeScript kontrolü ve backend derlemesi geçmiştir.
Gerçek ödeme yapılarak uçtan uca reklam atfı henüz doğrulanmamıştır.

BookingAgora/travelrobot, Wtatil ve Yolcu360 ayarlarında satış fiyat artışı %15'tir.
BookingAgora ve Wtatil canlı kimlik doğrulama testleri başarılıdır. Net fiyat,
tekrar çalıştırma ve kontenjan koruma için dört fiyatlama testi geçmiştir.
Yolcu360 test/staging adresi kullanmaktadır; üretim erişimi hazır değildir.
Turna kayıtlarında fiyat yoktur; karşı sağlayıcı onayı/erişimi ayrıca gereklidir.
Komisyon alanı ile sağlayıcı net fiyatına eklenen satış artışı farklı alanlardır;
tüm ilanlara körlemesine ikinci kez %15 eklenmemiştir.

Canlı yayınlanan kayıtların ön kalite kontrolü:

| Kategori | Yayınlanan | Altı dilde dolu açıklama | En az iki görsel |
| --- | ---: | ---: | ---: |
| Otel | 58.133 | 448 | 57.057 |
| Tatil evi | 878 | 22 | 875 |
| Yat | 845 | 0 | 839 |
| Tur | 2.636 | 0 | 2.134 |
| Gemi turu | 658 | 0 | 649 |
| Aktivite | 45 | 45 | 43 |

Bu sayım editoryal, SEO, oda görselleri, doğru fiyat ve gerçek müsaitlik onayı
yerine geçmez. Eksik içerikler satışa/reklama hazır kabul edilmez.
Kullanıcı Gemini anahtarlarını henüz yenilemediğini belirtti; AI işçisi kapalı
kalacaktır. Bu nedenle bütün ilanların kalite onarımı tamamlanmış değildir.

API paketi canlı servise aktarılmış, SELinux standart etiketleri korunarak
başlatılmış ve yerel/dış API uç noktaları HTTP 200 ile doğrulanmıştır.
Web paketi Node 25.9.0 ile derlenmektedir; tamamlanma sonucu ayrıca kaydedilir.
