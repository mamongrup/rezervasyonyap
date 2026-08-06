#!/usr/bin/env bash
# Bodrum TatilBudur URL listesi → fiyatsız taslak oteller + yerel AVIF galeri.
#
# Bu batch 10–13 Ağustos 2026 / 2 yetişkin için canlı teklif verisi olmadığında
# fiyat UYDURMAZ. Oda, çocuk politikası veya fiyatı eksik kayıtlar `draft` kalır.
#
# Sunucuda:
#   cd /var/www/vhosts/rezervasyonyap.tr/httpdocs
#   DEPLOY_REF=main ./deploy/deploy-detached.sh
#   ./deploy/scripts/import-bodrum-tatilbudur-drafts.sh
#
# Takip:
#   ./deploy/scripts/rehost-external-images-detached.sh status
#   cat backups/tatilbudur-bodrum-links.md
set -euo pipefail

APP_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
URLS="$APP_ROOT/deploy/data/tatilbudur/bodrum-request-urls.txt"
FEED="$APP_ROOT/backups/tatilbudur-bodrum-public-feed.json"
REPORT="$APP_ROOT/backups/tatilbudur-bodrum-links.md"
STATE="$APP_ROOT/backups/tatilbudur-bodrum-import-state.json"
OFFERS="$APP_ROOT/deploy/data/tatilbudur/bodrum-2026-08-10-13-2adults-offers.json"
FAMILY_OFFERS="$APP_ROOT/deploy/data/tatilbudur/bodrum-2026-08-10-13-2adults-1child-offers.json"

cd "$APP_ROOT"
[[ -f "$URLS" ]] || { echo "[ERR] URL listesi yok: $URLS" >&2; exit 1; }

echo "==> 1/4 Açık tesis bilgileri ve galeri bağlantıları hasat ediliyor"
node scripts/harvest-tatilbudur-url-list.mjs --urls "$URLS" --out "$FEED"

if [[ -f "$OFFERS" ]]; then
  echo "==> Doğrulanmış 10–13 Ağustos / 2 yetişkin teklifleri feed'e işleniyor"
  node scripts/apply-tatilbudur-visible-offers.mjs --feed "$FEED" --offers "$OFFERS"
fi
if [[ -f "$FAMILY_OFFERS" ]]; then
  echo "==> Kullanıcının verdiği 2 yetişkin + 1 çocuk toplamları /3 gecelik Ağustos–Eylül tarifesine çevriliyor"
  node scripts/apply-tatilbudur-visible-offers.mjs --feed "$FEED" --offers "$FAMILY_OFFERS"
fi

echo "==> 2/4 Taslak oteller içe aktarılıyor (fiyat uydurulmaz)"
TATILBUDUR_LISTING_STATUS=draft \
TATILBUDUR_IMPORT_STATE="$STATE" \
  bash "$APP_ROOT/deploy/scripts/import-tatilbudur-hotels.sh" --file "$FEED" --reset

echo "==> 3/4 Harici galeriler sunucuda yerel AVIF'e alınıyor (arka plan)"
bash "$APP_ROOT/deploy/scripts/rehost-external-images-detached.sh" \
  --provider=tatilbudur \
  --category=hotel \
  --hosts=productcdn.tatilbudur.com,ucdn.tatilbudur.net,tatilbudur.com

echo "==> 4/4 Import/kalite/link raporu yazılıyor"
node scripts/report-tatilbudur-import-links.mjs --file "$FEED" --out "$REPORT"

cat <<EOF
[OK] Taslak import tamamlandı.
- Feed:   $FEED
- Rapor:  $REPORT
- Yerel medya: ./deploy/scripts/rehost-external-images-detached.sh status

Fiyatı olmayan, odası/görseli/6-dil içeriği eksik kayıtlar yayımlanmaz.
10–13 Ağustos / 2 yetişkin gerçek "Toplam Fiyat" verisi geldiğinde aynı external ref
üzerinden güncellenir; kampanya/WorldCard tutarı fiyat olarak yazılmaz.
EOF
