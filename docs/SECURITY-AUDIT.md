# Güvenlik denetimi (8 kontrol)

Projede statik güvenlik kontrol listesi:

```bash
node scripts/security-audit.mjs
# veya
cd frontend && npm run security:audit
```

Çıkış kodu: `0` = tüm kontroller geçti, `1` = en az bir madde kaldı.

## Next.js 16 — middleware ≠ eksik

| Eski (≤15) | Bu proje (16) |
|------------|----------------|
| `src/middleware.ts` + `export function middleware` | **`src/proxy.ts`** + `export function proxy` |
| — | `src/middleware.ts` → `proxy` köprüsü (araç uyumu) |

Denetim **3. madde** hem `middleware.ts` köprüsünü hem `proxy.ts` içindeki CORS, güvenlik başlıkları, Host, rate limit ve korumalı rotaları arar. Yalnızca kök dizinde `middleware.ts` arayan eski kontrol listeleri **yanlış negatif** verir.

## Kontrol listesi

| # | Ne aranır |
|---|-----------|
| 1 | `.gitignore` → `.env` |
| 2 | `frontend/src/lib/security.ts` → `validatePassword`, `sanitizeFilename`, `getErrorMessage`, `verifyAdminToken`, `isAllowedRevalidatePath` |
| 3 | `proxy.ts` + `http-security.ts` (CORS, başlıklar, Host, rate limit, `/api/manage` koruması) |
| 4 | `next.config.mjs` → `remotePatterns`, `hostname: '*'` yok |
| 5 | `api/ai-translate` → `admin.users.read` veya `verifyAdminToken` |
| 6 | Backend `catalog/public/listings` → `status = 'published'` |
| 7 | `isAllowedRevalidatePath` whitelist |
| 8 | `api/auth/register` → `validatePassword` |

## İlgili dosyalar

- `frontend/src/lib/security.ts` — şifre, dosya adı, JWT, revalidate whitelist
- `frontend/src/lib/http-security.ts` — CORS + response başlıkları
- `frontend/src/proxy.ts` — edge giriş, rate limit, korumalı yollar
- `frontend/security-headers.mjs` — CSP / HSTS (`next.config.mjs` ile)
