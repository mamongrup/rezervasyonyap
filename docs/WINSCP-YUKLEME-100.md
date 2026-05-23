# WinSCP ile yükleme (50.114.185.100)

`root@50.114.185.100` → `Permission denied` alıyorsanız **root kullanmayın**.

## 1) Plesk’ten bağlantı bilgisi

1. https://50.114.185.100:8443 → giriş
2. **Alan Adları** → **rezervasyonyap.tr**
3. **FTP/SSH Erişimi** (veya “Hosting Access”)
4. Not alın:
   - **Kullanıcı adı** (ör. `rezervasyonyap`, `mamontravel` — `root` değil)
   - **Şifre**
   - **Sunucu:** `50.114.185.100`
   - **Port:** `22`

## 2) WinSCP kurulum

https://winscp.net/ — Session:

| Alan | Değer |
|------|--------|
| File protocol | **SFTP** |
| Host | `50.114.185.100` |
| Port | `22` |
| User | Plesk’teki kullanıcı |
| Password | Plesk şifresi |

**Giriş** → ilk seferde host key → Evet.

## 3) Veritabanı paketi

**Sol (yerel):**

`C:\laragon\www\travel\backups\bravo-import-ready-20260522-174802`

**Sağ (sunucu):**

`/tmp/bravo-import/`

Klasörü sürükleyip bırakın (~4–25 MB).

## 4) Görseller (AVIF — FTP öncesi yerelde dönüştürün)

Yerelde toplu AVIF (bir kez, uzun sürer):

```powershell
cd C:\laragon\www\travel
node scripts/convert-listings-avif-full.mjs
```

Log: `backups/convert-listings-avif.log` — bitince klasör çoğunlukla **.avif** olur (~daha küçük).

**Sol (WinSCP):**

`C:\laragon\www\travel\frontend\public\uploads\listings`

**Sağ** (Plesk Dosyalar’da doğrulayın, örnek):

`/var/www/vhosts/rezervasyonyap.tr/httpdocs/frontend/public/uploads/listings`

`listings` klasörünü yükleyin (AVIF sonrası boyut düşer; yine uzun sürebilir).

## 5) Restore (Plesk web SSH)

```bash
ls /tmp/bravo-import/bravo-import-ready-20260522-174802/

sudo -u postgres pg_restore -h 127.0.0.1 -d travel --clean --if-exists \
  /tmp/bravo-import/bravo-import-ready-20260522-174802/travel-full.dump
```

## Root SSH açmak (isteğe bağlı)

Plesk → **Araçlar ve Ayarlar** → **IP Adresi Yasaklama** / güvenlik  
veya sunucu yöneticinizden `PermitRootLogin` — WinSCP ile SFTP kullanıcısı genelde yeterlidir.
