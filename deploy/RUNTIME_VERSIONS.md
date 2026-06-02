# Runtime sürümleri (hedef)

Repoda sabitlenen **hedef** sürümler. Üretim sunucusunda ve Laragon’da bu sürümlerle hizalanın.

| Bileşen | Hedef sürüm | Not |
|--------|-------------|-----|
| **Node.js** | **24.x LTS** (≥ 24.14.0) | `.nvmrc`, `frontend/package.json` engines, CI |
| **PostgreSQL** | **18.4** | Laragon / Plesk; şema `pgcrypto` dışında özel sürüm bağımlılığı yok |
| **Gleam** | **≥ 1.16.0** | `backend/gleam.toml`; deploy’da `gleam build` + `export erlang-shipment` |
| **Erlang/OTP** | **29.0.x** | Gleam shipment export; CI ile uyumlu |

Doğrulama:

```bash
node -v          # v24.x
psql --version   # 18.4
gleam --version  # 1.16.x
erl -eval 'erlang:display(erlang:system_info(otp_release)), halt().' -noshell  # 29
```

---

## Sunucu (tek komut)

SSH ile root (veya sudo):

```bash
cd /var/www/vhosts/rezervasyonyap.tr/httpdocs
git pull
chmod +x deploy/scripts/upgrade-runtime.sh
sudo ./deploy/scripts/upgrade-runtime.sh
```

Sadece deploy (runtime zaten güncelse): `./deploy/deploy.sh`

---

## Laragon (Windows)

```powershell
cd C:\laragon\www\travel
.\scripts\upgrade-laragon-runtime.ps1
```

Laragon menüsünden **Node v24** ve **PostgreSQL 18.4** aktif sürümü seçin.

---

**Laragon:** Node 24 LTS kurulumu → Laragon menüsünden aktif sürümü seçin.

**Linux (NodeSource örnek):**

```bash
curl -fsSL https://deb.nodesource.com/setup_24.x | sudo -E bash -
sudo apt-get install -y nodejs
node -v
```

`travel-web.service` `/usr/bin/node` kullanır; yeni sürüm farklı yoldaysa `ExecStart` veya symlink güncelleyin:

```bash
which node
sudo systemctl restart travel-web.service
```

Deploy sonrası: `cd frontend && rm -rf node_modules .next && npm ci && npm run build`

---

## PostgreSQL 18.4

**Laragon:** PostgreSQL 18.4 paketini kurun; script yolları `postgresql-18.4` kullanır.

**Plesk / Linux minor upgrade (örnek Debian/Ubuntu):**

```bash
psql --version
sudo apt update
sudo apt install postgresql-18 postgresql-client-18
sudo systemctl restart postgresql
psql -U postgres -c "SELECT version();"
```

Major upgrade (14/15/16/17 → 18) için resmi [PostgreSQL upgrade](https://www.postgresql.org/docs/current/upgrading.html) (`pg_upgrade` veya dump/restore) gerekir. Bizim migration’lar genelde **dump + restore** ile uyumludur; yine de staging’de deneyin.

Veri yedek:

```bash
pg_dump -Fc -U postgres travel > travel-pre-pg18.dump
```

---

## Gleam 1.16 + OTP 29 (API sunucusu)

```bash
# Gleam (resmi installer / github release)
gleam --version   # 1.16.x

# OTP 29 (ör. kerl, asdf, distro paketi, winget)
erl -eval 'erlang:display(erlang:system_info(otp_release)), halt().' -noshell
```

Deploy dizininde:

```bash
cd /var/www/vhosts/rezervasyonyap.tr/httpdocs
git pull
./deploy/deploy.sh   # gleam build + erlang-shipment + restart travel-api
```

Bağımlılık güncelleme (geliştirme):

```bash
cd backend
gleam deps update
gleam build
gleam test
git add manifest.toml
```

---

## CI

| Workflow | Sürüm |
|----------|--------|
| `.github/workflows/frontend-ci.yml` | Node **24** |
| `.github/workflows/backend-ci.yml` | Gleam **1.16.0**, OTP **29.0.1** |

`backend/.github/workflows/test.yml` yalnızca referans; GitHub Actions kök `.github/workflows/` altındaki dosyaları çalıştırır.
