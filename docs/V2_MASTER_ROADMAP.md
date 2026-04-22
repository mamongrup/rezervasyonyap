# Travel Platform — Versiyon 2 (v2) Ana Yol Haritası

**Referans (v1):** Booking Core / Laravel tabanlı ürün — özellik seti ve iş akışları için kaynak; **kopya değil**, veri modeli ve API tasarımında daha kontrollü bir çekirdek hedeflenir.

**Hedef (v2):** Bu repodaki mimari — PostgreSQL modüller (`priv/sql/modules/`), Gleam API, Next.js (`frontend`), modüler genişleme.

**Nasıl kullanılır:** Aşağıdaki kutular ilerleme takibi içindir. Her faz, bağımlılıkları azaltacak şekilde sıralanmıştır.

---

## Mevcut durum (özet) — kod / şema

| Alan | Durum | Not |
|------|--------|-----|
| Çok kiracı / çekirdek | Şema mevcut | `010_core_tenants.sql` |
| i18n | Şema mevcut | `030_i18n.sql` |
| Para birimi + kur | Şema mevcut | `040_currency.sql` |
| Katalog (polimorfik listing) | Şema mevcut | `050_catalog_listings.sql` |
| Sepet / rezervasyon / ödeme / cüzdan | Şema + API kısmen | `060`, `181_booking_lifecycle.sql`, cart/checkout, PayTR token + bildirim |
| Pazarlama | Şema iskelet | `070_marketing.sql` |
| CMS / SEO | Şema iskelet | `080_content_seo.sql` |
| Sosyal | Şema iskelet | `085_social.sql` |
| Medya / CDN | Şema iskelet | `090_media_cdn.sql` |
| Mesajlaşma (SMS/e-posta) | Şema iskelet | `100_messaging.sql` — NetGSM uç noktası örnek |
| Bölge / iCal | Şema iskelet | `110_locations_ical.sql` |
| Yorumlar | Şema iskelet | `120_reviews_moderation.sql` |
| Navigasyon / UI | Şema iskelet | `130_navigation_ui.sql` |
| Etkileşim (favori vb.) | Şema iskelet | `140_engagement.sql` |
| Chat + destek | Şema + API kısmen | `150`, `152` — ticket API |
| Entegrasyonlar | Şema iskelet | `160_integrations.sql` |
| AI | Şema iskelet | `170_ai.sql` |
| Dikey detaylar (tur vb.) | Şema iskelet | `180_verticals.sql` |

**Henüz tipik olarak eksik:** Paratika sanal POS, tam yönetim panelleri, tüm kategori UI’ları, NLP arama, Instagram Graph üretim entegrasyonları, otomatik kur cron, tam kampanya motoru.

---

## Faz 0 — Çekirdek kalite ve güven

- [ ] **F0.1** Şema kurulumunu tek komutla belgelemek (`install_order.txt` + ortam değişkenleri)
- [ ] **F0.2** Göç stratejisi: yeni modül dosyaları (`182_*.sql`) ile eklemek; prod için migration planı
- [ ] **F0.3** API: sağlık, meta, modül listesi — mevcut; genişletilmiş OpenAPI veya `/api/v1/meta` capability listesi
- [ ] **F0.4** Loglama ve hata izi (rezervasyon/ödeme olayları ile uyumlu)
- [ ] **F0.5** Rate limit / abuse temel koruması (public uçlar)

---

## Genel özellikler (1–44) — sıra ile

