# rezervasyonyap

Geliştirici / agent notları: **`AGENT_SOHBETLERI_TEK_CATI.md`**, dönem özeti: **`HANDOFF_BU_ASAMA.md`**, yol haritası: **`docs/V2_MASTER_ROADMAP.md`**.

## Üretim deploy (rezervasyonyap.tr)

Sunucuda (SSH) sabit döngü — kopyala yapıştır:

```bash
cd /var/www/vhosts/rezervasyonyap.tr/httpdocs
git pull origin main
cd frontend && rm -rf .next && npm run build
systemctl restart travel-web
```

- `npm run build` webpack kullanır (`frontend/package.json`). Eski `.next` silindiği için build her sefer temiz çıktı üretir.
- `package-lock.json` / bağımlılıklar değiştiyse, üçüncü satırdan önce bir kez: `cd frontend && npm ci` (ardından yine `rm -rf .next && npm run build`).
- **Erişilebilirlik (Headless UI sentinel)** bu repodaki `frontend` kodunda; üretimde mutlaka güncel `git pull` + yukarıdaki build + restart uygulanmalı.

**İsteğe bağlı — LCP / “resim sıkıştır” (PageSpeed):** Build’den önce veya arada bir kez (`frontend` kökünde). Varsayılanlar script içinde: genişlik 720px, AVIF kalite 50, effort 7.

```bash
cd /var/www/vhosts/rezervasyonyap.tr/httpdocs/frontend
THUMB_SIZE=256 node scripts/resize-external-avifs.mjs
cd /var/www/vhosts/rezervasyonyap.tr/httpdocs
cd frontend && rm -rf .next && npm run build
systemctl restart travel-web
```

(Daha agresif: `TARGET_WIDTH=640 AVIF_QUALITY=46` gibi env ile aynı script.)

**İsteğe bağlı — kritik CSS denemesi:** Bazı sayfalarda LCP’yi iyileştirir veya kötüleştirir; yedek alıp dene:

```bash
cd /var/www/vhosts/rezervasyonyap.tr/httpdocs/frontend
CSS_OPTIMIZE=1 rm -rf .next && npm run build
```

**`/_next/static` doğrulama (Best Practices / konsol):** PSI’deki gerçek dosya adıyla:

```bash
curl -sI "https://www.rezervasyonyap.tr/_next/static/css/ORNEK.css" | head -n 15
```

`200` ve `content-type: text/css` beklenir. **`500`** veya **`text/plain`** ise sorun **Apache/Plesk proxy veya statik MIME** tarafındadır; `/_next` istekleri Node’a düşmeli, CSS/JS için yanlış `DefaultType` / PHP handler olmamalı.

**Apache reverse proxy döngüsü için:** Gerekirse `frontend/.env.production` içinde `INTERNAL_MIDDLEWARE_REWRITE_ORIGIN=http://127.0.0.1:PORT` (Next’in dinlediği port); env değişince tekrar `npm run build` + `systemctl restart travel-web`.