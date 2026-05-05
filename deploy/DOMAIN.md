# Üretim domain (unutma)

| Ortam | Alan adı | Not |
|--------|-----------|-----|
| **Vitrin (Next.js)** | **rezervasyonyap.tr** | Plesk document root örneği: `/var/www/vhosts/rezervasyonyap.tr/httpdocs` — frontend genelde `httpdocs/frontend` |

Bu dosya, deploy ve SSH sırasında **yanlış repoya / yanlış vhost’a** (`travel-cms`, başka müşteri dizini vb.) gidilmesini hatırlatmak için tutulur.

Kurulum değişirse bu tabloyu güncelleyin.

## İsteğe bağlı: `httpdocs/uploads` symlink

Bazı kurulumlarda `httpdocs/uploads` → `frontend/public/uploads` sembolik bağ oluşturulmuş olabilir (Apache doküman kökü `httpdocs` iken `/uploads/` isteğini doğrudan dosyadan sunmak için). Next.js tarafında `/uploads/**` için `frontend/src/app/uploads/[[...segments]]/route.ts` kullanılıyorsa bu bağ **zorunlu değildir**.

Kaldırmak için (yalnızca symlink ise; gerçek klasörü silmeyin):

```bash
cd /var/www/vhosts/rezervasyonyap.tr/httpdocs
test -L uploads && rm uploads
```