**Durum özeti (2026-04):** “Genel özellikler” bloğunda hâlâ açık olanlar: **G3.2 / G3.3** için yalnızca **e-fatura / e-arşiv** dış sistem entegrasyonu (iç komisyon fatura kaydı ve API’ler tamam: `190`/`191`, `GET/POST …/invoices`, `/manage/agency` & `/manage/supplier`), **G5–G9** (sosyal, medya pipeline, SEO derinliği, mesaj tetikleyicileri), **G12–G14** ve sonrası (popup, anasayfa sırası UI, iCal otomasyonu, bölge URL, kupon/cüzdan ürün, …). **Tamamlanmış sayılan backend parçalar:** TCMB `POST /api/v1/currency/rates/refresh`, PayTR + Paratika (HPP/notify), `POST /api/v1/payments/active-provider`, `site_settings` + `public-config`, **G2.1** sepet kur kilidi + `GET /api/v1/carts/:id`, **G3.0** `GET /api/v1/roles` + `GET /api/v1/auth/me` → `roles[]` + `permissions[]` (`020_identity_membership` + `189`); **G3.1** müşteri oturum + profil + `reservations/mine` + hesap sayfası; **G3.2** acente portal + **`GET/POST /api/v1/agency/invoices`** + `agency_commission_invoices`; **G3.3** tedarikçi portal + **`GET/POST /api/v1/supplier/invoices`** + `supplier_commission_invoices`; **G3.4–G3.5 (kısmi)** `staff/*` + `/manage/staff` + `audit_log` + `admin/*` + `/manage/admin`. **Fronted:** `/[locale]/...`, checkout’ta kur özeti; `/tr/manage/...`.

### 1. Sınırsız dil

- [x] **G1** Çeviri anahtarları ve bundle API — `030_i18n` (tam içerik yönetimi G1.1 ile)
- [x] **G1.1** Yönetim arayüzü: dil ekleme, çeviri import/export — frontend `/manage/i18n`
- [x] **G1.2** Next.js `app/[locale]`, middleware (`/` → `/tr/...`), `alternates.languages` + `buildLocaleAlternates` (blog örneği); CMS `localized_routes` API ile tam URL eşlemesi ayrı ince ayar

### 2. Sınırsız para birimi + MB kuru

- [x] **G2** TCMB ile `currency_rates` güncelleme — `POST /api/v1/currency/rates/refresh` (zamanlanmış cron/job ayrı)
- [x] **G2.1** Sepet / rezervasyonda kur kilidi — `carts.fx_locked_at` + `fx_snapshot_json` (TRY referans kurları); checkout `price_breakdown_json.fx_lock` (JSON string veya null); `GET /api/v1/carts/:id`; ön yüz checkout’ta özet (G2.1)

### 3. Üyelik sistemi

- [x] **G3.0** Roller (katalog + oturumdaki atamalar): `GET /api/v1/roles`, `GET /api/v1/auth/me` içinde `roles[]` + **`permissions[]`** (etkin izin kodları) — `020_identity_membership` + **`189_identity_permissions_matrix`** (RBAC panelleri **G3.4–G3.5**)
- [x] **G3.1** Müşteri: `POST` kayıt/giriş, `GET/PATCH /api/v1/auth/me`, `GET /api/v1/reservations/mine` (user_id veya misafir e-posta); checkout `reservations.user_id` ← sepet `user_id`; frontend `/login`, `/signup`, `/account` (token `localStorage`, profil + rezervasyon listesi)
- [ ] **G3.2** Acente: API anahtarları + rezervasyon listesi + **`GET …/sales-summary`** + **`GET …/commission-accruals`** + **`GET …/persisted-commission-accruals`** + **`GET …/invoices`** (liste + `created_at`) + **`GET …/invoices/:id`** (başlık + satır kalemleri) + **`POST …/invoices/preview`** + **`POST …/invoices`** (iç komisyon faturası; `190_agency_invoices`, önek `AGC-`) + **`GET …/browse-listings`**; `GET /agent/*` aynı özet; checkout `agency_organization_id`; `/manage/agency` + **`/manage/agency/sales`** — *eksik:* **e-fatura / e-arşiv** (GİB vb.) dış entegrasyonu
- [ ] **G3.3** Tedarikçi: ilan bazlı komisyon, öne çıkarma katmanları (reklam / kategori / anasayfa) için **oran kuralları** ve faturalama — *kısmi (2026-04):* `GET /api/v1/supplier/me|listings|agency-commissions|promotion-fee-rules|commission-accruals|persisted-commission-accruals` + **`GET …/invoices`** (liste + `created_at`) + **`GET …/invoices/:id`** + **`POST …/invoices/preview`** + **`POST …/invoices`** (iç komisyon faturası; `191_supplier_invoices`, önek `SPR-`) + `188_commission_accrual_lines.sql` + frontend `/manage/supplier` — *eksik:* ilan düzenleme UI, **e-fatura / e-arşiv** dış entegrasyonu
- [ ] **G3.4** Personel, **G3.5** Yönetici: yetki matrisi (RBAC), denetim günlüğü — *kısmi (2026-04):* **`GET /api/v1/staff/me|reservations`** (izin: `staff.*`) + `/manage/staff`; `audit_log` + `admin/*` (izin: `admin.users.read`, `admin.roles.read`, …) + **`GET/POST /api/v1/admin/permissions`**, **`GET/POST /api/v1/admin/role-permissions`** (matris) + `/manage/admin` — *UI’da matris ekranı isteğe bağlı*

