# Plesk vitrin tek komut deploy

Üretim domain: **`rezervasyonyap.tr`** — tam yol özeti: [`DOMAIN.md`](./DOMAIN.md).

Bu akış, sunucuda **`package-lock.json` elle bozulması**, **`git pull` reddi** ve **yanlış dizinde build** gibi durumlara düşmemek içindir.

## Tek komut (önerilen)

Repo kökünde (`httpdocs`, içinde `frontend/` ve `deploy/` var):

```bash
cd /var/www/vhosts/rezervasyonyap.tr/httpdocs
chmod +x deploy/plesk-vitrin-deploy.sh
sudo ./deploy/plesk-vitrin-deploy.sh
```

Script:

- `git reset --hard origin/main` ile repoyu GitHub **main** ile birebir eşitler (sunucudaki **kaydedilmemiş** / **yanlış** değişiklikleri siler).
- `frontend` içinde `node_modules` + `.next` siler, **`npm ci`** + **`npm run build`** çalıştırır.
- **`travel-web.service`** yeniden başlatır.
- Eski **GLIBC** varsa uyarı basar (Next.js SWC ikilileri 2.29+ ister); kalıcı çözüm OS yükseltme veya Docker/CI.

Yol farklıysa:

```bash
sudo REPO_ROOT=/var/www/vhosts/ALANADINIZ.tr/httpdocs ./deploy/plesk-vitrin-deploy.sh
```

## Sunucuda asla yapmayın

- `npm install` ile `package-lock.json`’u sunucuda “güncellemek” (lock, repodakiyle ayrışır; `git pull` şaşar).
- `httpdocs` içine repodan bağımsız dosya koyup commit dışı bırakmak (gerekirse `httpdocs` dışında depolayın veya repoya alın).

## Next.js sürümü

Vitrin **stabil `next@16.2.x`** ile sabitlenir; canary sunucu/os uyumsuzluğunda riski artırır. `frontend/package.json` + `package-lock.json` birlikte commitlenir; sunucu her zaman **`npm ci`** kullanmalı.

## CI (GitHub Actions)

Repoda **`.github/workflows/frontend-ci.yml`** var: **`ubuntu-latest`** + Node 20 ile `frontend` içinde **`npm ci`** ve **`npm run build`** çalışır. Push sonrası Actions yeşilse kod tarafı üretime uygun derleniyor demektir; sunucuda yalnızca eski **GLIBC / ortam** sorunu kalabilir — o zaman OS yükseltmesi veya `plesk-vitrin-deploy.sh` ile eşleştirilmiş disk/cache kontrolü gerekir.

## Ayrıca bkz.

- [DEPLOY_CHECKLIST.md](./DEPLOY_CHECKLIST.md) — tam checklist, env, smoke test.
- [systemd/travel-web.service](./systemd/travel-web.service) — `WorkingDirectory` = `.../httpdocs/frontend`
