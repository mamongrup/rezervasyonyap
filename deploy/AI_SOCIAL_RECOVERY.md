# AI ve sosyal paylaşım onarımı

Bu akış gerçek API anahtarlarını terminale yazdırmaz. Anahtarları komut satırına veya Git'e koymayın.

## İlk adım: sunucuda sağlayıcı doğrulama ve güvenli model onarımı

Devam eden deploy yokken, repo kökünde:

```bash
git pull --ff-only origin main
TRAVEL_DB_ENV=/etc/rezervasyonyap/backend.env node scripts/recover-ai-social.mjs --repair-ai
```

Bu komut:

- Backend'in kullandığı platform AI ayarını ve kullanılabilir Gemini anahtar havuzunu okur.
- Hesabın `models.list` cevabından `generateContent` destekleyen modelleri bulur.
- Mevcut model uygunsa önce onu; değilse listelenen kararlı Flash metin modellerini küçük JSON üretimleriyle sınar.
- En fazla dört anahtar ve anahtar başına üç model dener. Üretim testleri sağlayıcı kotası/ücreti kullanabilir.
- Sadece başarılı üretim sonrası `site_settings.ai.gemini_model` alanını günceller.
  Anahtarları, diğer ayarları, devre dışı sağlayıcıları veya kota bekleyen anahtarları değiştirmez.
  Eşzamanlı ayar değişikliği algılanırsa yazmaz.
- DeepSeek kimlik doğrulamasını modeller uç noktasından kontrol eder; `http_401`/`http_403`
  görülürse yönetimde geçerli anahtar girilmesi gerekir. DeepSeek üretimi bu komutta sınanmaz.
- İlk iki bekleyen sosyal iş için kayıtlı/dinamik kapak, public JPEG ve loopback JPEG erişimini raporlar.
- **Hiçbir sosyal gönderi yayımlamaz; AI kuyruğunu sıfırlamaz, iş eklemez veya yayın kalite kapısını atlamaz.**

Bayraksız kullanım ayarlara yazmaz ve Gemini içerik üretimi yapmaz. `--social-only` yalnızca
sosyal görselleri kontrol eder. Kaynak ve JPEG istekleri mevcut görüntü üretim uçlarını çağırır.
Sosyal sonuçlar job ID, HTTP durumu ve güvenli hata kodlarından oluşur; anahtarlar ve ham sağlayıcı cevapları yazılmaz.

## Sonuçların anlamı

- `verified_and_saved`: küçük Gemini JSON üretimi başarılı ve model ayarı kaydedildi.
  Bu, bir ilanın altı dilde tamamlandığı anlamına gelmez. Mevcut zamanlayıcının ilk başarılı
  ilan adımı ve ardından çeviri/SEO ilerlemesi ayrıca kontrol edilmelidir.
- `not_repaired_check_keys_or_quota`: doğrulama başarısız, ayar değiştirilmedi.
- `http_401` / `http_403`: anahtar/yetki; `http_429`: kota/hız sınırı; `http_404`: model/uç nokta.
- `network_timeout_or_redirect`: sunucunun HTTPS/DNS/bağlantı veya yönlendirme kontrolü gerekiyor.
- Dinamik kapak ve JPEG başarılı, kayıtlı kapak başarısız: eksik eski kapak dosyası.
- Public JPEG başarısız, loopback JPEG başarılı: sunucunun kendi public alan adına erişimi araştırılmalı.
- Her iki JPEG başarısız: `error` ve varsa `upstream_status` kaynağı/dönüşümü ayırır.

## Frontend düzeltmesinin dağıtımı

Sosyal worker artık eksik özel kapak yerine **aynı ilanın dinamik markalı kapağını** dener.
Markasız galeri veya başka ilan görseliyle paylaşım yapmaz. Kapak URL'si worker'ın site köküyle
üretilir; erişim hatalarında güvenli HTTP/hata ayrıntısı kaydedilir. Bu kod değişikliği için
normal frontend build/deploy gerekir; tanılama/model onarımı için build gerekmez.

Tanılama çıktısı alınmadan başarısız binlerce işi topluca `pending` yapmayın. Geçerli anahtar
gerekiyorsa panelde güncelleyin; ardından sağlayıcı testini ve tek ilan ilerlemesini doğrulayın.

API referansları: [Gemini models.list](https://ai.google.dev/api/models),
[DeepSeek models](https://api-docs.deepseek.com/api/list-models/).

Testler:

```bash
node --test scripts/ai-provider-recovery.test.mjs
cd frontend
node node_modules/vitest/vitest.mjs run src/lib/social-share/cover-probe.test.ts
```
