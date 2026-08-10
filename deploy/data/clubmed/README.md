# Club Med manuel katalog

`catalog.json`, Club Med Türkiye'nin herkese açık tesis sitemap'i ve tesis
yapılandırılmış verisinden alınmış yetkili alt acente katalog snapshot'ıdır.

- 65 benzersiz tesis içerir.
- Fiyat ve müsaitlik içermez; bu alanlar admin panelinden manuel yönetilir.
- İlanlar varsayılan olarak `draft` oluşturulur.
- Aynı sağlayıcı referansı tekrar içe aktarıldığında yeni ilan açılmaz, kayıt güncellenir.
- Daha önce `published` yapılan kayıtlar sonraki içe aktarmada taslağa düşürülmez.
- Tüm katalog tek transaction içinde yazılır; hata halinde yarım import bırakılmaz.

Kontrol:

```bash
node scripts/import-clubmed-hotels.mjs --dry-run
```

Taslak içe aktarma:

```bash
chmod +x deploy/scripts/import-clubmed-hotels.sh
./deploy/scripts/import-clubmed-hotels.sh
```

Katalog snapshot'ını yenilemek için:

```bash
node scripts/build-clubmed-catalog.mjs
```

`--publish` seçeneği yalnızca bütün tesisler admin panelinde doğrulandıktan sonra
bilinçli olarak kullanılmalıdır.
