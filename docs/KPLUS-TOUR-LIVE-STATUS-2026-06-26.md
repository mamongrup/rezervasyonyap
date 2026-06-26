# KPlus Tur Canli API Gecis Durumu - 2026-06-26

## Ozet

KPlus tur sertifikasyon ve canli import akisi kontrol edildi. Kod tarafi tur icin hazir:

- `scripts/test-travelrobot-scenarios.mjs`
- `scripts/verify-kplus-tour-pnrs.mjs`
- `scripts/import-travelrobot-tours.mjs`
- `deploy/scripts/kplus-tour-cert.sh`
- `scripts/run-kplus-tour-cert.ps1`

Mevcut makineden KPlus sandbox/canli Travelrobot token alimi IP whitelist nedeniyle basarisiz:

```text
/General.svc/Rest/Json/CreateTokenV2: Unauthorised access For IpAddress (195.174.57.76)
```

Bu nedenle bu kosuda yeni `BookTour` / `SystemPNR` uretilemedi ve tur importu DB yazma asamasina gecmeden durdu.

## Calistirilan Kontroller

```powershell
node scripts/test-travelrobot-scenarios.mjs --sandbox --with-booking --only tours
```

Sonuc:

- Token asamasinda durdu.
- Log: `travelrobot-test-log-2026-06-26T11-12-36.json`
- Ozet: `travelrobot-test-summary-2026-06-26T11-12-36.txt`

```powershell
node scripts/verify-kplus-tour-pnrs.mjs --sandbox --log travelrobot-test-log-2026-06-26T11-12-36.json
```

Sonuc:

- Offline log dogrulamasi calisti.
- Son logda basarili `BookTour` olmadigi icin 3 PNR da dogrulanamadi.

```powershell
node scripts/ping-travelrobot-live.mjs --live-only
node scripts/import-travelrobot-tours.mjs --dry-run --limit 5
node scripts/import-travelrobot-tours.mjs
```

Sonuc:

- Hepsi token asamasinda ayni IP whitelist hatasiyla durdu.
- DB import yazimi yapilmadi.

## KPlus'a Gonderilecek Aksiyon

KPlus'tan asagidaki cikis IP'sinin sandbox ve ilgili canli Travelrobot/KPlus tur kanalinda whitelist'e eklenmesi istenmeli:

```text
195.174.57.76
```

Mesaj taslagi:

```text
Merhaba,

RezervasyonYap / Mamon Plus Travel icin KPlus Tour API sertifikasyon ve canli tur import testlerini baslattik.
CreateTokenV2 asamasinda asagidaki hata donuyor:

Unauthorised access For IpAddress (195.174.57.76)

Lutfen 195.174.57.76 cikis IP'sini Test_011425 sandbox kanalinda ve tur canli API kanalinda whitelist'e ekleyebilir misiniz?
IP acildiktan sonra SearchTour -> GetTourPrices -> GetTourFinalPrice -> BookTour akisini tekrar kosup SystemPNR kanitlarini iletecegiz.

Tesekkurler.
```

## IP Acildiktan Sonra Tekrar Kosulacak Komutlar

```powershell
cd C:\laragon\www\travel
$env:KPLUS_FETCH_TIMEOUT_MS='90000'
$env:KPLUS_TOUR_BOOK_TIMEOUT_MS='180000'
node scripts/test-travelrobot-scenarios.mjs --sandbox --with-booking --only tours
node scripts/verify-kplus-tour-pnrs.mjs --sandbox --log travelrobot-test-log-YYYY-MM-DDTHH-MM-SS.json
node scripts/ping-travelrobot-live.mjs --live-only
node scripts/import-travelrobot-tours.mjs --dry-run --limit 5
node scripts/import-travelrobot-tours.mjs
```

## Kod Duzeltmesi

`scripts/verify-kplus-tour-pnrs.mjs` offline cert-log modunda artik sandbox kimligi istemez. Kimlik yalniz `--live` modunda gerekir. Bu sayede KPlus'a gonderilecek BookTour logu, farkli makinede uretilmis olsa bile lokal olarak dogrulanabilir.
