# Runtime sürümleri (hedef)

Repoda sabitlenen **hedef** sürümler. Üretim sunucusunda ve Laragon’da bu sürümlerle hizalanın.

| Bileşen | Hedef sürüm | Not |
|--------|-------------|-----|
| **Node.js** | **25.x** (≥ 25.0.0) | `.nvmrc`, `frontend/package.json` engines, CI |
| **PostgreSQL** | **18.4** | Laragon / Plesk; şema `pgcrypto` dışında özel sürüm bağımlılığı yok |
| **Gleam** | **≥ 1.16.0** | `backend/gleam.toml`; deploy’da `gleam build` + `export erlang-shipment` |
| **Erlang/OTP** | **29.0.x** | Gleam shipment export; CI ile uyumlu |

Doğrulama:

```bash
node -v          # v25.x
psql --version   # 18.4
gleam --version  # 1.16.x
erl -eval 'erlang:display(erlang:system_info(otp_release)), halt().' -noshell  # 29
```

---

## Sunucu (Windows → SSH)

Plesk SSH kullanıcısı ile (root değilse `-User` değiştirin):

```powershell
cd C:\laragon\www\travel
.\scripts\upgrade-server-runtime.ps1 -Server 50.114.185.100 -User root
```

Sadece runtime, deploy yok: `-Rebuild 0`

Manuel (Plesk Web SSH — **root**, tek blok yapıştırın):

```bash
cd /var/www/vhosts/rezervasyonyap.tr/httpdocs
git pull
chmod +x deploy/scripts/upgrade-runtime.sh deploy/deploy.sh deploy/verify.sh
APP_ROOT=$PWD UPGRADE_PG=0 ./deploy/scripts/upgrade-runtime.sh
```

> **PostgreSQL:** Plesk sunucuda `UPGRADE_PG=0` kullanın; PG sürümünü **Plesk → Araçlar ve Ayarlar → Güncellemeler** veya PostgreSQL eklentisinden yükseltin. Uygulama şema olarak PG 14+ ile uyumludur; 18.4 hedef minor yükseltmedir.

Runtime + deploy bittikten sonra (isteğe bağlı tur dönem denetimi):

```bash
cd /var/www/vhosts/rezervasyonyap.tr/httpdocs
set -a && source /etc/rezervasyonyap/wtatil.env && source /etc/rezervasyonyap/backend.env && set +a
node scripts/audit-wtatil-tour-periods.mjs --tour-id 10011 --apply
```

---

## Laragon (Windows)

```powershell
cd C:\laragon\www\travel
.\scripts\upgrade-laragon-runtime.ps1
```

Laragon menüsünden **Node v25** ve **PostgreSQL 18.4** aktif sürümü seçin.

---

**Laragon:** Node 25 kurulumu → Laragon menüsünden aktif sürümü seçin.

**Linux (NodeSource):**

Plesk sunucuları çoğunlukla **RHEL/Alma** — `deb` scripti çalışmaz; **rpm** kullanın:

```bash
curl -fsSL https://rpm.nodesource.com/setup_25.x | bash -
dnf install -y nodejs   # veya: yum install -y nodejs
/usr/bin/node -v
which -a node
```

Eski manuel kurulum varsa `/usr/local/bin/node` (v22) PATH'te `/usr/bin/node` (v25) önüne geçer:

```bash
/usr/bin/node -v          # v25.x ise kurulum tamam
/usr/local/bin/node -v    # v22 ise gölgeleme var
mv /usr/local/bin/node /usr/local/bin/node.bak-v22
ln -sf /usr/bin/node /usr/local/bin/node
node -v
```

`upgrade-runtime.sh` bunu otomatik dener (`fix_node_path_shadowing`).

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
