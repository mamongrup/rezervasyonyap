# 12 Ekim 2026 — doğrulanmış durum

Google Ads hesabı: 517-550-3933. Yedi kontrollü arama kampanyası, 42 dil grubu,
42 onaylanmış duyarlı arama reklamı ve 168 tam/sıralı anahtar kelime mevcut.
Otel, tatil evi, yat, gemi turu ve aktivite altı dili aynı 1.000 TRY ortalama
günlük kategori bütçesinde toplar. Kullanıcının güncel talebiyle tur kampanyasının
dili Google Ads'te yalnızca Türkçe olarak kaydedilmiştir; yabancı dil tur grupları
duraklatılmıştır. Önceki 42 reklam kaydı silinmemiştir; yeni hazırlık dosyasında
turun beş yabancı dili çıkarılarak 37 reklam ve 148 anahtar kelime bulunmaktadır.
Tüm grupların tıklama teklifi 15 TRY. Arama ortakları ve Display kapalı.
Türkiye konum hedeflemesi yalnızca bulunan/düzenli bulunan kişiler içindir.
22 sıralı negatif kelime ortak listesi yedi kampanyaya bağlıdır.
Eski yedi Maksimum Performans kampanyası ve yeni arama kampanyaları duraklatılmıştır.
İlk canlı hesap doğrulaması `search-live-verified.json` içindedir; sonraki
Türkçe tur değişikliği `tour-turkish-language-proof.png` ile doğrulanmıştır.

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
| Tur (artık yalnızca Türkçe) | 2.636 | Uygulanmaz | 2.134 |
| Gemi turu | 658 | 0 | 649 |
| Aktivite | 45 | 45 | 43 |

Bu sayım editoryal, SEO, oda görselleri, doğru fiyat ve gerçek müsaitlik onayı
yerine geçmez. Eksik içerikler satışa/reklama hazır kabul edilmez.
Veritabanında beş etkin Gemini anahtarı kayıtlıdır; kontrol anında beşi de kota
kilidindedir. Daha önce belirtilen altıncı anahtar doğrulanamamıştır. DeepSeek
anahtarı kayıtlı ve sağlayıcı etkindir; küçük üretim testi HTTP 402 (yetersiz
bakiye) vermiştir. Çalışan anahtar doğrulanmadan AI işçisi başlatılmamıştır.
Bu nedenle bütün ilanların kalite onarımı ve çevirileri tamamlanmış değildir.

Anahtar ekranında API hatasının boş anahtar listesi olarak gösterilmesi
düzeltilmiştir. Değişmeyen anahtarlar kaydetme isteğine eklenmez. Canlı API'de
AI ayarları atomik birleştirilir; boş veya eksik anahtar alanı kayıtlı değeri
silmez. Gerçek SQL, bağlantıya özel geçici tabloda denenmiş ve
`AI_SETTINGS_PRESERVATION_DB_OK` alınmıştır; gerçek anahtarlara dokunulmamıştır.
Üç istemci koruma testi ve iki kategori dil politikası testi geçmiştir.
Backend genel testinde mevcut ParamPos base64 dolgu testi başarısızdır
(13 başarılı, 1 önceden bilinen başarısız). TypeScript ve değişen dosya lint
kontrolleri geçmiştir.

API paketi canlı servise aktarılmış, SELinux standart etiketleri korunarak
başlatılmış ve yerel/dış API uç noktaları HTTP 200 ile doğrulanmıştır.
Önceki web paketi başarıyla derlenmiş ve servis yeniden başlatılmıştır.
Site girişini bozan eski paket/yeni dosya uyumsuzluğu giderilmiştir: giriş
sayfasındaki 32 statik dosya HTTP 200, giriş menüsü tarayıcıda açılır durumdadır.
Türkçe alan adı ve uluslararası alan adının beş dilindeki giriş sayfaları
HTTP 200 ile doğrulanmıştır. Gerçek kullanıcı kimlik bilgileriyle giriş
yapılmamıştır.

Yeni anahtar ekranı düzeltmeleri, çalışan dosyaları değiştirmemek için
`.next-release-5260fb44` klasörüne ayrı derlenmektedir. Bu yeni web sürümü
henüz servise geçirilmemiştir. API anahtar koruması ve kategori dil politikası
5260fb44 sürümüyle canlıya alınmış ve HTTP 200 ile doğrulanmıştır.