#### G3.x — RBAC izin rehberi (özet)

- **İzin kodları**:
  - `admin.users.read`, `admin.roles.read`, `admin.users.write_roles`, `admin.audit.read`, `admin.permissions.read`, `admin.permissions.write`
  - `staff.profile.read`, `staff.reservations.read`
  - `agency.portal`, `supplier.portal`
- **Varsayılan atamalar**:
  - `admin` → tüm `admin.*`
  - `staff` → `staff.profile.read`, `staff.reservations.read`
  - `agency` → `agency.portal`
  - `supplier` → `supplier.portal`
- **Komisyon faturaları (`commission_accrual_lines`):** Acente ve tedarikçi faturaları ayrı kolonlarla bağlanır (`agency_invoice_id`, `supplier_invoice_id`). Aynı tahakkuk satırı her iki tarafta da ayrı faturalanabilir; tek tarafta kilitleme istenirse uygulama kuralı veya DB kısıtı ayrıca tanımlanmalıdır.
- **Önerilen paketler (frontend `admin-permission-presets.ts`)**:
  - `super_admin`: tüm `admin.*`
  - `rbac_admin`: yalnız izin katalogu + matris (`admin.permissions.*`)
  - `support_admin`: kullanıcı/rol okuma + audit (`admin.users.read`, `admin.roles.read`, `admin.audit.read`)

### 4. Sanal POS (PayTR + Paratika)

- [x] **G4.1** PayTR iFrame token + Bildirim URL (hash, ödeme kaydı, rezervasyon onayı) — *backend*
- [x] **G4.2** Paratika: session token + RETURNURL + bildirim — *backend* (`paratika_http`, `paratika_notify`)
- [x] **G4.3** “Aktif gateway” — `POST /api/v1/payments/active-provider` + frontend `/manage/general-settings`

### 5. Sosyal medya paylaşımı

- [ ] **G5.1–G5.4** Şablonlar, “yayınla” işareti, AI ile metin — `085_social` + `170_ai`

### 6. Medya: AVIF, editör, sıralama

- [ ] **G6** Pipeline: yükleme → dönüştürme → CDN anahtarı — `090_media_cdn`
- [ ] **G6.1** Fotoğraf editörü (kırpma/filtre) — frontend bileşeni + kayıt
- [ ] **G6.2** Sürükle-bırak ve alfabetik sıra — `listing_images` veya medya tablosu

### 7. SEO

- [ ] **G7.1–G7.5** Sayfa/kategori/ürün SEO alanları, schema, sitemap, Analytics, AI meta — `080_content_seo` + `170_ai`
- [ ] **G7.x** Rich snippets, breadcrumb, Merchant — entegrasyon modülleri

### 8. Sayfa / kategori sihirbazı ve filtreli özel sayfalar

