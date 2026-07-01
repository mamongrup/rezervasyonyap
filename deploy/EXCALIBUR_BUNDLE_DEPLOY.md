# Üretim: tam kod deploy + Excalibur tatil evi verisi (1.7.26)

Canlı site **PostgreSQL** kullanır. MariaDB gerekmez.

## Bundle konumu (Plesk)

Dosya sunucuda:

```
/var/www/vhosts/rezervasyonyap.tr/httpdocs/backups/excalibur-holiday-1.7.26.json.gz
```

Plesk Dosya Yöneticisi: **httpdocs → backups**

## PC (yerel export)

```powershell
cd C:\laragon\www\travel
.\scripts\export-excalibur-for-server.ps1 -SkipSync
```

Çıktıyı Plesk ile **httpdocs/backups/** altına yükleyin.

## Sunucu — tam deploy (tek blok)

Bundle yüklendikten sonra SSH:

```bash
cd /var/www/vhosts/rezervasyonyap.tr/httpdocs
chmod +x deploy/deploy.sh deploy/verify.sh deploy/scripts/apply-excalibur-holiday-bundle.sh
git fetch origin main && git reset --hard origin/main

DEPLOY_REF=main ./deploy/deploy.sh
./deploy/scripts/apply-excalibur-holiday-bundle.sh
./deploy/verify.sh
```

`apply-excalibur-holiday-bundle.sh` argümansız çalışınca varsayılan:

`backups/excalibur-holiday-1.7.26.json.gz`

Farklı dosya için:

```bash
./deploy/scripts/apply-excalibur-holiday-bundle.sh backups/excalibur-holiday-1.7.26.json.gz
```

## Ne yapar?

| Adım | İş |
|------|-----|
| `deploy.sh` | `main` kodu (API shipment + Next frontend) |
| `apply-excalibur-holiday-bundle.sh` | 891 villa takvim + fiyat → PostgreSQL `travel` |
| `verify.sh` | Site + API smoke |

## Doğrulama

```bash
curl -sS "http://127.0.0.1:8080/api/v1/catalog/public/listings?category_code=holiday_home&limit=1" | head -c 300
```
