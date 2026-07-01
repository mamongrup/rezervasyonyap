# Excalibur → yalnızca PostgreSQL

Canlı site **her zaman PostgreSQL** (`travel`) kullanır. MariaDB/MySQL **site motoru değildir**.

`rezervasyonyapco_excalibur.sql` dosyası eski sistemden **MySQL dump** formatındadır. İçeriği PostgreSQL’e taşımak için araç:

`scripts/sync-excalibur-bravo.mjs` — okur (MySQL), yazar (**PostgreSQL**: fiyat, takvim, ilan tipi).

**Sunucu adımları (dolu rehber):** [`EXCALIBUR_SUNUCU_ADIMLARI.md`](./EXCALIBUR_SUNUCU_ADIMLARI.md)

## Sunucuda MariaDB istemiyorsanız

1. **PC (Laragon):** dump’ı yerel MySQL’e alın:
   ```powershell
   cd C:\laragon\www\travel
   .\scripts\import-excalibur-mysql.ps1 -SqlFile "$env:USERPROFILE\Downloads\rezervasyonyapco_excalibur (3).sql"
   ```
2. **PC → üretim PostgreSQL:** (sunucuda MySQL gerekmez; SSH anahtarı veya etkileşimli şifre gerekir)
   ```powershell
   .\scripts\push-excalibur-to-postgresql.ps1 -Server SUNUCU_IP -User root
   ```
3. Sunucuda Plesk’teki `rezervasyonyap` (MariaDB) veritabanını **silebilirsiniz** — site etkilenmez.

## Sunucuda (Plesk SSH) — önerilen

Dump’ı sunucuya yükleyip (ör. `/tmp/rezervasyonyapco_excalibur.sql`), **bash** ile:

```bash
cd /var/www/vhosts/rezervasyonyap.tr/httpdocs
chmod +x deploy/scripts/import-excalibur-mysql.sh deploy/scripts/sync-excalibur-holiday-homes.sh

# MariaDB kullanıcı/şifre Plesk’ten farklıysa:
# cat /etc/rezervasyonyap/excalibur-mysql.env
# MYSQL_HOST=127.0.0.1
# MYSQL_USER=...
# MYSQL_PASSWORD=...
# MYSQL_DATABASE=rezervasyonyapco_excalibur

./deploy/scripts/import-excalibur-mysql.sh /tmp/rezervasyonyapco_excalibur.sql
./deploy/scripts/sync-excalibur-holiday-homes.sh
```

`sync-excalibur-holiday-homes.sh`: mevcut ilanların takvim/fiyatını günceller, sitede olmayan publish tatil evlerini ekler.

## Üretim PostgreSQL nerede?

- Bağlantı: `/etc/rezervasyonyap/backend.env` → `DATABASE_URL`
- Plesk **Database Servers** listesinde yalnızca MariaDB görünmesi normal; PG çoğu kurulumda Plesk dışında (`postgresql` servisi) çalışır.
- Kontrol (sunucu SSH):
  ```bash
  set -a && source /etc/rezervasyonyap/backend.env && set +a
  psql "$DATABASE_URL" -c "SELECT current_database(), COUNT(*) FROM listings;"
  ```

## Panel: dört ilan tipi

```bash
cd /var/www/vhosts/rezervasyonyap.tr/httpdocs
./deploy/apply-sql.sh backend/priv/sql/modules/303_holiday_home_property_types_four_types.sql
```
