# Excalibur tatil evi — sunucu güncelleme (dolu rehber)

Canlı site: **https://rezervasyonyap.tr**

---

## Hangi veritabanı ne?

| Ne | Tür | Sunucuda adı | Açıklama |
|----|-----|--------------|----------|
| **Canlı site** | PostgreSQL | **`travel`** | İlanlar, takvim, fiyat — `/etc/rezervasyonyap/backend.env` |
| **İndirdiğiniz .sql** | MariaDB dump | Dosya adı `rezervasyonyapco_excalibur*.sql` | Eski Excalibur kaynağı; **site DB’si değil** |
| **Import hedefi** | MariaDB (geçici) | Plesk’teki ad (ör. **`rezervasyonyap`**) | Dump buraya yüklenir; script buradan okur → PG `travel`’e yazar |

Yani sunucuda `rezervasyonyapco_excalibur` diye bir veritabanı **olmak zorunda değil**. Dump’ı Plesk’te hangi MariaDB’ye import ederseniz `MYSQL_DATABASE` ona ayarlanır.

---

## Sunucu özeti

| Alan | Değer |
|------|--------|
| IP | `50.114.185.100` |
| Hostname | `wonderful-curran` |
| Plesk | https://50.114.185.100:8443 |
| Site kökü | `/var/www/vhosts/rezervasyonyap.tr/httpdocs` |
| **PostgreSQL (site)** | `/etc/rezervasyonyap/backend.env` → `PGDATABASE=travel` |
| **MariaDB (dump kaynağı)** | Plesk → Veritabanları → sizin DB adınız (ör. `rezervasyonyap`) |

---

## Adım 1 — Dump’ı sunucuya yükle

Yerel: `C:\Users\mamon\Downloads\rezervasyonyapco_excalibur (3).sql`

WinSCP → `/tmp/excalibur-dump.sql`

---

## Adım 2 — Plesk’te hangi MariaDB var?

Plesk → **Alan Adları** → **rezervasyonyap.tr** → **Veritabanları**

- Zaten **`rezervasyonyap`** (veya benzeri) MariaDB varsa → dump’ı **oraya** import edebilirsiniz **veya**
- Yeni geçici DB oluşturun (ör. `excalibur_import`) — canlı siteyi etkilemez; site PG `travel` kullanır.

Bağlantı bilgilerini not alın: kullanıcı, şifre, veritabanı adı.

---

## Adım 3 — MariaDB ortam dosyası

```bash
sudo mkdir -p /etc/rezervasyonyap
sudo cp /var/www/vhosts/rezervasyonyap.tr/httpdocs/deploy/systemd/excalibur-mysql.env.example \
  /etc/rezervasyonyap/excalibur-mysql.env
sudo nano /etc/rezervasyonyap/excalibur-mysql.env
```

Örnek (Plesk’teki **gerçek** MariaDB adınızla):

```bash
MYSQL_HOST=127.0.0.1
MYSQL_USER=rezervasyonyap
MYSQL_PASSWORD=pleskten_kopyaladiginiz_sifre
MYSQL_DATABASE=rezervasyonyap
```

```bash
sudo chmod 600 /etc/rezervasyonyap/excalibur-mysql.env
```

---

## Adım 4 — Dump import (MariaDB’ye)

`MYSQL_DATABASE` ile **aynı** veritabanı adına import edin:

```bash
cd /var/www/vhosts/rezervasyonyap.tr/httpdocs
git fetch origin main && git reset --hard origin/main
chmod +x deploy/scripts/import-excalibur-mysql.sh deploy/scripts/sync-excalibur-holiday-homes.sh

# excalibur-mysql.env yüklüyken script DB adını oradan alır
./deploy/scripts/import-excalibur-mysql.sh /tmp/excalibur-dump.sql
```

Beklenen: `bravo_spaces publish: 823`

Kontrol:

```bash
set -a && source /etc/rezervasyonyap/excalibur-mysql.env && set +a
mysql -h "$MYSQL_HOST" -u "$MYSQL_USER" -p"$MYSQL_PASSWORD" "$MYSQL_DATABASE" \
  -e "SHOW TABLES LIKE 'bravo_spaces';"
```

---

## Adım 5 — PostgreSQL `travel`’e sync (asıl güncelleme)

```bash
cd /var/www/vhosts/rezervasyonyap.tr/httpdocs
./deploy/scripts/sync-excalibur-holiday-homes.sh
```

Bu script:
- MariaDB’den `bravo_spaces` / takvim okur
- **PostgreSQL `travel`**’e yazar (backend.env)
- Eksik publish ilanları ekler
- `warm-cache.sh` çalıştırır

---

## Adım 6 — Doğrulama (PostgreSQL travel)

```bash
set -a && source /etc/rezervasyonyap/backend.env && set +a

psql "$DATABASE_URL" -c \
  "SELECT current_database(), COUNT(*) FROM listings l
   JOIN product_categories pc ON pc.id = l.category_id
   WHERE pc.code = 'holiday_home' AND l.status = 'published';"

curl -sS -o /dev/null -w "HTTP=%{http_code}\n" \
  "http://127.0.0.1:8080/api/v1/catalog/public/listings?category_code=holiday_home&limit=1"
```

---

## Alternatif — MariaDB sunucuda hiç kullanmadan (PC’den)

Dump zaten PC Laragon’da import edildiyse:

```powershell
cd C:\laragon\www\travel
.\scripts\push-excalibur-to-postgresql.ps1 -Server 50.114.185.100 -User root
```

Doğrudan **PostgreSQL `travel`**’e yazar. PC’den SSH şifresi/anahtarı gerekir.

---

## Özet

- **Yanlış:** “Sunucu DB’si = rezervasyonyapco_excalibur”
- **Doğru:** Sunucu site DB’si = **PostgreSQL `travel`**; `.sql` dosyası sadece kaynak; MariaDB adı Plesk’te ne ise o (`rezervasyonyap` vb.)