- [ ] **G8** CMS blokları + “filtre ile liste” sayfa tipi (ör. Fethiye + lüks villa)

### 9. SMS ve e-posta tetikleyicileri

- [ ] **G9** Olay bazlı şablonlar: kayıt, sepet, rezervasyon — `100_messaging` + NetGSM
- [ ] **G9.1** NetGSM modülü üretim sertleştirmesi (şablon, throttle)

### 10–14. Harita, header/footer, popup, anasayfa sırası, iCal offset

- [x] **G10** Google Maps — API anahtarı + varsayılan merkez/zoom (`site_settings.maps`, frontend `/manage/general-settings`)
- [x] **G11** Header/footer — `site_settings.ui` (`header_html` / `footer_html`) aynı sayfada; görsel sürükle-bırak builder yok
- [ ] **G12** Popup kampanya / çerez — `130` + KVKK metni
- [ ] **G13** Anasayfa blok sırası — `130`
- [ ] **G14** iCal senkron + gün offset — `110_locations_ical`

### 15–21. Bölge, kupon, cüzdan, yorum, menü, karşılaştırma, favoriler

- [ ] **G15** Bölge URL ve liste — `/location/bodrum` benzeri
- [ ] **G16** Kupon motoru — `070_marketing`
- [ ] **G17** Cüzdan — `060_booking_commerce` + UI
- [ ] **G18** Yorum yaşam döngüsü + IP engeli — `120`
- [ ] **G19** Mega menü — `130`
- [ ] **G20** Ürün karşılaştırma — `140_engagement`
- [ ] **G21** Favoriler — `140_engagement`

### 22. Canlı destek, WhatsApp, AI chatbot

- [ ] **G22** Chat oturumu + AI — `150` + `170_ai` + ticket köprüsü
- [ ] **G22.1** Takip e-postası / SMS ve 3 gün sonra öneri — `100` + zamanlanmış job

### 23–25. Arama, son gezilenler, ilişkili ürünler

- [ ] **G23** Gelişmiş filtre + esnek tarih + fiyat gösterimi (villa/yat)
- [ ] **G24** Son gezilenler — `140`
- [ ] **G25** İlişkili / yakın / benzer — öneri motoru

### 26–28. Kampanyalar, çapraz satış, sesli arama

- [ ] **G26** Kampanya tipleri (erken rezervasyon, özel gün, doğum günü, son dakika, dönem)
- [ ] **G27** Konaklama sepetinde bölgesel aktivite indirimi
- [ ] **G28** Sesli arama — NLP + `140` önbellek

### 29–31. PDF teklif, Instagram Shop/Story

- [ ] **G29** PDF oluşturma ve WhatsApp/e-posta
- [ ] **G30–G31** Instagram Graph — `085_social` + Meta uygulama ayarları

### 32–36. 404, 301, çok dilli URL, rich snippets, breadcrumb

- [ ] **G32–G36** — `080_content_seo` ve yönlendirme tabloları

### 37–41. Merchant, WhatsApp sipariş, paket tatil, reklam alanları, AI modülü

- [ ] **G37** Google Merchant feed
- [ ] **G38** WhatsApp sipariş akışı
- [ ] **G39** Paket tatil ürün tipi — `070` + `050`
- [ ] **G40** Banner slotları — tema + CMS
- [ ] **G41** DeepSeek ve alt paneller; bölge/içerik/SEO çeviri; harita mesafeleri; post-booking concierge; gezi blog serisi — `170_ai` + `110`

### 42–44. Bunny, Cloudflare, çok format görüntü, ilan komisyon/ön ödeme

- [ ] **G42** Bunny + Cloudflare modül bağları — `090`
- [ ] **G43** HEIC vb. → AVIF pipeline
- [ ] **G44** İlan formu: komisyon + ön ödeme — `050` + doğrulama

---

## Kategori dikeyleri (Tatil evi → Plaj şezlong)

Her dikey için ortak kalıp:

