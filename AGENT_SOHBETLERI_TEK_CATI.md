# Agent oturumları — tek çatı özet (travel)

Bu dosya, bu repoda yapılan veya tartışılan işleri **sonraki agent / geliştirici** için tek yerde toplar. Ayrıntılı katalog/sözleşme commit özeti için bkz. **`HANDOFF_BU_ASAMA.md`**.

---

## 1. Repo yapısı

| Konum | Rol |
|--------|-----|
| `travel/` | Monorepo kökü; `package.json` + **npm workspaces** (`frontend`) |
| `travel/frontend/` | Next.js 16 uygulaması (`chisfis-template`), asıl `node_modules` burada |
| `travel/backend/` | Gleam API |

**Önemli:** IDE veya Next bazen çözümlemeyi `C:\laragon\www\travel` kökünden yapar. Kökte `npm install` (workspaces + kök `devDependencies` içinde `tailwindcss`, `@tailwindcss/postcss`) ve/veya `frontend/next.config.mjs` içindeki `turbopack.root` / `resolveAlias` ayarları bu yüzden eklendi.

---

## 2. Backend (Gleam + SQL) — kısa

- Sözleşme kapsamları (genel / satış / kategori), checkout bundle, katalog HTTP, booking snapshot, staff POS alanları.
- SQL sırası: `install_order.txt`; `204` → `205` → `206` vb. (detay: `HANDOFF_BU_ASAMA.md`).

---

## 3. Frontend — katalog / yönetim

- Kategori sidebar: alt linkler (özet, ilanlar, yeni, öznitelikler), `CatalogSidebar.tsx` içinde **a11y**: `aria-controls`, `hidden` + alt liste `id`, `aria-current="page"`.
- Kategori kod doğrulama: `parseCatalogCategoryCodeParam` / `CATALOG_CATEGORY_CODE_RE` (`catalog-category-ui.ts`); `[code]` alt sayfalarında geçersiz kod → `notFound()`.
- `middleware.ts` → **`src/proxy.ts`** (Next.js 16: `export function proxy`).
- Çeviri / sözleşme / checkout UI parçaları: önceki handoff’taki dosya listesine bakın.

---

## 4. Tailwind / PostCSS / derleme sorunları (özet)

**Görülen hatalar:** `Can't resolve 'tailwindcss' in '...\travel'`, veya göreli `../../node_modules/tailwindcss/index.css` yolunun bulunamaması (özellikle `tailwindcss` devDependency eksik veya hoisting farklıysa).

**Projede yapılan / korunması gerekenler:**

- `frontend/postcss.config.mjs`: `@tailwindcss/postcss` için **`base: __dirname`** (frontend kökü).
- `frontend/next.config.mjs`: `turbopack.root`, gerekirse `resolveAlias`, webpack `resolve.modules` / `alias`.
- `frontend/src/styles/tailwind.css`: Tailwind v4 sözdizimi (`@import "tailwindcss"`, `@plugin`, …); göreli `node_modules` yolları **kırılgandır** — paket sürümü/kurulum doğruysa paket adıyla import tercih edilir.
- Kök `package.json`: `workspaces` + kök `devDependencies` (`tailwindcss`, `@tailwindcss/postcss`) — üst dizinden modül arayan araçlar için.
- `frontend/scripts/next-with-heap.mjs`: `next` binary’sini `require.resolve` ile bulur; **8GB heap** ile çalıştırır (büyük derleme için).

---

## 5. `npm run dev` / takılma / localhost

- Uzun süre **`Compiling /[locale]`**: `frontend/src/lib/i18n-server.ts` içinde API `fetch` için **`AbortSignal.timeout(8000)`** — backend kapalıyken sonsuz bekleme yok, fallback locale listesi.
- Varsayılan dev: **`--webpack`** (Turbopack bazen Windows’ta uzun süre derlemede kalıyor); hızlı deneme: `npm run dev:turbo`.
- `ERR_CONNECTION_REFUSED`: süreç gerçekten dinliyor mu, port 3000, güvenlik duvarı; derleme 500 veriyorsa önce CSS/TS hatasını gider.

---

## 6. Güvenlik (npm audit)

- `npm audit` / `npm audit fix` ile uyarılar giderildi; **0 vulnerability** hedeflendi. Kilit dosya: `package-lock.json` (commit’e dahil).

---

## 7. VS Code / terminal

- `travel/.vscode/settings.json`: workspace kökü `travel` iken yeni terminalin varsayılanı `frontend` (isteğe bağlı).
- Komutlar: kökten `npm run dev` veya `cd frontend` → `npm run dev`.

---

## 8. Sonraki adımlar (ürün)

- Öznitelikler: şu an rehber sayfası; ilan bazlı form + API (isteğe bağlı).
- Hub “yakında” metinleri (filtre, sihirbaz) genişletilebilir.

---

## 9. Bu dosyayı kim güncellemeli?

Yeni bir agent oturumu önemli bir mimari veya komut değişikliği yaptığında **bu dosyaya kısa madde** ekleyin; tekrarlayan uzun sohbetleri buraya taşıyın, `HANDOFF_BU_ASAMA.md` ise sadece o commit/dönem özeti için kalabilir.

---

## 10. Nisan 2026 — yedekten senkron + kritik düzeltmeler (özet)

Bu bölüm, `travel - Kopya` yedeğindeki agent özetleri ana repoya alındıktan sonra eklenen **teknik borç / bug** notlarıdır.

| Konu | Dosya / yer | Not |
|------|-------------|-----|
| **Site ayarları kaydı `upsert_failed`** | `backend/src/travel/site/site_settings_http.gleam` | Platform geneli (`organization_id` NULL) satırlar için `ON CONFLICT (organization_id, key)` PostgreSQL’de partial unique index ile uyumsuzdu. **Çözüm:** NULL için ayrı sorgu: `ON CONFLICT (key) WHERE organization_id IS NULL`. |
| **Admin hash anchor’lar** | `frontend/.../manage/admin/AdminManageClient.tsx` | `#admin-seo-block`, `#admin-access-block` vb. **sayfa:** `/manage/admin/manage` (dashboard `/manage/admin` değil). `manageAdminHref` ve araçlar kartları buna göre; eksik `id="admin-*-block"` div’leri eklendi. |
| **Denetim günlüğü URL** | `frontend/.../manage/audit-log/page.tsx` | Gerçek audit tablosu `admin/manage` içinde; rota **sunucu yönlendirmesi** ile oraya. |
| **Çift analitik ayar** | `admin/analytics` | GA/GTM zaten **Ayarlar → Google** sekmesinde; sayfa yönlendirme + menü tekrarı kaldırıldı. |

**Cursor agent transcript’leri** proje kökünde değil; Cursor’un workspace storage’ında (`…/agent-transcripts/*.jsonl`). Sohbet yedeği bu repoda yoksa yalnızca bu `.md` dosyaları kalıcı referanstır.
