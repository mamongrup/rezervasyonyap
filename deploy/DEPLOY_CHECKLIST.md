# Production Deploy Checklist (Plesk + systemd)

Üretim vitrin domain: **`rezervasyonyap.tr`** — ayrıntı ve sunucu yolu: [`deploy/DOMAIN.md`](./DOMAIN.md).

Bu liste, `travel-web.service` (Next.js) ve `travel-api.service` (Gleam API) ile calisan sunucuda "menu/admin kayboldu" tipindeki hatalari onlemek icindir.

## 1) Dogru dizine gir

`travel-web.service` icindeki `WorkingDirectory` degeri kullanilmali:

```bash
systemctl cat travel-web.service
cd <WorkingDirectory>
pwd
ls -la package.json
```

`package.json` yoksa yanlis dizindesiniz.

## 2) Web servis ortam degiskenlerini dogrula

`travel-web.service` icinde en az su degiskenler olmali:

- `NEXT_PUBLIC_API_URL=http://127.0.0.1:8080`
- `INTERNAL_API_ORIGIN=http://127.0.0.1:8080`
- `INTERNAL_MIDDLEWARE_REWRITE_ORIGIN=http://127.0.0.1:3000`
- `NODE_ENV=production`

Kontrol:

```bash
systemctl show travel-web.service -p Environment
```

Guncellemek icin:

```bash
sudo systemctl edit travel-web.service
```

Ornek override:

```ini
[Service]
Environment=NEXT_PUBLIC_API_URL=http://127.0.0.1:8080
Environment=INTERNAL_API_ORIGIN=http://127.0.0.1:8080
Environment=INTERNAL_MIDDLEWARE_REWRITE_ORIGIN=http://127.0.0.1:3000
```

Opsiyonel (kuruma bagli `hero_search` okunacaksa):

- `NEXT_PUBLIC_NAVIGATION_ORGANIZATION_ID=<organization_uuid>`

Repo icindeki ornek dosyalar:

- `deploy/systemd/travel-web.service`
- `deploy/systemd/frontend.env.example`

## 3) Plesk vitrin (yalniz Next.js, tek SSH komutu)

Tam akış: **[`deploy/PLESK_VITRIN.md`](./PLESK_VITRIN.md)** — `plesk-vitrin-deploy.sh` sunucuyu `origin/main` ile sıfırlayıp `npm ci` + build + `travel-web` restart yapar (`package-lock` çakışması yaşamazsınız).

## 4) Monorepo: tek komut deploy (backend + frontend)

Repo kokunde:

```bash
chmod +x deploy/deploy.sh deploy/verify.sh
./deploy/deploy.sh
```

Notlar:

- Varsayılan `DEPLOY_REF` **main**. Eski sabit nokta için: `DEPLOY_REF=stable/b92d735 ./deploy/deploy.sh`.
- Script otomatik olarak:
  - hedef ref'e hard sync yapar,
  - lokal kirli dosyalari temizler (`git clean -fd`),
  - backend/frontend build alir,
  - service restart + verify yapar.

## 5) Manuel akış (ihtiyaç halinde)

`NEXT_PUBLIC_*` degiskenleri build-time gomulur. Env degistiyse **yeniden build zorunlu**.

Sunucuda **`frontend/package-lock.json` elle degisti ise** `git pull` reddeder. Guvenli yol: [`PLESK_VITRIN.md`](./PLESK_VITRIN.md) scripti veya:

```bash
cd /var/www/vhosts/rezervasyonyap.tr/httpdocs
git fetch origin
git checkout main && git reset --hard origin/main
cd frontend && rm -rf node_modules .next && npm ci && npm run build
```

## 6) Servisleri restart et

```bash
sudo systemctl daemon-reload
sudo systemctl restart travel-web.service
sudo systemctl restart travel-api.service
sudo systemctl status travel-web.service
sudo systemctl status travel-api.service
```

## 7) Hizli smoke test

```bash
curl -i http://127.0.0.1:8080/api/v1/auth/me
curl -i http://127.0.0.1:3000/api/hero-tabs
```

Beklenen:

- `auth/me`: token yoksa `401 {"error":"missing_token"}` normal.
- `hero-tabs`: `200` + JSON (`items`) donmeli.

Alternatif: tek komut dogrulama scripti

```bash
chmod +x deploy/verify.sh
./deploy/verify.sh
```

## 8) Tarayici kontrolu

- Hard refresh: `Ctrl + Shift + R`
- Ana sayfada hero kategori ikonlari gorunmeli.
- `/manage/admin/content/navigation` sayfasi sonsuz "Yukleniyor..."da kalmamali.
