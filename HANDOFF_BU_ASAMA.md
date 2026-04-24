# Oturum kaydı — 5 Nisan 2026

**Tüm agent / geliştirici özetleri (tek çatı):** bkz. `AGENT_SOHBETLERI_TEK_CATI.md`.

---

## Son oturum — PageSpeed / deploy (24 Nisan 2026)

Bir sonraki açılışta özet: hedef mobil PSI (Performans, Erişilebilirlik, En iyi uygulamalar, SEO). **Tam komut listesi ve teşhis:** `README.md` → bölüm **«Üretim deploy (rezervasyonyap.tr)»**.

### Üretimde sabit döngü (PM2 yok)

```bash
cd /var/www/vhosts/rezervasyonyap.tr/httpdocs
git pull origin main
cd frontend && rm -rf .next && npm run build
systemctl restart travel-web
```

### Bu repoda yapılan önemli değişiklikler

| Konu | Dosya / not |
|------|----------------|
| Headless UI PSI: `aria-hidden` + odaklanabilir sentinel | `frontend/src/lib/headlessui-hidden-focusable-a11y.js` + `next.config.mjs` (`NormalModuleReplacementPlugin` + `headlessui-internal/render` alias) |
| Widget’lar ayrı chunk (kullanılmayan JS) | `frontend/src/components/DeferredChromeWidgets.tsx`, `application-layout.tsx` içinde kullanım |
| Harici AVIF sıkıştırma (LCP / “resim boyutu”) | `frontend/scripts/resize-external-avifs.mjs` — varsayılanlar: genişlik **720**, kalite **50**, effort **7**, recompress eşiği **6** KB |
| Dokümantasyon | `README.md` (deploy, `curl` ile `/_next/static` kontrolü, isteğe bağlı `CSS_OPTIMIZE=1`, AVIF script) |

### Sunucuda kodla düzelmeyenler

- Konsol: **`500`** on `/_next/static/...` veya CSS/JS **`Content-Type: text/plain`** → **Plesk/Apache proxy / MIME**, Node build değil. README’deki `curl -sI` ile doğrula.
- PSI **100/100/100/100** lab skoru garanti değil; önce MIME/500 sıfır + AVIF script + güncel deploy.

### Commit (yerelde)

```powershell
cd c:\laragon\www\travel
git add -A
git status
git commit -m "perf(psi): deferred chrome widgets, AVIF defaults, handoff"
```

---

PC yeniden başlatmadan önce: bu dosya yapılan işleri özetler. Git bu ortamda PATH’te yoktu; commit için:

```powershell
cd c:\laragon\www\travel
git add -A
git status
git commit -m "feat(catalog): sözleşme kapsamları, checkout bundle, sidebar alt menü, öznitelik rehberi"
```

## Backend (Gleam + SQL)

- `205_contract_scopes_general_sales.sql` — `contract_scope`: general / sales / category; ilan yalnız category FK.
- `206_manage_catalog_nav_i18n.sql` — sidebar + öznitelik sayfası çevirileri; hub notları güncellemesi. **DB’de çalıştırın** (`install_order` son satır).
- `catalog_http.gleam` — liste/oluşturma scope’a göre; `GET .../public/checkout-contracts`.
- `router.gleam` — checkout-contracts route.
- `booking_http.gleam` — genel/satış onayı, snapshot, `complete_checkout_with_snapshot`.
- `staff_http.gleam` — POS checkout yeni alanlar.

## Frontend

- `travel-api.ts` — bundle, sözleşme API’leri, checkout gövdeleri.
- `CheckoutContractAcceptance.tsx` — üçlü sözleşme paketi.
- `AdminCategoryContractsClient.tsx` — Genel / Satış / Kategori sekmeleri.
- `CatalogSidebar.tsx` — kategori alt menüleri (chevron + alt linkler).
- `CatalogCategoryAttributesClient.tsx` + `attributes/page.tsx` — şema rehberi.
- `catalog-category-ui.ts` — `LISTING_CORE_FIELD_LINES`, `CATEGORY_VERTICAL_FIELD_LINES`.
- Checkout / acente / POS — `CheckoutContractAcceptancePayload` ile uyum.

## Sonraki adımlar (isteğe bağlı)

- Dikey alanlar için ilan PATCH + formlar.
- `206` SQL’i üretim DB’ye uygulama.
