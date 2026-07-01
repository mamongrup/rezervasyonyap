# Üretim: tam kod deploy + Excalibur tatil evi verisi (1.7.26)

Canlı site **PostgreSQL** kullanır. MariaDB gerekmez.

## PC (agent / geliştirici — yerel)

```powershell
cd C:\laragon\www\travel
.\scripts\full-excalibur-local-sync.ps1 -SkipImport   # MySQL zaten 1.7.26.sql ise
node scripts/export-excalibur-holiday-bundle.mjs --out backups/excalibur-holiday-1.7.26.json.gz
```

Bundle'ı sunucuya yükleyin (WinSCP / Plesk):

- Kaynak: `backups/excalibur-holiday-1.7.26.json.gz` veya `Downloads/excalibur-holiday-1.7.26.json.gz`
- Hedef: `/var/www/vhosts/rezervasyonyap.tr/httpdocs/tmp/excalibur-holiday-1.7.26.json.gz`

## Sunucu — 1) Kod (tüm main commit'leri: API + frontend)

```bash
cd /var/www/vhosts/rezervasyonyap.tr/httpdocs
chmod +x deploy/deploy.sh deploy/verify.sh deploy/scripts/apply-excalibur-holiday-bundle.sh
DEPLOY_REF=main ./deploy/deploy.sh
```

İsteğe bağlı hızlı modlar:

```bash
SKIP_BACKEND_BUILD=1 DEPLOY_REF=main ./deploy/deploy.sh   # yalnız frontend
SKIP_FRONTEND_BUILD=1 DEPLOY_REF=main ./deploy/deploy.sh  # yalnız API
```

## Sunucu — 2) Tatil evi takvim + fiyat (bundle)

`deploy.sh` **veritabanı tatil evi verisini taşımaz** — bundle ayrı çalıştırılır:

```bash
cd /var/www/vhosts/rezervasyonyap.tr/httpdocs
git pull origin main   # apply script güncelse
./deploy/scripts/apply-excalibur-holiday-bundle.sh tmp/excalibur-holiday-1.7.26.json.gz
```

Beklenen: 825 Bravo publish kaynağı, ~200k takvim günü, vitrin fiyat tazeleme.

## Sunucu — 3) Doğrulama

```bash
./deploy/verify.sh
curl -sS "http://127.0.0.1:8080/api/v1/catalog/public/listings?category_code=holiday_home&limit=1" | head -c 300
```

## Tek blok (bundle dosyası yüklendikten sonra)

```bash
cd /var/www/vhosts/rezervasyonyap.tr/httpdocs
DEPLOY_REF=main ./deploy/deploy.sh
./deploy/scripts/apply-excalibur-holiday-bundle.sh tmp/excalibur-holiday-1.7.26.json.gz
./deploy/verify.sh
```
