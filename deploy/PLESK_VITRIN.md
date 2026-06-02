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

Repoda **`.github/workflows/frontend-ci.yml`** var: **`ubuntu-latest`** + Node 24 ile `frontend` içinde **`npm ci`** ve **`npm run build`** çalışır. Push sonrası Actions yeşilse kod tarafı üretime uygun derleniyor demektir; sunucuda yalnızca eski **GLIBC / ortam** sorunu kalabilir — o zaman OS yükseltmesi veya `plesk-vitrin-deploy.sh` ile eşleştirilmiş disk/cache kontrolü gerekir.

## Build `spawn ENOMEM` (bellek yetersiz)

Derleme “Compiled successfully” sonrası `Error: spawn ENOMEM` ise sunucu RAM’i yetmiyor (çoğu VPS 2–4 GB).

**1) Swap (önerilen, kalıcı):**

```bash
fallocate -l 4G /swapfile && chmod 600 /swapfile && mkswap /swapfile && swapon /swapfile
grep -q '^/swapfile' /etc/fstab || echo '/swapfile none swap sw 0 0' >> /etc/fstab
free -h
```

**2) Daha düşük Node heap ile build:**

```bash
cd /var/www/vhosts/rezervasyonyap.tr/httpdocs/frontend
set -a && source /etc/rezervasyonyap/frontend.env && set +a
export NEXT_NODE_HEAP_MB=3072
rm -rf .next node_modules && npm ci && npm run build
systemctl restart travel-web.service
```

**3) Script izinleri:** `chmod +x deploy/*.sh` veya `bash deploy/apply-sql.sh ...` ( `./` yerine).

## Ayrıca bkz.

- [DEPLOY_CHECKLIST.md](./DEPLOY_CHECKLIST.md) — tam checklist, env, smoke test.
- [systemd/travel-web.service](./systemd/travel-web.service) — `WorkingDirectory` = `.../httpdocs/frontend`
