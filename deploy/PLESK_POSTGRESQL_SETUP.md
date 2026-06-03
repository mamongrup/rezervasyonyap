# Plesk’te PostgreSQL kurulumu (rezervasyonyap.tr)

Canlı site **yalnızca PostgreSQL** kullanır (`travel-api` → `/etc/rezervasyonyap/backend.env`).
MariaDB/Excalibur dump site motoru değildir.

## 1) PostgreSQL eklentisi

1. Plesk → **Extensions** (Eklentiler)
2. **PostgreSQL** → **Install** / **Enable**
3. Kurulum bitince **Tools & Settings** → **Database Servers**
4. **Add Database Server** → tür: **PostgreSQL**, host: `localhost`, port: `5432` (panelde yazan değer)
5. Kaydet; listede MariaDB’nin yanında PostgreSQL görünmeli

## 2) Site veritabanı (panelden)

1. **Websites & Domains** → **rezervasyonyap.tr**
2. **Databases** → **Add Database**
3. **Database type:** PostgreSQL
4. Önerilen isim: **`travel`**
5. Kullanıcı: otomatik veya `travel_app` — **güçlü şifre** üretin, kaydedin
6. **Connection info** ekranındaki bilgileri not alın:
   - Host (çoğunlukla `localhost`)
   - Port (`5432`)
   - Database name
   - User name
   - Password

## 3) API bağlantı dosyası (sunucu SSH)

Dosya: **`/etc/rezervasyonyap/backend.env`**

Örnek (Plesk’teki değerlerle doldurun):

```bash
DATABASE_URL=postgres://KULLANICI:SIFRE@127.0.0.1:5432/travel
```

Şifrede `@`, `#`, `%` varsa URL-encode edin veya ayrıca:

```bash
PGHOST=127.0.0.1
PGPORT=5432
PGUSER=KULLANICI
PGPASSWORD=SIFRE
PGDATABASE=travel
```

Kaydet:

```bash
chmod 600 /etc/rezervasyonyap/backend.env
systemctl restart travel-api.service
```

## 4) Boş veritabanına şema (migration)

**Yeni boş `travel` DB** ise tüm modüller gerekir (repo kökünden):

```bash
cd /var/www/vhosts/rezervasyonyap.tr/httpdocs
git pull

set -a && source /etc/rezervasyonyap/backend.env && set +a
chmod +x backend/priv/sql/run_all.sh deploy/apply-sql.sh

cd backend/priv/sql
./run_all.sh
```

`psql` `DATABASE_URL` ile çalışması için `run_all.sh` öncesi `export DATABASE_URL=...` yeterli; `psql "$DATABASE_URL"` kullanmak için:

```bash
cd /var/www/vhosts/rezervasyonyap.tr/httpdocs
set -a && source /etc/rezervasyonyap/backend.env && set +a
export PSQL="psql \"$DATABASE_URL\""
cd backend/priv/sql && ./run_all.sh
```

Tek modül (ör. ilan tipleri):

```bash
./deploy/apply-sql.sh backend/priv/sql/modules/303_holiday_home_property_types_four_types.sql
```

## 5) Eski veri varsa

Daha önce başka sunucuda/DB’de dolu `travel` dump’ınız varsa **şema sonrası** `pg_restore` ile yükleyin.
Yoksa site boş başlar; ilanları PC’den Excalibur sync ile doldurabilirsiniz (aşağı).

## 6) Excalibur → PostgreSQL (MariaDB sunucuda gerekmez)

PC (Laragon):

```powershell
cd C:\laragon\www\travel
.\scripts\import-excalibur-mysql.ps1
.\scripts\push-excalibur-to-postgresql.ps1 -Server SUNUCU_IP -User root
```

## 7) Doğrulama

```bash
set -a && source /etc/rezervasyonyap/backend.env && set +a
psql "$DATABASE_URL" -c "SELECT current_database(), COUNT(*) FROM listings;"
systemctl is-active travel-api.service
curl -sS -o /dev/null -w "%{http_code}\n" http://127.0.0.1:8080/
```

## Dikkat

- **Eski `backend.env` uzak DB’yi gösteriyorsa** yeni boş Plesk DB’ye geçince site boşalır; önce yedek alın veya eski dump’ı restore edin.
- Plesk’te DB adı `travel` değilse `PGDATABASE` / URL’deki adı panel ile aynı yapın.
- `psql -U postgres` (süper kullanıcı) kullanmayın; Plesk’in verdiği uygulama kullanıcısını kullanın.
