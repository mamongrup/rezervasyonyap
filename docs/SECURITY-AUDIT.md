# Güvenlik denetimi (9 kontrol)

Projede statik güvenlik kontrol listesi:

```bash
node scripts/security-audit.mjs
# veya
cd frontend && npm run security:audit
```

Çıkış kodu: `0` = tüm kontroller geçti, `1` = en az bir madde kaldı.

## Next.js 16 — yalnızca `proxy.ts`

| Eski (≤15) | Bu proje (16) |
|------------|----------------|
| `src/middleware.ts` + `export function middleware` | **`src/proxy.ts`** + `export function proxy` |

**Önemli:** `middleware.ts` ve `proxy.ts` **aynı anda olamaz** — build şu hatayı verir:

> Both middleware file and proxy file are detected. Please use proxy.ts only.

Güvenlik (CORS, rate limit, Host, korumalı rotalar) tamamen `proxy.ts` + `http-security.ts` içindedir.

## Kontrol listesi

| # | Ne aranır |
|---|-----------|
| 1 | `.gitignore` → `.env` |
| 2 | `frontend/src/lib/security.ts` → `validatePassword`, `sanitizeFilename`, `getErrorMessage`, `verifyAdminToken`, `isAllowedRevalidatePath` |
| 3 | `proxy.ts` + `http-security.ts`; `middleware.ts` yok veya yalnızca `@/proxy` köprüsü |
| 4 | `next.config.mjs` → `remotePatterns`, `hostname: '*'` yok |
| 5 | `api/ai-translate` → `admin.users.read` veya `verifyAdminToken` |
| 6 | Backend `catalog/public/listings` → `status = 'published'` |
| 7 | `isAllowedRevalidatePath` whitelist |
| 8 | `api/auth/register` → `validatePassword` |
| 9 | `frontend` → `npm audit --audit-level=moderate` (0 moderate+) |

## İlgili dosyalar

- `frontend/src/lib/security.ts` — şifre, dosya adı, JWT, revalidate whitelist
- `frontend/src/lib/api-require-admin.ts` — yönetim API JWT + `admin.users.read` / izin
- `frontend/src/lib/http-security.ts` — CORS + response başlıkları
- `frontend/src/proxy.ts` — edge giriş, rate limit, korumalı yollar
- `frontend/security-headers.mjs` — CSP / HSTS (`next.config.mjs` ile)
- `backend/src/backend/router.gleam` — API CORS (`CORS_ALLOWED_ORIGINS`)

## Üretim env (özet)

| Dosya | Değişken | Öneri |
|-------|----------|--------|
| `frontend.env` | `ALLOWED_HOSTS` | `rezervasyonyap.tr,www.rezervasyonyap.tr,...` |
| `frontend.env` | `CSP_MODE` | `enforce` (önce `report-only` ile test) |
| `backend.env` | `CORS_ALLOWED_ORIGINS` | `https://rezervasyonyap.tr,https://www.rezervasyonyap.tr` |