1. Şema uzantısı (`180_verticals` veya `190_*` yeni modül)
2. Admin CRUD
3. Ön yüz liste + detay
4. Rezervasyon + ödeme entegrasyonu
5. API (acenta) gerekiyorsa

| # | Dikey | Öncelik notu |
|---|--------|----------------|
| 1 | Tatil evi | Havuz, min konaklama, temizlik, iCal — `listing_*` |
| 2 | Yat | Tekne alanları — `180` / yeni tablo |
| 3 | Araç kiralama | Yolcu360 API — `160` |
| 4 | Transfer | Güzergah ve araç fiyat — `050` |
| 5 | Feribot | Sefer modeli |
| 6 | Otel | Oda, müsaitlik — büyük iş paketi |
| 7 | Uçak | Turna API — `160` |
| 8 | Tur | Wtatil + manuel — `180` |
| 9 | Aktivite | Seans |
| 10 | Gemi turu | |
| 11 | Vize | |
| 12 | Sinema bileti | |
| 13 | Plaj şezlong | |

---

## Paneller (Blog, Üye, Acente, Yönetim, Tedarikçi, Uygulama)

- [ ] **P-Üye** — G3.1 + Favoriler + Cüzdan + Sepet hatırlatma
- [ ] **P-Acente** — G3.2 + belge onayı + kategori yetkisi
- [ ] **P-Tedarikçi** — G3.3 + ilan yönetimi + komisyon raporu
- [ ] **P-Yönetim** — tüm modüller + kullanıcı/rol
- [ ] **P-App** — mobil için API stabilizasyonu (versiyonlama)

---

## İş gereksinimleri (PDF sonundaki bölümler)

### Sorunsuz rezervasyon ve ödeme

- [ ] Şeffaf fiyat kırılımı (vergi/harç satırları) — checkout API
- [ ] Taksit / havale / cüzdan — ödeme sağlayıcıları
- [ ] Misafir checkout — zorunlu üyelik yok

### Güven ve sosyal kanıt

- [ ] Harici yorum içe aktarma (opsiyonel) — `120`
- [ ] TÜRSAB alanı — footer ayarı
- [ ] İptal/iade sayfası ve bağlantıları

### İçerik ve SEO (E-E-A-T)

- [ ] Blog/rehber şablonları — `080`
- [ ] AI + editör onayı — süreç tanımı

### Destek

- [ ] SSS, canlı destek, ticket — `152`

### Pazarlama

- [ ] Newsletter — `100` / `070`
- [ ] Çapraz satış kuralları — sepet + `070`

---

## AI / SEO / Sosyal ekleri (özet checklist)

- [ ] NLP semantik arama — vektör DB veya harici servis
- [ ] Seyahat planlayıcı (rota) — `170`
- [ ] Gelişmiş chatbot — `150` + `170`
- [ ] Yorum özeti — `170` + `120`
- [ ] Dinamik fiyat tahmini — analitik + `170`
- [ ] İleri çapraz satış — `070` + davranış verisi

---

## Önerilen uygulama sırası (kısa)

1. **Kimlik + roller + temel paneller** (satış ve operasyon için şart)
2. **Katalog + bir dikey (ör. tatil evi) uçtan uca**
3. **Ödeme (PayTR tamam; Paratika) + faturalama**
4. **Kampanya + kupon + cüzdan**
5. **SEO + sitemap + schema**
6. **Mesajlaşma tetikleyicileri**
7. **AI özellikleri** (içerik → destek → kişiselleştirme)
8. **Entegrasyonlar** (Wtatil, Turna, Yolcu360, Instagram…)

---

## Versiyon notu

Bu dosya **v2** kapsamının tam listesidir; tamamlanma, sprint planlaması ve öncelik için kullanılmalıdır. Tek commit’te hepsi kodlanamaz; her faz için ayrı PR ve test önerilir.

**Son güncelleme:** 2026-04-03
